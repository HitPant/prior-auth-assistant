# PreAuth AI

An AI-powered prior authorization assistant that helps doctors generate strong medical necessity justifications and predicts approval likelihood before submission.

<!-- ![Demo](./demo.gif) -->

---

## The Problem

Prior authorization is one of the most broken parts of US healthcare administration. Doctors spend 14+ hours per week manually writing justification letters to insurance companies to get treatments approved. Most denials don't happen because the clinical case is weak — they happen because the paperwork is incomplete or the medical necessity argument isn't framed in the language insurance reviewers respond to.

This tool automates the hardest part of that process: turning a patient's clinical history into a submission-ready medical necessity letter with a transparent approval likelihood score.

## What It Does

1. **Retrieves patient data** from an EHR (simulated with realistic dummy data for the prototype)
2. **Filters relevant clinical context** from the full patient record using diagnosis-based relevance logic
3. **Generates a medical necessity letter** using Claude API with a utilization management specialist system prompt
4. **Scores the submission** against 6 weighted criteria based on common denial patterns
5. **Provides actionable suggestions** to strengthen weak areas before submission
6. **Supports iterative editing** — doctors can modify the letter and re-score in real time

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│ FastAPI Backend │────▶│   Claude API    │
│                 │     │                 │     │                 │
│  - Patient UI   │     │  - EHR Service  │     │  - Letter Gen   │
│  - Score Dash   │     │  - Context Filter│     │                 │
│  - Edit/Rescore │     │  - Scoring Eng  │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Dummy EHR    │
                        │ (patients.json)│
                        └──────────────┘
```

### Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Python + FastAPI + Pydantic
- **LLM:** Anthropic Claude API (Sonnet)
- **Data:** JSON-based dummy EHR with realistic clinical structure

## How It Works

### 1. Context Filtering

When a prior auth request comes in, the system anchors on the request's ICD-10 code and pulls only clinically relevant records from the patient's EHR. The filtering logic works in concentric circles: exact diagnosis match, same body system, clinically adjacent comorbidities. A patient with diabetes, hypertension, and knee osteoarthritis requesting a knee MRI will have their knee-related encounters, failed treatments, and imaging pulled — but their diabetes management visits are excluded.

### 2. Letter Generation

The filtered context is sent to Claude with a system prompt that instructs it to write like an experienced utilization management specialist. The generation follows a specific structure: patient identification, diagnosis with ICD-10 code, clinical history and timeline, treatments attempted with outcomes, current clinical status with objective findings, and medical necessity justification.

### 3. Scoring Engine

A rule-based hybrid scoring engine evaluates the generated letter against 6 criteria:

| Criterion | Weight | What It Checks |
|-----------|--------|----------------|
| Step Therapy Documentation | 5 | Conservative treatments tried and failed |
| Clinical Evidence | 4 | Objective findings, labs, imaging |
| Functional Impact | 4 | Specific ADL limitations documented |
| Diagnosis Specificity | 3 | Specific ICD-10 code, not unspecified |
| Guideline Alignment | 3 | Matches clinical guidelines |
| Temporal Documentation | 3 | Timeline of care progression |

Each criterion is scored as Met, Partially Met, or Not Met. The composite score maps to a High/Moderate/Low likelihood rating. The scoring is intentionally transparent — every finding is explained so doctors can see exactly where their submission stands.

## Running Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com))

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Create .env file with your API key
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Run the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Demo Scenarios

The prototype includes three pre-built patient profiles representing different approval scenarios:

**Margaret Chen (P001) — High Likelihood (100%)**
58F with severe knee osteoarthritis. 14 months of documented treatment failures including two NSAIDs (discontinued due to side effects), physical therapy, and corticosteroid injection. X-ray shows Grade 4 OA. Clear functional decline documented. Requesting MRI for surgical planning.

**James Rodriguez (P002) — Moderate Likelihood (66%)**
34M with low back pain. Partial treatment history — one NSAID, 4 weeks of PT (insurers typically want 6-8 weeks). Vague functional impact documentation. Requesting lumbar MRI.

**Tyler Washington (P003) — Low Likelihood (27%)**
28M with tension headaches. Single visit, normal neurological exam, no conservative treatment attempted. Doctor's notes explicitly state MRI is not clinically indicated. Requesting brain MRI for reassurance.

## Known Limitations

This is a working prototype with intentional scope boundaries:

- **Dummy EHR data** — real implementation would require FHIR API integration with systems like Epic or Cerner
- **Heuristic scoring** — the rubric is based on common denial patterns, not trained on real outcome data
- **No payer-specific logic** — generates universal medical necessity letters rather than tailoring to specific insurers
- **Code-based context filtering** — production would layer NLP for semantic relevance in unstructured notes
- **No submission pipeline** — generates the letter but doesn't submit to payer portals or EDI 278 transactions
- **No audit trail or compliance layer** — HIPAA compliance, role-based access, and audit logging would be required for production

## Roadmap

### Near-term Improvements
- Patient search functionality (currently manual entry is freeform)
- PDF export of generated letters
- Multi-language support for patient-facing summaries

### Production Path
- FHIR R4 integration for live EHR data
- ML-based scoring layer trained on real approval/denial outcomes
- Payer-specific rule engine with coverage criteria database
- Semantic context filtering using embedding-based retrieval
- Appeal letter generation for denied submissions
- Integration with clearinghouses for electronic submission (X12 278)
- Full audit trail, user authentication, HIPAA compliance

## Project Structure

```
preauth-ai/
├── backend/
│   ├── main.py                  # FastAPI app + endpoints
│   ├── models/schemas.py        # Pydantic data models
│   ├── services/
│   │   ├── ehr_service.py       # Patient data + context filtering
│   │   ├── generation_service.py # Claude API integration
│   │   └── scoring_service.py   # Rule-based scoring engine
│   ├── data/patients.json       # Dummy EHR data
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── PatientSelector.jsx
│   │   │   ├── EHRDisplay.jsx
│   │   │   ├── GeneratedLetter.jsx
│   │   │   └── ScoreDashboard.jsx
│   │   └── utils/api.js
│   └── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/patients` | List all patients (summary) |
| GET | `/patients/{id}` | Get full patient EHR |
| POST | `/generate-auth` | Generate letter + score |
| POST | `/rescore` | Re-score edited letter |

## Built With

- [Anthropic Claude API](https://docs.claude.com)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## License

MIT

## Author

Built by [Hitesh Pant](https://linkedin.com/in/your-linkedin)

---

*This is a portfolio prototype demonstrating agentic AI workflows in healthcare. It is not a clinically validated tool and should not be used for actual prior authorization submissions.*
