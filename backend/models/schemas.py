"""
Pydantic data models for the Prior Auth AI Assistant.
These mirror real EHR structure, simplified for the prototype.
"""

from pydantic import BaseModel


# ── EHR Data Models ──────────────────────────────────────────────────────────

class Insurance(BaseModel):
    payer: str          # e.g. "Blue Cross Blue Shield"
    plan: str           # e.g. "PPO Gold"
    member_id: str
    group_number: str


class Diagnosis(BaseModel):
    icd10_code: str     # e.g. "M17.11"
    description: str    # e.g. "Primary osteoarthritis, right knee"
    date_diagnosed: str
    status: str         # "active" / "resolved"


class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    start_date: str
    end_date: str | None = None        # None if current
    status: str                        # "active" / "discontinued"
    reason_discontinued: str | None = None  # e.g. "Inadequate pain relief"


class SOAPNote(BaseModel):
    subjective: str     # Patient's reported symptoms, complaints, history
    objective: str      # Doctor's exam findings, vitals, measurements
    assessment: str     # Clinical interpretation and diagnosis
    plan: str           # Recommended next steps and treatment plan


class Encounter(BaseModel):
    date: str
    provider: str       # Doctor name
    type: str           # "Office Visit" / "Follow-up" / "Referral"
    reason: str         # Chief complaint
    soap_note: SOAPNote


class LabResult(BaseModel):
    test_name: str
    date: str
    value: str
    unit: str
    reference_range: str
    flag: str | None = None   # "High" / "Low" / None


class ImagingResult(BaseModel):
    type: str           # "X-ray" / "MRI" / "CT"
    body_part: str
    date: str
    findings: str       # Radiologist's summary
    impression: str     # Key takeaway


class Procedure(BaseModel):
    name: str
    cpt_code: str
    date: str
    provider: str
    outcome: str        # Brief outcome note


# ── Top-Level Patient Model ─────────────────────────────────────────────────

class Patient(BaseModel):
    id: str                                # e.g. "P001"
    first_name: str
    last_name: str
    date_of_birth: str                     # ISO format "1966-03-15"
    age: int
    gender: str                            # "Male" / "Female"
    insurance: Insurance
    problem_list: list[Diagnosis]          # Active diagnoses
    medications: list[Medication]          # Current and historical
    encounters: list[Encounter]            # Visit history with SOAP notes
    lab_results: list[LabResult]
    imaging_results: list[ImagingResult]
    procedures_history: list[Procedure]
    allergies: list[str]


# ── Request / Response Models ────────────────────────────────────────────────

class PriorAuthRequest(BaseModel):
    patient_id: str
    requested_procedure: str               # e.g. "MRI of the Right Knee"
    cpt_code: str                          # e.g. "73721"
    diagnosis_codes: list[str]             # ICD-10 codes justifying the request
    treating_physician: str
    urgency: str                           # "Routine" / "Urgent"
    clinical_rationale: str | None = None  # Optional doctor-provided notes


class RelevantContext(BaseModel):
    relevant_diagnoses: list[Diagnosis]
    relevant_medications: list[Medication]
    relevant_encounters: list[Encounter]
    relevant_labs: list[LabResult]
    relevant_imaging: list[ImagingResult]
    relevant_procedures: list[Procedure]
    filtering_rationale: str               # Brief explanation of selection


class ScoreCriterion(BaseModel):
    name: str           # e.g. "Step Therapy Documentation"
    description: str    # What this criterion checks
    score: str          # "Met" / "Partially Met" / "Not Met"
    weight: int         # How much this matters (1-5 scale)
    detail: str         # Specific finding for this patient


class ApprovalScore(BaseModel):
    overall_score: int          # 0-100
    likelihood: str             # "High" / "Moderate" / "Low"
    criteria: list[ScoreCriterion]
    suggestions: list[str]      # Specific actionable improvements


class GeneratedAuth(BaseModel):
    letter: str                            # The generated medical necessity letter
    relevant_context: RelevantContext       # What was pulled from the EHR
    score: ApprovalScore                   # Scoring breakdown


class RescoreRequest(BaseModel):
    patient_id: str
    edited_letter: str
    request: PriorAuthRequest
