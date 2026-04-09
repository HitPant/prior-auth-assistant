"""
Scoring Service — Rule-Based Approval Likelihood Scoring

Evaluates the generated prior auth letter (and source EHR data) against
6 weighted criteria.  Pure rule-based — no LLM call required.
"""

import re

from models.schemas import (
    ApprovalScore,
    RelevantContext,
    ScoreCriterion,
    PriorAuthRequest,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _text_contains_any(text: str, keywords: list[str]) -> int:
    """Count how many keywords appear in text (case-insensitive)."""
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw.lower() in text_lower)


def _count_treatment_failures(context: RelevantContext, letter: str) -> int:
    """Count documented treatment attempts with failure/discontinuation."""
    count = 0
    for med in context.relevant_medications:
        if med.status == "discontinued" and med.reason_discontinued:
            count += 1
    # Also check for PT failure mentioned in encounters or letter
    pt_keywords = ["physical therapy", "PT", "physiotherapy"]
    failure_keywords = ["plateau", "failed", "inadequate", "insufficient", "no improvement", "did not reduce"]
    combined_text = letter.lower()
    for enc in context.relevant_encounters:
        combined_text += " " + enc.soap_note.assessment.lower()
        combined_text += " " + enc.soap_note.plan.lower()

    if any(pk.lower() in combined_text for pk in pt_keywords) and \
       any(fk.lower() in combined_text for fk in failure_keywords):
        count += 1

    # Count corticosteroid injections with transient/failed relief
    for proc in context.relevant_procedures:
        proc_text = (proc.name + " " + proc.outcome).lower()
        if any(kw in proc_text for kw in ["injection", "corticosteroid", "steroid"]):
            if any(kw in proc_text for kw in ["temporary", "transient", "weeks of relief", "returned"]):
                count += 1

    return count


def _count_evidence_types(context: RelevantContext, letter: str) -> int:
    """Count types of objective clinical evidence present."""
    types_found = 0
    letter_lower = letter.lower()

    # Lab values with reference ranges
    if context.relevant_labs and any(lab.flag for lab in context.relevant_labs):
        types_found += 1
    elif _text_contains_any(letter, ["lab", "laboratory", "blood test"]):
        types_found += 1

    # Imaging findings
    if context.relevant_imaging:
        types_found += 1
    elif _text_contains_any(letter, ["x-ray", "xray", "mri", "ct scan", "imaging", "radiograph"]):
        types_found += 1

    # Physical exam measurements (ROM, pain scores, etc.)
    exam_keywords = [
        "rom", "range of motion", "degrees", "flexion", "extension",
        "pain score", "vas ", "/10", "mcmurray", "straight leg raise",
        "effusion", "tenderness", "crepitus", "gait", "antalgic",
        "cranial nerves", "motor strength", "sensory intact", "reflexes",
        "fundoscopic", "papilledema",
    ]
    if _text_contains_any(letter, exam_keywords) >= 2:
        types_found += 1

    # Vital signs / BMI
    if _text_contains_any(letter, ["bmi", "blood pressure", "vital", "weight"]):
        types_found += 1

    return types_found


def _check_diagnosis_specificity(
    context: RelevantContext, request: PriorAuthRequest, letter: str
) -> str:
    """Check ICD-10 code specificity and linkage to procedure."""
    # Check if any diagnosis code is unspecified (.9 ending)
    has_unspecified = any(
        code.endswith(".9") or code.endswith("9")
        for code in request.diagnosis_codes
    )

    # Check for specific codes
    has_specific = any(
        not (code.endswith(".9") or len(code) <= 3)
        for code in request.diagnosis_codes
    )

    # Check procedure linkage in letter
    letter_lower = letter.lower()
    procedure_lower = request.requested_procedure.lower()
    has_linkage = any(
        code in letter for code in request.diagnosis_codes
    ) and any(
        kw in letter_lower
        for kw in procedure_lower.split()
        if len(kw) > 3
    )

    if has_specific and has_linkage:
        return "Met"
    elif has_unspecified and not has_specific:
        return "Not Met"
    else:
        return "Partially Met"


