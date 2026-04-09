"""
Prior Auth AI Assistant — FastAPI Application

Main entry point for the backend API.
"""

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import (
    Patient,
    PriorAuthRequest,
    GeneratedAuth,
    RescoreRequest,
    ApprovalScore,
)
from services.ehr_service import filter_relevant_context
from services.generation_service import generate_letter
from services.scoring_service import score_submission

# ── Load patient data at startup ─────────────────────────────────────────────

DATA_PATH = Path(__file__).parent / "data" / "patients.json"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    _raw_patients = json.load(f)

PATIENTS: dict[str, Patient] = {}
for raw in _raw_patients:
    patient = Patient(**raw)
    PATIENTS[patient.id] = patient

# ── FastAPI app ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Prior Auth AI Assistant",
    description="Helps doctors generate strong medical necessity justifications for insurance prior authorization submissions.",
    version="1.0.0",
)

# CORS configuration — allow React (3000) and Vite (5173) dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ────────────────────────────────────────────────────────────────


@app.get("/patients")
def list_patients():
    """
    Returns list of all patients (summary view).
    Fields: id, name, age, primary diagnosis, insurance.
    """
    summaries = []
    for p in PATIENTS.values():
        primary_dx = p.problem_list[0] if p.problem_list else None
        summaries.append({
            "id": p.id,
            "name": f"{p.first_name} {p.last_name}",
            "age": p.age,
            "gender": p.gender,
            "primary_diagnosis": {
                "icd10_code": primary_dx.icd10_code,
                "description": primary_dx.description,
            }
            if primary_dx
            else None,
            "insurance": {
                "payer": p.insurance.payer,
                "plan": p.insurance.plan,
            },
        })
    return summaries


@app.get("/patients/{patient_id}")
def get_patient(patient_id: str):
    """Returns full patient EHR record."""
    patient = PATIENTS.get(patient_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient '{patient_id}' not found. Available IDs: {list(PATIENTS.keys())}",
        )
    return patient


@app.post("/generate-auth", response_model=GeneratedAuth)
async def generate_auth(request: PriorAuthRequest):
    """
    Full prior auth pipeline:
    1. Retrieve patient data from EHR
    2. Filter to relevant context
    3. Generate medical necessity letter via Claude API
    4. Score the submission
    5. Return GeneratedAuth (letter + context + score)
    """
    # 1. Retrieve patient
    patient = PATIENTS.get(request.patient_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient '{request.patient_id}' not found.",
        )

    # 2. Filter relevant context
    context = filter_relevant_context(patient, request)

    # 3. Generate letter via Claude
    try:
        patient_name = f"{patient.first_name} {patient.last_name}"
        insurance_info = f"{patient.insurance.payer} — {patient.insurance.plan} (Member: {patient.insurance.member_id})"
        letter = await generate_letter(
            request=request,
            context=context,
            patient_name=patient_name,
            patient_dob=patient.date_of_birth,
            insurance_info=insurance_info,
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Claude API error: {str(e)}",
        )

    # 4. Score the submission
    score = score_submission(
        letter=letter,
        context=context,
        request=request,
    )

    # 5. Return the complete result
    return GeneratedAuth(
        letter=letter,
        relevant_context=context,
        score=score,
    )


@app.post("/rescore", response_model=ApprovalScore)
def rescore(body: RescoreRequest):
    """
    Re-score an edited letter without regenerating.
    Runs only the rule-based scoring engine — no Claude API call.
    """
    # Retrieve patient
    patient = PATIENTS.get(body.patient_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient '{body.patient_id}' not found.",
        )

    # Re-filter context (same as original)
    context = filter_relevant_context(patient, body.request)

    # Re-score the edited letter
    score = score_submission(
        letter=body.edited_letter,
        context=context,
        request=body.request,
    )

    return score
