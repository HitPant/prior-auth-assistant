import React, { useState } from 'react';
import { 
  CheckCircle2, XCircle, AlertCircle, RefreshCw, 
  Lightbulb, ShieldCheck, ShieldAlert, ShieldX 
} from 'lucide-react';

export default function ScoreDashboard({ score, isRescoring, onRescore }) {
  if (!score) return null;

  const { overall_score, likelihood, criteria, suggestions } = score;

  // Determine styling based on likelihood
  let gaugeColor, Icon, labelColor, bgLight;
  if (likelihood === 'High') {
    gaugeColor = 'text-green-500';
    labelColor = 'text-green-700';
    bgLight = 'bg-green-50';
    Icon = ShieldCheck;
  } else if (likelihood === 'Moderate') {
    gaugeColor = 'text-amber-500';
    labelColor = 'text-amber-700';
    bgLight = 'bg-amber-50';
    Icon = ShieldAlert;
  } else {
    gaugeColor = 'text-red-500';
    labelColor = 'text-red-700';
    bgLight = 'bg-red-50';
    Icon = ShieldX;
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Overall Score Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Approval Likelihood</h3>
        
        <div className="relative mb-2">
          {/* Simple Circle Gauge */}
          <svg className="w-32 h-32 transform -rotate-90">
            <circle cx="64" cy="64" r="56" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
            <circle 
              cx="64" cy="64" r="56" fill="transparent" 
              className={gaugeColor} 
              stroke="currentColor" strokeWidth="12" 
              strokeDasharray={351.8} /* 2 * PI * 56 */
              strokeDashoffset={351.8 - (351.8 * overall_score) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-slate-800">{overall_score}%</span>
          </div>
        </div>
        
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${bgLight} ${labelColor} mb-2`}>
          <Icon className="h-4 w-4" />
          {likelihood} Likelihood
        </div>
        
        <p className="text-xs text-slate-500 max-w-[250px]">
          Based on established prior authorization best practices and common denial patterns.
        </p>

        <button
          onClick={onRescore}
          disabled={isRescoring}
          className={`mt-6 w-full py-2.5 px-4 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2
            ${isRescoring 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-teal-700 hover:border-teal-300'
            }`}
        >
          <RefreshCw className={`h-4 w-4 ${isRescoring ? 'animate-spin' : ''}`} />
          {isRescoring ? 'Analyzing changes...' : 'Re-Evaluate Edits'}
        </button>
      </div>

      {/* Suggestions Panel */}
      {suggestions && suggestions.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">Recommendations to Strengthen</h3>
          </div>
          <div className="p-4 bg-white">
            <ul className="space-y-3">
              {suggestions.map((sug, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="leading-snug">{sug}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden">
          <div className="bg-green-50 px-5 py-3 border-b border-green-200 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Submission is well-documented</h3>
          </div>
          <div className="p-4 bg-white">
            <p className="text-sm text-slate-600">No significant gaps identified based on the provided clinical context.</p>
          </div>
        </div>
      )}

      {/* Criteria Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Scoring Breakdown</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {criteria.map((c, i) => {
            let statusIcon, statusColor, statusBg;
            if (c.score === 'Met') {
              statusIcon = <CheckCircle2 className="h-4 w-4" />;
              statusColor = 'text-green-600';
              statusBg = 'bg-green-50';
            } else if (c.score === 'Partially Met') {
              statusIcon = <AlertCircle className="h-4 w-4" />;
              statusColor = 'text-amber-600';
              statusBg = 'bg-amber-50';
            } else {
              statusIcon = <XCircle className="h-4 w-4" />;
              statusColor = 'text-red-600';
              statusBg = 'bg-red-50';
            }

            // Render weight dots (e.g. 5 dots for weight 5)
            const dots = [];
            for (let j = 0; j < 5; j++) {
              dots.push(
                <span key={j} className={`h-1.5 w-1.5 rounded-full ${j < c.weight ? 'bg-slate-600' : 'bg-slate-200'}`}></span>
              );
            }

            return (
              <div key={i} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h4 className="font-medium text-slate-800 text-sm leading-tight flex-1">{c.name}</h4>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${statusBg} ${statusColor} shrink-0`}>
                    {statusIcon} {c.score}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Weight:</span>
                  <div className="flex gap-0.5">{dots}</div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                  {c.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