def _check_functional_impact(context: RelevantContext, letter: str) -> tuple[str, int]:
    """Check functional impact documentation. Returns (score, count_of_impacts)."""
    letter_lower = letter.lower()
    impact_keywords = [
        "unable to walk", "cannot walk", "difficulty walking",
        "cannot climb stairs", "difficulty climbing",
        "unable to perform", "cannot perform",
        "adl", "activities of daily living",
        "quality of life", "limited mobility",
        "sleep disrupted", "cannot sleep", "poor sleep",
        "unable to work", "missed work", "difficulty sitting",
        "requires assistance", "using a cane", "wheelchair",
        "cannot drive", "unable to drive",
        "isolated", "depression", "anxiety due to",
        "stopped all recreational", "cannot garden",
    ]
    count = _text_contains_any(letter, impact_keywords)

    # Also check encounter notes
    for enc in context.relevant_encounters:
        soap_text = " ".join([
            enc.soap_note.subjective,
            enc.soap_note.assessment,
        ]).lower()
        count += _text_contains_any(soap_text, impact_keywords)

    # Deduplicate rough estimate
    count = min(count, 10)

    if count >= 4:
        return "Met", count
    elif count >= 1:
        return "Partially Met", count
    else:
        return "Not Met", count


def _check_guideline_alignment(
    context: RelevantContext, request: PriorAuthRequest, letter: str
) -> str:
    """Check clinical guideline alignment."""
    letter_lower = letter.lower()

    # Check if guidelines are cited
    guideline_keywords = [
        "acr appropriateness", "clinical guideline", "guidelines recommend",
        "standard of care", "evidence-based", "clinical practice guideline",
        "society", "criteria", "protocol",
    ]
    has_references = _text_contains_any(letter, guideline_keywords) >= 1

    # Check if the doctor's notes contradict the request
    contradicts = False
    for enc in context.relevant_encounters:
        plan_lower = enc.soap_note.plan.lower()
        assessment_lower = enc.soap_note.assessment.lower()
        if any(
            phrase in plan_lower or phrase in assessment_lower
            for phrase in [
                "not indicated",
                "not recommended",
                "not warranted",
                "no clinical indication",
            ]
        ):
            contradicts = True
            break

    if contradicts:
        return "Not Met"
    elif has_references:
        return "Met"
    else:
        return "Partially Met"


def _check_temporal_documentation(context: RelevantContext) -> str:
    """Check temporal documentation quality."""
    encounter_count = len(context.relevant_encounters)

    if encounter_count == 0:
        return "Not Met"

    # Calculate time span between first and last encounter
    dates = sorted([enc.date for enc in context.relevant_encounters])
    if len(dates) >= 2:
        # Parse ISO dates for rough month comparison
        first = dates[0]
        last = dates[-1]
        try:
            first_parts = [int(p) for p in first.split("-")]
            last_parts = [int(p) for p in last.split("-")]
            months_span = (
                (last_parts[0] - first_parts[0]) * 12
                + (last_parts[1] - first_parts[1])
            )
        except (ValueError, IndexError):
            months_span = 0
    else:
        months_span = 0

    if encounter_count >= 3 and months_span >= 3:
        return "Met"
    elif encounter_count >= 2 or months_span >= 2:
        return "Partially Met"
    else:
        return "Not Met"


# ── Main Scoring Function ───────────────────────────────────────────────────


