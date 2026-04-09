"""
EHR Service — Context Filtering

Takes a patient's full EHR record and a prior auth request, returns only
the clinically relevant subset.  This is the "context assembly" step.
"""

from models.schemas import (
    Patient,
    PriorAuthRequest,
    RelevantContext,
    Diagnosis,
    Medication,
    Encounter,
    LabResult,
    ImagingResult,
    Procedure,
)

# ── Keyword maps for body-system / condition matching ────────────────────────

BODY_SYSTEM_KEYWORDS: dict[str, list[str]] = {
    "knee": ["knee", "patella", "tibiofemoral", "meniscal", "ligament", "osteoarthritis", "oa"],
    "lumbar": ["lumbar", "lower back", "back pain", "spine", "disc", "lumbosacral", "spinal"],
    "brain": ["brain", "head", "headache", "migraine", "neurological", "cranial", "cerebral"],
    "shoulder": ["shoulder", "rotator", "supraspinatus", "glenohumeral"],
    "hip": ["hip", "femoral", "acetabular"],
    "cervical": ["cervical", "neck", "C-spine"],
}

# ICD-10 code families commonly relevant to surgical candidacy
SURGICAL_COMORBIDITY_PREFIXES = ["E11", "E10", "I10", "I25", "I50", "Z79"]

# Standard pre-procedure lab tests
PRE_PROCEDURE_LABS = ["CBC", "CMP", "BMP", "PT", "INR", "PTT"]

# Condition-specific lab markers
CONDITION_LAB_KEYWORDS: dict[str, list[str]] = {
    "knee": ["ESR", "CRP", "Sed Rate", "Uric Acid", "RF", "ANA"],
    "lumbar": ["ESR", "CRP", "Sed Rate"],
    "brain": ["ESR", "CRP"],
}


def _identify_body_system(request: PriorAuthRequest) -> str:
    """Identify the primary body system from the requested procedure."""
    procedure_lower = request.requested_procedure.lower()
    for system, keywords in BODY_SYSTEM_KEYWORDS.items():
        if any(kw in procedure_lower for kw in keywords):
            return system
    # Fallback: try CPT-based hints
    return "general"


def _matches_keywords(text: str, keywords: list[str]) -> bool:
    """Check if text contains any of the given keywords (case-insensitive)."""
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)


def _icd_family(code: str) -> str:
    """Return the ICD-10 family prefix (e.g. M17.11 → M17)."""
    return code.split(".")[0]


# ── Public API ───────────────────────────────────────────────────────────────


