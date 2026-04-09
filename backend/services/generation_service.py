"""
Generation Service — Claude API Integration

Uses the Anthropic Python SDK to generate medical necessity letters from
the relevant EHR context assembled by ehr_service.
"""

import os

import anthropic
from dotenv import load_dotenv

from models.schemas import PriorAuthRequest, RelevantContext

load_dotenv()

SYSTEM_PROMPT = """\
You are an experienced utilization management specialist who writes prior authorization \
medical necessity letters. Your letters are reviewed by insurance company medical directors.

Your writing follows these principles:
1. Lead with the specific diagnosis and ICD-10 code
2. Document all conservative treatments attempted, their duration, and specific reasons for failure
3. Include objective clinical evidence: exam findings, lab values, imaging results with specific numbers
4. Describe functional impact in concrete, measurable terms — not "patient has pain" but \
"patient is unable to walk more than 50 feet without rest, cannot climb stairs, requires \
assistance for basic ADLs including dressing and bathing"
5. Reference relevant clinical guidelines when applicable (e.g., ACR Appropriateness Criteria, \
specialty society guidelines)
6. Connect the requested procedure to the treatment plan — explain why this specific procedure \
is the necessary next step
7. Use clinical language but ensure the argument is clear and logical
8. Include a timeline showing progression and escalation of care
9. Never fabricate information — only use what is provided in the patient data

Structure the letter as:
- Patient identification and requesting provider
- Primary diagnosis with ICD-10 code
- Clinical history and timeline of care
- Treatments attempted and outcomes
- Current clinical status (objective findings)
- Medical necessity justification
- Requested procedure with CPT code and clinical rationale
"""


def _format_context_for_prompt(
    request: PriorAuthRequest,
    context: RelevantContext,
    patient_name: str,
    patient_dob: str,
    insurance_info: str,
) -> str:
    """Format the relevant EHR context into a clear, structured user message."""

    lines: list[str] = []

    lines.append("=== PRIOR AUTHORIZATION REQUEST ===")
    lines.append(f"Patient: {patient_name}")
    lines.append(f"Date of Birth: {patient_dob}")
    lines.append(f"Insurance: {insurance_info}")
    lines.append(f"Requesting Provider: {request.treating_physician}")
    lines.append(f"Requested Procedure: {request.requested_procedure}")
    lines.append(f"CPT Code: {request.cpt_code}")
    lines.append(f"Diagnosis Codes: {', '.join(request.diagnosis_codes)}")
    lines.append(f"Urgency: {request.urgency}")
    if request.clinical_rationale:
        lines.append(f"Physician's Rationale: {request.clinical_rationale}")

    lines.append("\n=== RELEVANT DIAGNOSES ===")
    for dx in context.relevant_diagnoses:
        lines.append(
            f"- {dx.icd10_code}: {dx.description} "
            f"(diagnosed {dx.date_diagnosed}, status: {dx.status})"
        )

    lines.append("\n=== MEDICATION HISTORY ===")
    if context.relevant_medications:
        for med in context.relevant_medications:
            status_info = f"Status: {med.status}"
            if med.reason_discontinued:
                status_info += f" — Reason: {med.reason_discontinued}"
            end = med.end_date or "ongoing"
            lines.append(
                f"- {med.name} {med.dosage} {med.frequency} "
                f"({med.start_date} to {end}) [{status_info}]"
            )
    else:
        lines.append("- No medications documented for this condition")

    lines.append("\n=== ENCOUNTER HISTORY (SOAP Notes) ===")
    for enc in context.relevant_encounters:
        lines.append(f"\n--- {enc.date} | {enc.provider} | {enc.type} ---")
        lines.append(f"Reason: {enc.reason}")
        lines.append(f"Subjective: {enc.soap_note.subjective}")
        lines.append(f"Objective: {enc.soap_note.objective}")
        lines.append(f"Assessment: {enc.soap_note.assessment}")
        lines.append(f"Plan: {enc.soap_note.plan}")

    lines.append("\n=== LAB RESULTS ===")
    if context.relevant_labs:
        for lab in context.relevant_labs:
            flag_str = f" [{lab.flag}]" if lab.flag else ""
            lines.append(
                f"- {lab.test_name} ({lab.date}): {lab.value} {lab.unit} "
                f"(ref: {lab.reference_range}){flag_str}"
            )
    else:
        lines.append("- No lab results available")

    lines.append("\n=== IMAGING RESULTS ===")
    if context.relevant_imaging:
        for img in context.relevant_imaging:
            lines.append(f"- {img.type} of {img.body_part} ({img.date}):")
            lines.append(f"  Findings: {img.findings}")
            lines.append(f"  Impression: {img.impression}")
    else:
        lines.append("- No prior imaging available")

    lines.append("\n=== PROCEDURES HISTORY ===")
    if context.relevant_procedures:
        for proc in context.relevant_procedures:
            lines.append(
                f"- {proc.name} (CPT {proc.cpt_code}, {proc.date}) — "
                f"Provider: {proc.provider} — Outcome: {proc.outcome}"
            )
    else:
        lines.append("- No prior procedures documented")

    lines.append(f"\n=== CONTEXT FILTERING RATIONALE ===")
    lines.append(context.filtering_rationale)

    lines.append(
        "\n\nPlease generate a comprehensive medical necessity letter for the "
        "requested procedure using ONLY the information provided above."
    )

    return "\n".join(lines)


async def generate_letter(
    request: PriorAuthRequest,
    context: RelevantContext,
    patient_name: str,
    patient_dob: str,
    insurance_info: str,
) -> str:
    """
    Call Claude API to generate a medical necessity letter.

    Returns the generated letter text.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError(
            "ANTHROPIC_API_KEY not found in environment. "
            "Please set it in the .env file."
        )

    user_message = _format_context_for_prompt(
        request, context, patient_name, patient_dob, insurance_info
    )

    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    # Extract the text from the response
    letter_text = ""
    for block in message.content:
        if block.type == "text":
            letter_text += block.text

    return letter_text
