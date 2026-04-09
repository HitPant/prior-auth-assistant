import React, { useState, useEffect } from 'react';
import { User, Users, FileText, Activity } from 'lucide-react';

export default function PatientSelector({ onSelect, patients, loading, selectedPatientId }) {
  const [mode, setMode] = useState('demo'); // 'demo' or 'manual'

  useEffect(() => {
    // Select the first patient once they are loaded ONLY if none is selected yet
    if (patients && patients.length > 0 && mode === 'demo' && !selectedPatientId) {
      onSelect(patients[0].id);
    }
  }, [patients, mode, selectedPatientId, onSelect]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-600" />
          Patient Selection
        </h2>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'demo' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setMode('demo')}
          >
            Demo Patients
          </button>
          <button 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'manual' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setMode('manual')}
          >
            Manual Entry
          </button>
        </div>
      </div>

      <div className="p-6">
        {mode === 'demo' ? (
          <div>
            {loading && patients.length === 0 ? (
              <div className="flex items-center text-slate-500 gap-2"><Activity className="h-4 w-4 animate-spin"/> Loading demo patients...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {patients.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={`flex flex-col text-left p-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${selectedPatientId === p.id ? 'border-teal-500 ring-1 ring-teal-500 bg-teal-50/10' : 'border-slate-200 hover:border-teal-400 bg-white'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900">{p.name}</span>
                      <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                        {p.age}{p.gender}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500 line-clamp-2">
                      {p.primary_diagnosis_description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name</label>
              <input type="text" placeholder="John Doe" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                <input type="number" placeholder="45" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option>M</option><option>F</option><option>Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ICD-10 Code</label>
              <input type="text" placeholder="M54.5" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Primary Diagnosis</label>
              <input type="text" placeholder="Low back pain" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="md:col-span-2 lg:col-span-3 mt-2 text-sm text-slate-500 flex items-start gap-2 bg-blue-50 text-blue-800 p-3 rounded-md">
              <FileText className="h-5 w-5 shrink-0" />
              <p>Manual entry mode allows you to generate letters without full EHR context. The AI will rely heavily on the Prior Auth Request Details provided in the next section.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
