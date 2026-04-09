import { useState, useCallback } from 'react';
import * as api from '../utils/api';

export function usePatientData() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generationResult, setGenerationResult] = useState(null);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchPatients();
      setPatients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPatientDetails = useCallback(async (patientId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchPatientDetails(patientId);
      setSelectedPatient(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateAuth = useCallback(async (requestData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.generateAuthRequest(requestData);
      setGenerationResult(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const rescore = useCallback(async (rescoreData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.rescoreSubmission(rescoreData);
      setGenerationResult(prev => ({
        ...prev,
        score: result
      }));
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPatient(null);
    setGenerationResult(null);
  }, []);

  return {
    patients,
    selectedPatient,
    loading,
    error,
    generationResult,
    loadPatients,
    loadPatientDetails,
    generateAuth,
    rescore,
    clearSelection
  };
}
