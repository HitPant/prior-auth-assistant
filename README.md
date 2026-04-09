# Prior Auth AI Assistant

A web application that helps doctors generate strong medical necessity justifications for insurance prior authorization submissions.

## Tech Stack

- **Backend:** Python / FastAPI
- **LLM:** Claude API (Anthropic)
- **Frontend:** React (Prompt 2)

## Quick Start

### 1. Install Dependencies

```bash
cd preauth-ai/backend
pip install -r requirements.txt
```

### 2. Configure API Key

Edit `backend/.env` and set your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run the Server

```bash
cd preauth-ai/backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Swagger docs at `http://localhost:8000/docs`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/patients` | List all patients (summary view) |
| `GET` | `/patients/{id}` | Full patient EHR record |
| `POST` | `/generate-auth` | Generate prior auth letter + score |
| `POST` | `/rescore` | Re-score an edited letter (no LLM call) |

## Dummy Patients

| ID | Name | Scenario | Expected Score |
|----|------|----------|----------------|
| P001 | Margaret Chen | MRI right knee — exhaustive conservative tx | 80-95% (High) |
| P002 | James Rodriguez | Lumbar MRI — short PT, borderline | 45-65% (Moderate) |
| P003 | Tyler Washington | Brain MRI — no conservative tx | 15-30% (Low) |
