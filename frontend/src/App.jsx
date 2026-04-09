import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import PatientSelector from './components/PatientSelector';
import AuthRequestForm from './components/AuthRequestForm';
import EHRDisplay from './components/EHRDisplay';
import ContextAssembly from './components/ContextAssembly';
import GeneratedLetter from './components/GeneratedLetter';
import ScoreDashboard from './components/ScoreDashboard';
import { usePatientData } from './hooks/usePatientData';

function App() {
  const { 
    patients, 
    selectedPatient, 
    loadPatients, 
    loadPatientDetails, 
    loading,
    error,
    generateAuth,
    generationResult,
    rescore
  } = usePatientData();

  const [currentView, setCurrentView] = useState(1);
  const [requestForm, setRequestForm] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);
  
  // Local state for edits made to the letter before rescoring
  const [editedLetter, setEditedLetter] = useState("");

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // When generation completes, set the initial letter text
  useEffect(() => {
    if (generationResult?.letter) {
      setEditedLetter(generationResult.letter);
    }
  }, [generationResult]);

  const handlePatientSelect = (id) => {
    loadPatientDetails(id);
    setCurrentView(1);
  };

  const handleFormChange = (newFormData) => {
    setRequestForm(newFormData);
  };

  const handleGenerate = async () => {
    if (!selectedPatient || !requestForm) return;
    setIsGenerating(true);
    const requestPayload = { patient_id: selectedPatient.id, ...requestForm };
    const result = await generateAuth(requestPayload);
    setIsGenerating(false);
    if (result) setCurrentView(2);
  };

  const handleRescore = async () => {
    if (!selectedPatient || !requestForm) return;
    setIsRescoring(true);
    await rescore({
      patient_id: selectedPatient.id,
      edited_letter: editedLetter,
      request: { patient_id: selectedPatient.id, ...requestForm }
    });
    setIsRescoring(false);
  };

  const handleGoBack = () => setCurrentView(1);

  const canGenerate = selectedPatient && requestForm?.requested_procedure && requestForm?.cpt_code && requestForm?.diagnosis_codes?.length > 0 && requestForm?.treating_physician;

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentView={currentView} onGoBack={handleGoBack} />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
            {error}
          </div>
        )}
        
        {currentView === 1 ? (
          <div className="space-y-6">
            <PatientSelector 
              patients={patients} 
              onSelect={handlePatientSelect}
              loading={loading}
              selectedPatientId={selectedPatient?.id}
            />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <div className="space-y-6">
                <AuthRequestForm 
                  selectedPatientId={selectedPatient?.id} 
                  onChange={handleFormChange} 
                />
                
                {selectedPatient && (
                  <ContextAssembly 
                    isGenerating={isGenerating} 
                    onGenerate={handleGenerate} 
                    canGenerate={canGenerate}
                  />
                )}
              </div>
              
              <div>
                {selectedPatient ? (
                  <EHRDisplay patient={selectedPatient} />
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-500 h-64 flex flex-col items-center justify-center">
                    Select a patient or use manual entry to view clinical context.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {generationResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
                <div className="lg:col-span-8 h-full">
                  <GeneratedLetter 
                    letter={editedLetter} 
                    onLetterChange={setEditedLetter}
                    metadata={{
                      patient_id: selectedPatient?.name || selectedPatient?.id,
                      procedure: requestForm?.requested_procedure
                    }}
                  />
                </div>
                <div className="lg:col-span-4 h-full">
                  <ScoreDashboard 
                    score={generationResult.score} 
                    isRescoring={isRescoring}
                    onRescore={handleRescore}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                No authorization data available. Please go back and generate one.
                <button onClick={handleGoBack} className="block mx-auto mt-4 text-teal-600 font-medium">
                  Return to Context
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
