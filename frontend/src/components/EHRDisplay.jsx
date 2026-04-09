import React, { useState } from 'react';
import { 
  FolderOpen, ChevronDown, ChevronRight, Activity, 
  Pill, Stethoscope, TestTube, Image as ImageIcon, 
  Syringe, AlertTriangle, User 
} from 'lucide-react';

function Accordion({ title, icon: Icon, children, defaultOpen = false, badge }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button 
        className="w-full flex items-center justify-between py-4 px-6 bg-white hover:bg-slate-50 transition-colors focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-teal-600" />
          <span className="font-semibold text-slate-800">{title}</span>
          {badge !== undefined && <span className="text-xs font-medium bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
        {isOpen ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
      </button>
      {isOpen && <div className="p-6 bg-slate-50/50">{children}</div>}
    </div>
  );
}

export default function EHRDisplay({ patient }) {
  if (!patient || Object.keys(patient).length === 0) return null;

  const fullName = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
  const problemList = patient.problem_list || patient.diagnoses || [];
  const procedures = patient.procedures_history || patient.procedures || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-teal-600" />
          Electronic Health Record (EHR)
        </h2>
        <span className="text-sm font-medium text-slate-500">Patient: {fullName}</span>
      </div>

      <div className="divide-y divide-slate-200">
        
        {/* Demographics & Insurance */}
        <Accordion title="Demographics & Insurance" icon={User} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Demographics</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate-500">Name:</dt><dd className="font-medium text-slate-900">{fullName}</dd>
                <dt className="text-slate-500">DOB:</dt><dd className="font-medium text-slate-900">{patient.date_of_birth || patient.dob}</dd>
                <dt className="text-slate-500">Age / Gender:</dt><dd className="font-medium text-slate-900">{patient.age} / {patient.gender}</dd>
              </dl>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Insurance</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate-500">Payer:</dt><dd className="font-medium text-slate-900">{patient.insurance?.payer || patient.insurance?.payer_name}</dd>
                <dt className="text-slate-500">Plan Type:</dt><dd className="font-medium text-slate-900">{patient.insurance?.plan || patient.insurance?.plan_type}</dd>
                <dt className="text-slate-500">Member ID:</dt><dd className="font-medium text-slate-900">{patient.insurance?.member_id}</dd>
              </dl>
            </div>
          </div>
        </Accordion>

        {/* Problem List */}
        <Accordion title="Problem List" icon={Activity} badge={problemList.length}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-2 rounded-tl-lg">ICD-10</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Date Diagnosed</th>
                  <th className="px-4 py-2 rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {problemList.map((dx, i) => (
                  <tr key={i} className={dx.status === 'active' ? 'bg-white' : 'bg-slate-50 text-slate-500'}>
                    <td className="px-4 py-3 font-mono">{dx.icd10_code || dx.code}</td>
                    <td className="px-4 py-3 font-medium">{dx.description}</td>
                    <td className="px-4 py-3">{dx.date_diagnosed}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dx.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                        {dx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Accordion>

        {/* Medications */}
        {(patient.medications || []).length > 0 && (
          <Accordion title="Medications" icon={Pill} badge={patient.medications.length}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-2 rounded-tl-lg">Medication</th>
                    <th className="px-4 py-2">Dosage & Sig</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Dates</th>
                    <th className="px-4 py-2 rounded-tr-lg">Notes / Reason Stopped</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {patient.medications.map((med, i) => (
                    <tr key={i} className={med.status === 'discontinued' ? 'bg-slate-50 text-slate-600' : ''}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{med.name}</td>
                      <td className="px-4 py-3">{med.dosage} <br/><span className="text-xs text-slate-500">{med.frequency}</span></td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${med.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                          {med.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {med.start_date} <br/> to {med.end_date || 'Present'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {med.reason_discontinued && <span className="font-semibold text-orange-800 bg-orange-50 px-1 py-0.5 rounded">Failed: {med.reason_discontinued}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>
        )}

        {/* Encounters */}
        {(patient.encounters || []).length > 0 && (
          <Accordion title="Clinical Encounters" icon={Stethoscope} badge={patient.encounters.length}>
            <div className="space-y-4">
              {patient.encounters.map((enc, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800">{enc.date} - {enc.type}</span>
                      <p className="text-xs text-slate-500 mt-0.5">Provider: {enc.provider} | Reason: {enc.reason}</p>
                    </div>
                  </div>
                  {enc.soap_note && (
                    <div className="p-4 text-sm space-y-3">
                      <div><span className="font-semibold text-slate-700 block mb-1">Subjective (S)</span><p className="text-slate-600">{enc.soap_note.subjective}</p></div>
                      <div><span className="font-semibold text-slate-700 block mb-1">Objective (O)</span><p className="text-slate-600">{enc.soap_note.objective}</p></div>
                      <div><span className="font-semibold text-slate-700 block mb-1">Assessment (A)</span><p className="text-slate-600">{enc.soap_note.assessment}</p></div>
                      <div><span className="font-semibold text-slate-700 block mb-1">Plan (P)</span><p className="text-slate-600">{enc.soap_note.plan}</p></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Accordion>
        )}

        {/* Lab Results */}
        {(patient.lab_results || []).length > 0 && (
          <Accordion title="Laboratory Results" icon={TestTube} badge={patient.lab_results.length}>
             <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 font-medium">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Test Name</th>
                      <th className="px-4 py-2">Value</th>
                      <th className="px-4 py-2">Ref Range</th>
                      <th className="px-4 py-2">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patient.lab_results.map((lab, i) => (
                      <tr key={i} className={lab.flag ? 'bg-red-50/50' : ''}>
                        <td className="px-4 py-3">{lab.date}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{lab.test_name}</td>
                        <td className="px-4 py-3">{lab.value} {lab.unit}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{lab.reference_range}</td>
                        <td className="px-4 py-3">
                          {lab.flag && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{lab.flag}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </Accordion>
        )}

        {/* Imaging Results */}
        {(patient.imaging_results || []).length > 0 && (
          <Accordion title="Imaging Results" icon={ImageIcon} badge={patient.imaging_results.length}>
              <div className="space-y-3">
                {patient.imaging_results.map((img, i) => (
                  <div key={i} className="bg-white p-4 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-800">{img.type} - {img.body_part}</h4>
                      <span className="text-xs text-slate-500">{img.date}</span>
                    </div>
                    <div className="text-sm space-y-2">
                      <p><span className="font-medium text-slate-700">Findings:</span> <span className="text-slate-600">{img.findings}</span></p>
                      <p><span className="font-medium text-slate-700">Impression:</span> <span className="text-slate-900 font-medium">{img.impression}</span></p>
                    </div>
                  </div>
                ))}
              </div>
          </Accordion>
        )}

        {/* Procedures */}
        {procedures.length > 0 && (
          <Accordion title="Procedural History" icon={Syringe} badge={procedures.length}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left bg-white border border-slate-200">
                  <thead className="bg-slate-100 text-slate-600 font-medium">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Procedure</th>
                      <th className="px-4 py-2">Provider</th>
                      <th className="px-4 py-2">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {procedures.map((proc, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3">{proc.date}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{proc.name}</div>
                          <div className="text-xs text-slate-500 font-mono">CPT: {proc.cpt_code}</div>
                        </td>
                        <td className="px-4 py-3">{proc.provider}</td>
                        <td className="px-4 py-3 text-slate-600">{proc.outcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </Accordion>
        )}

        {/* Allergies */}
        <Accordion title="Allergies" icon={AlertTriangle} badge={(patient.allergies || []).length}>
          {!(patient.allergies?.length) ? <p className="text-sm text-slate-500">No known allergies (NKA).</p> : (
            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
              {patient.allergies.map((allergy, i) => (
                <li key={i}>{allergy}</li>
              ))}
            </ul>
          )}
        </Accordion>

      </div>
    </div>
  );
}
