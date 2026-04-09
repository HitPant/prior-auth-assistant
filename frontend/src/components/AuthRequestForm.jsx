import React, { useState, useEffect } from 'react';
import { FileEdit } from 'lucide-react';
import { DEMO_REQUESTS } from '../constants/demoRequests';

export default function AuthRequestForm({ selectedPatientId, onChange }) {
  const [formData, setFormData] = useState({
    requested_procedure: '',
    cpt_code: '',
    diagnosis_codes: '',
    treating_physician: '',
    urgency: 'Routine',
    clinical_rationale: ''
  });

  // Pre-fill form when a demo patient is selected
  useEffect(() => {
    let newData;
    if (selectedPatientId && DEMO_REQUESTS[selectedPatientId]) {
      const demoData = DEMO_REQUESTS[selectedPatientId];
      newData = {
        requested_procedure: demoData.requested_procedure || '',
        cpt_code: demoData.cpt_code || '',
        diagnosis_codes: demoData.diagnosis_codes?.join(', ') || '',
        treating_physician: demoData.treating_physician || '',
        urgency: demoData.urgency || 'Routine',
        clinical_rationale: ''
      };
    } else {
      newData = {
        requested_procedure: '',
        cpt_code: '',
        diagnosis_codes: '',
        treating_physician: '',
        urgency: 'Routine',
        clinical_rationale: ''
      };
    }
    setFormData(newData);
    
    // Bubble up immediately
    onChange({
      ...newData,
      diagnosis_codes: newData.diagnosis_codes.split(',').map(s => s.trim()).filter(Boolean)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    
    // Bubble changes explicitly as they happen
    onChange({
      ...newFormData,
      diagnosis_codes: newFormData.diagnosis_codes.split(',').map(s => s.trim()).filter(Boolean)
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileEdit className="h-5 w-5 text-teal-600" />
          Prior Authorization Request Details
        </h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Requested Procedure *</label>
            <input 
              type="text" name="requested_procedure" 
              value={formData.requested_procedure} onChange={handleChange}
              placeholder="e.g. MRI of the Right Knee" 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CPT Code *</label>
            <input 
              type="text" name="cpt_code" 
              value={formData.cpt_code} onChange={handleChange}
              placeholder="e.g. 73721" 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
            <select 
              name="urgency" value={formData.urgency} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="Routine">Routine</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Diagnosis Codes (ICD-10) *</label>
            <input 
              type="text" name="diagnosis_codes" 
              value={formData.diagnosis_codes} onChange={handleChange}
              placeholder="e.g. M17.11, E11.9" 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Treating Physician *</label>
            <input 
              type="text" name="treating_physician" 
              value={formData.treating_physician} onChange={handleChange}
              placeholder="Dr. Name" 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Additional Clinical Rationale (Optional)</label>
          <textarea 
            name="clinical_rationale"
            value={formData.clinical_rationale} onChange={handleChange}
            placeholder="Add any specific context not captured in the EHR that the AI should consider..." 
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 h-24 resize-none"
          ></textarea>
        </div>
      </div>
    </div>
  );
}
