import React from 'react';
import { Filter, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export default function ContextAssembly({ isGenerating, onGenerate, canGenerate }) {
  return (
    <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl shadow-sm border border-teal-100 overflow-hidden mb-8">
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-teal-900 flex items-center gap-2 mb-2">
              <Filter className="h-5 w-5 text-teal-600" />
              AI Context Assembly
            </h3>
            <p className="text-sm text-teal-800 mb-4">
              When you click generate, the system will instantly analyze the patient's full EHR record, filter out irrelevant data (like routine wellness checks or unrelated conditions), and extract only the clinical context relevant to this specific prior authorization request.
            </p>
            
            <div className="flex gap-4 text-xs font-medium text-teal-700">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Condition-specific diagnoses</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Failed Step Therapies</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Relevant Imaging & Labs</span>
            </div>
          </div>

          <div className="md:w-72 flex-shrink-0 flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-teal-100/50">
            <button
              onClick={onGenerate}
              disabled={isGenerating || !canGenerate}
              className={`w-full py-3 px-6 rounded-lg font-bold text-white shadow-md transition-all flex items-center justify-center gap-2
                ${isGenerating || !canGenerate 
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-teal-600 hover:bg-teal-700 hover:shadow-lg active:scale-95'
                }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Letter...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Prior Auth
                </>
              )}
            </button>
            <span className="text-xs text-slate-500 mt-3 text-center">
              Takes ~5-15s. The AI will securely process the clinical context to structure a medical necessity letter.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
