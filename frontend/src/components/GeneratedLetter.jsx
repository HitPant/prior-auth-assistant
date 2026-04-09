import React, { useState, useEffect } from 'react';
import { FileText, Copy, Download, CheckCircle2 } from 'lucide-react';

export default function GeneratedLetter({ letter, onLetterChange, metadata }) {
  const [copied, setCopied] = useState(false);
  const [localLetter, setLocalLetter] = useState(letter);

  useEffect(() => {
    setLocalLetter(letter);
  }, [letter]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([localLetter], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `prior-auth-letter-${metadata?.patient_id || 'patient'}.txt`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  const handleChange = (e) => {
    setLocalLetter(e.target.value);
    onLetterChange(e.target.value);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            Generated Medical Necessity Letter
          </h2>
          {metadata && (
            <p className="text-xs text-slate-500 mt-1">
              Patient: {metadata.patient_id} | Procedure: {metadata.procedure}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition-colors shadow-sm"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          
          <button 
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      <div className="flex-1 p-0 relative group">
        <textarea
          value={localLetter}
          onChange={handleChange}
          className="w-full h-[600px] sm:h-[700px] p-6 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500 resize-none font-sans text-sm md:text-base leading-relaxed text-slate-800 bg-slate-50 border-none"
          spellCheck="false"
        ></textarea>
        
        <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-sm">Editable</span>
        </div>
      </div>
    </div>
  );
}
