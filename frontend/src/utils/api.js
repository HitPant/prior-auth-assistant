const API_URL = 'http://localhost:8000';

export async function fetchPatients() {
  const response = await fetch(`${API_URL}/patients`);
  if (!response.ok) throw new Error('Failed to fetch patients');
  return response.json();
}

export async function fetchPatientDetails(patientId) {
  const response = await fetch(`${API_URL}/patients/${patientId}`);
  if (!response.ok) throw new Error('Failed to fetch patient details');
  return response.json();
}

export async function generateAuthRequest(requestData) {
  const response = await fetch(`${API_URL}/generate-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });
  if (!response.ok) throw new Error('Failed to generate auth request');
  return response.json();
}

export async function rescoreSubmission(rescoreData) {
  const response = await fetch(`${API_URL}/rescore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rescoreData)
  });
  if (!response.ok) throw new Error('Failed to rescore submission');
  return response.json();
}