def score_submission(
    letter: str,
    context: RelevantContext,
    request: PriorAuthRequest,
) -> ApprovalScore:
    """
    Score a prior auth submission against 6 weighted criteria.

    Analyses both the generated letter text AND the structured EHR data
    to cross-reference claims against the actual patient record.
    """

    criteria: list[ScoreCriterion] = []
    suggestions: list[str] = []

    # ── 1. Step Therapy Documentation (weight 5) ─────────────────────────
    treatment_count = _count_treatment_failures(context, letter)

    if treatment_count >= 3:
        step_score = "Met"
        step_detail = (
            f"{treatment_count} documented treatment attempts with failure reasons "
            f"(medications, PT, injections)."
        )
    elif treatment_count >= 1:
        step_score = "Partially Met"
        step_detail = (
            f"Only {treatment_count} documented treatment attempt(s) with failure reasons. "
            f"Insurers typically expect ≥3 trials before approving advanced imaging/procedures."
        )
        suggestions.append(
            "Document additional conservative treatment attempts with specific "
            "reasons for failure or discontinuation."
        )
    else:
        step_score = "Not Met"
        step_detail = "No conservative treatment attempts documented with failure reasons."
        suggestions.append(
            "Try conservative treatments first (NSAIDs, physical therapy, "
            "activity modification) and document outcomes before requesting "
            "advanced procedures."
        )

    criteria.append(ScoreCriterion(
        name="Step Therapy Documentation",
        description=(
            "Has the patient tried and failed conservative/first-line treatments "
            "before escalating? Are there at least 2 documented treatment attempts "
            "with reasons for failure?"
        ),
        score=step_score,
        weight=5,
        detail=step_detail,
    ))

    # ── 2. Clinical Evidence (weight 4) ──────────────────────────────────
    evidence_count = _count_evidence_types(context, letter)

    if evidence_count >= 3:
        evidence_score = "Met"
        evidence_detail = (
            f"{evidence_count} types of objective clinical evidence documented "
            f"(labs, imaging, physical exam, vitals)."
        )
    elif evidence_count >= 1:
        evidence_score = "Partially Met"
        evidence_detail = (
            f"Only {evidence_count} type(s) of objective evidence. "
            f"More objective findings would strengthen the case."
        )
        suggestions.append(
            "Include additional objective clinical evidence: lab results with "
            "reference ranges, physical exam measurements (ROM, pain scales), "
            "or prior imaging findings."
        )
    else:
        evidence_score = "Not Met"
        evidence_detail = "No objective clinical evidence documented."
        suggestions.append(
            "The submission needs objective evidence — lab values, imaging results, "
            "or measurable physical exam findings — to support the clinical claim."
        )

    criteria.append(ScoreCriterion(
        name="Clinical Evidence",
        description=(
            "Are there objective findings supporting the request? Lab values, "
            "imaging results, physical exam findings, measurable clinical data?"
        ),
        score=evidence_score,
        weight=4,
        detail=evidence_detail,
    ))

    # ── 3. Diagnosis Specificity (weight 3) ──────────────────────────────
    dx_score = _check_diagnosis_specificity(context, request, letter)

    if dx_score == "Met":
        dx_detail = (
            f"Specific ICD-10 code(s) ({', '.join(request.diagnosis_codes)}) "
            f"with clear linkage to the requested procedure."
        )
    elif dx_score == "Partially Met":
        dx_detail = (
            f"Diagnosis code(s) provided ({', '.join(request.diagnosis_codes)}) "
            f"but linkage to the procedure could be stronger."
        )
        suggestions.append(
            "Use a more specific ICD-10 code and clearly explain the link "
            "between the diagnosis and the requested procedure."
        )
    else:
        dx_detail = (
            f"Unspecified diagnosis code(s) ({', '.join(request.diagnosis_codes)}). "
            f"Insurance companies flag unspecified codes (.9) as insufficient."
        )
        suggestions.append(
            "Replace the unspecified ICD-10 code with a more specific diagnosis "
            "code that clearly justifies the requested procedure."
        )

    criteria.append(ScoreCriterion(
        name="Diagnosis Specificity",
        description=(
            "Is there a specific ICD-10 code (not unspecified)? Is the diagnosis "
            "clearly linked to the requested procedure?"
        ),
        score=dx_score,
        weight=3,
        detail=dx_detail,
    ))

    # ── 4. Functional Impact (weight 4) ──────────────────────────────────
    func_score, func_count = _check_functional_impact(context, letter)

    if func_score == "Met":
        func_detail = (
            f"Multiple specific functional impacts documented ({func_count} references) "
            f"including ADL limitations, mobility restrictions, and quality of life impact."
        )
    elif func_score == "Partially Met":
        func_detail = (
            f"Some functional impact mentioned ({func_count} reference(s)), "
            f"but lacks specific, measurable descriptions of daily life limitations."
        )
        suggestions.append(
            "Document specific functional limitations: which ADLs are affected, "
            "measurable mobility restrictions (e.g., walking distance), work impact, "
            "and sleep disruption with frequency."
        )
    else:
        func_detail = "No functional impact documentation found."
        suggestions.append(
            "The submission must describe how the condition affects daily activities, "
            "work, and quality of life in specific, measurable terms."
        )

    criteria.append(ScoreCriterion(
        name="Functional Impact",
        description=(
            "Does the documentation describe how the condition affects the patient's "
            "daily activities, work, mobility, quality of life in specific measurable terms?"
        ),
        score=func_score,
        weight=4,
        detail=func_detail,
    ))

    # ── 5. Clinical Guideline Alignment (weight 3) ───────────────────────
    guide_score = _check_guideline_alignment(context, request, letter)

    if guide_score == "Met":
        guide_detail = (
            "Request aligns with clinical guidelines and includes appropriate references."
        )
    elif guide_score == "Partially Met":
        guide_detail = (
            "Request appears clinically reasonable but does not cite specific "
            "clinical guidelines or appropriateness criteria."
        )
        suggestions.append(
            "Reference specific clinical guidelines that support the request "
            "(e.g., ACR Appropriateness Criteria, specialty society recommendations)."
        )
    else:
        guide_detail = (
            "The request contradicts the physician's own clinical assessment or "
            "established guidelines."
        )
        suggestions.append(
            "The physician's notes indicate the procedure may not be clinically "
            "indicated. Address this discrepancy or pursue conservative measures first."
        )

    criteria.append(ScoreCriterion(
        name="Clinical Guideline Alignment",
        description=(
            "Does the request align with established clinical guidelines? "
            "Are guidelines cited or referenced?"
        ),
        score=guide_score,
        weight=3,
        detail=guide_detail,
    ))

    # ── 6. Temporal Documentation (weight 3) ─────────────────────────────
    temp_score = _check_temporal_documentation(context)
    encounter_count = len(context.relevant_encounters)

    if temp_score == "Met":
        dates = sorted([enc.date for enc in context.relevant_encounters])
        temp_detail = (
            f"{encounter_count} encounters documented from {dates[0]} to {dates[-1]}, "
            f"showing clear symptom progression and treatment escalation over time."
        )
    elif temp_score == "Partially Met":
        temp_detail = (
            f"Only {encounter_count} encounter(s) documented. "
            f"Insurers prefer ≥3 visits over ≥3 months to demonstrate persistent symptoms."
        )
        suggestions.append(
            "Document additional visits to establish a longer treatment history. "
            "Most insurers want to see ≥3 encounters over ≥3 months."
        )
    else:
        temp_detail = (
            f"Only {encounter_count} encounter documented — insufficient to demonstrate "
            f"symptom persistence or treatment progression."
        )
        suggestions.append(
            "Establish a longitudinal treatment history over multiple visits before "
            "requesting advanced procedures. A single visit is insufficient."
        )

    criteria.append(ScoreCriterion(
        name="Temporal Documentation",
        description=(
            "Is there a clear timeline showing symptom progression, treatment "
            "duration, and escalation? Multiple visits over time?"
        ),
        score=temp_score,
        weight=3,
        detail=temp_detail,
    ))

    # ── Calculate overall score ──────────────────────────────────────────
    max_points = sum(c.weight * 10 for c in criteria)  # 220
    earned_points = 0
    for c in criteria:
        if c.score == "Met":
            earned_points += c.weight * 10
        elif c.score == "Partially Met":
            earned_points += c.weight * 5

    overall_pct = round((earned_points / max_points) * 100) if max_points > 0 else 0

    if overall_pct >= 75:
        likelihood = "High"
    elif overall_pct >= 50:
        likelihood = "Moderate"
    else:
        likelihood = "Low"

    return ApprovalScore(
        overall_score=overall_pct,
        likelihood=likelihood,
        criteria=criteria,
        suggestions=suggestions,
    )
