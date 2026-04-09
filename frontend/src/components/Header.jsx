import React from 'react';
import { Activity, ArrowLeft } from 'lucide-react';

export default function Header({ currentView, onGoBack }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-teal-700">
          <Activity className="h-6 w-6" />
          <span className="font-bold text-xl tracking-tight">PreAuth<span className="text-slate-800">AI</span></span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center text-sm font-medium">
            <span className={`px-3 py-1 rounded-full ${currentView === 1 ? 'bg-teal-100 text-teal-800' : 'text-slate-500 hover:text-slate-700 cursor-pointer'}`}
                  onClick={() => currentView === 2 && onGoBack()}>
              1. Patient Context
            </span>
            <div className="w-8 border-t border-slate-300 mx-2"></div>
            <span className={`px-3 py-1 rounded-full ${currentView === 2 ? 'bg-teal-100 text-teal-800' : 'text-slate-400'}`}>
              2. Authorization & Score
            </span>
          </div>
          
          {currentView === 2 && (
            <button 
              onClick={onGoBack}
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-teal-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Context
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