def filter_relevant_context(
    patient: Patient, request: PriorAuthRequest
) -> RelevantContext:
    """
    Filter a patient's full EHR down to the clinically relevant subset for
    the given prior auth request.
    """
    body_system = _identify_body_system(request)
    system_keywords = BODY_SYSTEM_KEYWORDS.get(body_system, [])
    request_icd_families = {_icd_family(c) for c in request.diagnosis_codes}

    # ── 1. Diagnosis filter ──────────────────────────────────────────────
    relevant_diagnoses: list[Diagnosis] = []
    for dx in patient.problem_list:
        dx_family = _icd_family(dx.icd10_code)
        # Same code family as the request
        if dx_family in request_icd_families:
            relevant_diagnoses.append(dx)
        # Comorbidities relevant to surgical candidacy
        elif any(dx.icd10_code.startswith(p) for p in SURGICAL_COMORBIDITY_PREFIXES):
            relevant_diagnoses.append(dx)
        # Body-system keyword match
        elif _matches_keywords(dx.description, system_keywords):
            relevant_diagnoses.append(dx)

    # ── 2. Medication filter ─────────────────────────────────────────────
    relevant_medications: list[Medication] = []
    # Build a set of keywords from the body system AND from diagnosis descriptions
    med_keywords = list(system_keywords)
    for dx in relevant_diagnoses:
        med_keywords.extend(dx.description.lower().split())

    for med in patient.medications:
        # Include all discontinued meds (prove step therapy)
        if med.status == "discontinued":
            relevant_medications.append(med)
        # Active meds related to the condition
        elif _matches_keywords(med.name, med_keywords):
            relevant_medications.append(med)
        # Pain/anti-inflammatory meds are generally relevant
        elif _matches_keywords(
            med.name,
            [
                "ibuprofen", "naproxen", "meloxicam", "celecoxib",
                "acetaminophen", "gabapentin", "pregabalin", "tramadol",
                "cyclobenzaprine", "methocarbamol", "tizanidine",
                "prednisone", "methylprednisolone",
            ],
        ):
            relevant_medications.append(med)

    # ── 3. Encounter filter ──────────────────────────────────────────────
    relevant_encounters: list[Encounter] = []
    for enc in patient.encounters:
        encounter_text = " ".join([
            enc.reason,
            enc.soap_note.subjective,
            enc.soap_note.objective,
            enc.soap_note.assessment,
            enc.soap_note.plan,
        ])
        if _matches_keywords(encounter_text, system_keywords):
            relevant_encounters.append(enc)

    # ── 4. Lab filter ────────────────────────────────────────────────────
    relevant_labs: list[LabResult] = []
    condition_labs = CONDITION_LAB_KEYWORDS.get(body_system, [])
    for lab in patient.lab_results:
        # Pre-procedure standard labs
        if any(lab.test_name.upper().startswith(s) for s in PRE_PROCEDURE_LABS):
            relevant_labs.append(lab)
        # Condition-specific markers
        elif _matches_keywords(lab.test_name, condition_labs):
            relevant_labs.append(lab)
        # Flagged labs (abnormal values always relevant)
        elif lab.flag is not None:
            relevant_labs.append(lab)

    # ── 5. Imaging filter ────────────────────────────────────────────────
    relevant_imaging: list[ImagingResult] = []
    for img in patient.imaging_results:
        if _matches_keywords(img.body_part, system_keywords):
            relevant_imaging.append(img)
        elif _matches_keywords(img.findings, system_keywords):
            relevant_imaging.append(img)

    # ── 6. Procedure filter ──────────────────────────────────────────────
    relevant_procedures: list[Procedure] = []
    for proc in patient.procedures_history:
        if _matches_keywords(proc.name, system_keywords):
            relevant_procedures.append(proc)
        elif _matches_keywords(proc.outcome, system_keywords):
            relevant_procedures.append(proc)
        # Physical therapy is always relevant for musculoskeletal requests
        elif _matches_keywords(proc.name, ["physical therapy", "PT"]):
            relevant_procedures.append(proc)

    # ── 7. Generate filtering rationale ──────────────────────────────────
    included_parts = []
    if relevant_encounters:
        included_parts.append(
            f"{len(relevant_encounters)} encounter(s) documenting "
            f"{body_system} treatment progression"
        )
    if relevant_medications:
        discontinued = [m for m in relevant_medications if m.status == "discontinued"]
        active = [m for m in relevant_medications if m.status == "active"]
        parts = []
        if discontinued:
            parts.append(f"{len(discontinued)} discontinued medication trial(s)")
        if active:
            parts.append(f"{len(active)} active medication(s)")
        included_parts.append(", ".join(parts))
    if relevant_procedures:
        included_parts.append(
            f"{len(relevant_procedures)} related procedure(s)"
        )
    if relevant_labs:
        included_parts.append(f"{len(relevant_labs)} lab result(s)")
    if relevant_imaging:
        included_parts.append(
            f"{len(relevant_imaging)} imaging study/studies of the {body_system}"
        )

    excluded_parts = []
    excluded_enc_count = len(patient.encounters) - len(relevant_encounters)
    excluded_med_count = len(patient.medications) - len(relevant_medications)
    if excluded_enc_count > 0:
        excluded_parts.append(f"{excluded_enc_count} unrelated encounter(s)")
    if excluded_med_count > 0:
        excluded_parts.append(f"{excluded_med_count} unrelated medication(s)")

    rationale = f"Selected: {'; '.join(included_parts)}."
    if excluded_parts:
        rationale += f" Excluded: {'; '.join(excluded_parts)}."

    return RelevantContext(
        relevant_diagnoses=relevant_diagnoses,
        relevant_medications=relevant_medications,
        relevant_encounters=relevant_encounters,
        relevant_labs=relevant_labs,
        relevant_imaging=relevant_imaging,
        relevant_procedures=relevant_procedures,
        filtering_rationale=rationale,
    )
