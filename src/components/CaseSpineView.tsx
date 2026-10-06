import React, { useState } from 'react';
import { CaseDetail, CaseItem, CaseStage, PersonaType, Zone } from '../types';
import { SyntheticBadge } from './SyntheticBadge';
import {
  ArrowRight,
  RotateCcw,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface CaseSpineViewProps {
  cases: CaseItem[];
  selectedCaseDetail: CaseDetail | null;
  activePersona: PersonaType;
  zones: Zone[];
  onSelectCase: (caseId: string) => void;
  onCreateCase: (data: { scope: 'campus' | 'city'; selected_zones: string[]; notes: string }) => Promise<void>;
  onAdvanceStage: (caseId: string, comments?: string) => Promise<void>;
  onRejectStage: (caseId: string, comments: string) => Promise<void>;
  onRunAutomatedStep: (caseId: string) => Promise<void>;
  onNavigateToStage: (stage: CaseStage) => void;
  filterAssignedToMe: boolean;
  setFilterAssignedToMe: (val: boolean) => void;
}

const STAGES: CaseStage[] = [
  'Request',
  'Data Preparation',
  'Demand Analysis',
  'Site Evaluation',
  'Approval',
  'Resolution',
];

export const CaseSpineView: React.FC<CaseSpineViewProps> = ({
  cases,
  selectedCaseDetail,
  activePersona,
  zones,
  onSelectCase,
  onCreateCase,
  onAdvanceStage,
  onRejectStage,
  onRunAutomatedStep,
  onNavigateToStage,
  filterAssignedToMe,
  setFilterAssignedToMe,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scope, setScope] = useState<'campus' | 'city'>('campus');
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateCase({
        scope,
        selected_zones: selectedZoneIds,
        notes,
      });
      setShowCreateModal(false);
      setNotes('');
      setSelectedZoneIds([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseDetail || !rejectReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onRejectStage(selectedCaseDetail.case.id, rejectReason);
      setRejectModalOpen(false);
      setRejectReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCase = selectedCaseDetail?.case;
  const currentStageIdx = currentCase ? STAGES.indexOf(currentCase.stage) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto">
      {/* Left Column: Worklist & Case Selection */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Case Worklist</h2>
            <p className="text-xs text-slate-400">Pega Blueprint BP-2538779-2 Master Cases</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Case
          </button>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center p-1 bg-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setFilterAssignedToMe(true)}
            className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
              filterAssignedToMe
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Assigned to Me ({activePersona})
          </button>
          <button
            onClick={() => setFilterAssignedToMe(false)}
            className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
              !filterAssignedToMe
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Cases ({cases.length})
          </button>
        </div>

        {/* Case Cards List */}
        <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
          {cases.length === 0 ? (
            <div className="p-6 text-center border border-slate-800 rounded-lg bg-slate-900/50">
              <p className="text-sm text-slate-400">No cases found in this view.</p>
              <button
                onClick={() => setFilterAssignedToMe(false)}
                className="mt-2 text-xs text-emerald-400 hover:underline"
              >
                Show all cases
              </button>
            </div>
          ) : (
            cases.map((c) => {
              const isSelected = currentCase?.id === c.id;
              const isAssigned = c.assigned_persona === activePersona;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCase(c.id)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/50 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono text-slate-400">{c.id}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        c.status === 'Resolved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : c.status === 'Revision Requested'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-medium text-slate-200 mt-1 line-clamp-1">
                    {c.case_type} ({c.scope.toUpperCase()})
                  </h3>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-300 font-medium">{c.stage}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px]">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className={isAssigned ? 'text-amber-400 font-medium' : 'text-slate-400'}>
                        {c.assigned_persona}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Case Details, 6-Stage Lifecycle Engine & History */}
      <div className="lg:col-span-8 space-y-6">
        {currentCase ? (
          <>
            {/* Header info */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-white tracking-tight">
                      {currentCase.id} · {currentCase.case_type}
                    </h1>
                    <SyntheticBadge />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Scope: <strong className="text-slate-200 uppercase">{currentCase.scope}</strong> · Created:{' '}
                    {currentCase.created_at ? new Date(currentCase.created_at).toLocaleDateString() : 'Recent'}
                  </p>
                </div>

                {/* Stage Action Controls */}
                <div className="flex items-center gap-2">
                  {/* Reject button (if not in first stage) */}
                  {currentStageIdx > 0 && currentCase.stage !== 'Resolution' && (
                    <button
                      onClick={() => setRejectModalOpen(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-300 bg-red-950/40 hover:bg-red-900/40 border border-red-800/40 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reject to Prior Stage
                    </button>
                  )}

                  {/* Advance button (if not in final stage) */}
                  {currentStageIdx < STAGES.length - 1 && (
                    <button
                      onClick={() => onAdvanceStage(currentCase.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
                    >
                      <span>Advance Stage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Application Control Agent automated runner */}
                  {activePersona === 'Application Control Agent' && (
                    <button
                      onClick={() => onRunAutomatedStep(currentCase.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-300 bg-purple-950/50 hover:bg-purple-900/50 border border-purple-800/40 rounded-lg transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Run Automated Step
                    </button>
                  )}
                </div>
              </div>

              {/* 6-Stage Stepper Spine */}
              <div className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  {STAGES.map((stg, idx) => {
                    const isCompleted = idx < currentStageIdx;
                    const isCurrent = idx === currentStageIdx;
                    const isFuture = idx > currentStageIdx;

                    return (
                      <button
                        key={stg}
                        onClick={() => onNavigateToStage(stg)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                            : isCompleted
                            ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
                            : 'bg-slate-900/40 border-slate-800/80 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-mono text-slate-400">0{idx + 1}</span>
                          {isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : isCurrent ? (
                            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          ) : null}
                        </div>
                        <h4 className="text-xs font-medium text-slate-200 line-clamp-1">{stg}</h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                          {idx === 0
                            ? 'Intake'
                            : idx === 1
                            ? 'Synth Gen'
                            : idx === 2
                            ? 'LightGBM'
                            : idx === 3
                            ? 'MCLP Eval'
                            : idx === 4
                            ? 'Planner'
                            : 'Complete'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stage Workspace Shortcut */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Current Active Stage: </span>
                  <strong className="text-emerald-400">{currentCase.stage}</strong>
                  <span className="text-slate-400 ml-2">· Assigned Persona: </span>
                  <strong className="text-slate-200">{currentCase.assigned_persona}</strong>
                </div>
                <button
                  onClick={() => onNavigateToStage(currentCase.stage)}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  <span>Open Stage Workspace</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Notes */}
              {currentCase.notes && (
                <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                  <span className="text-slate-300 font-medium">Case Notes: </span>
                  {currentCase.notes}
                </div>
              )}
            </div>

            {/* Stage History Timeline */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Case Stage History &amp; Audit Trail</span>
              </h3>

              <div className="space-y-2.5">
                {selectedCaseDetail.history.length === 0 ? (
                  <p className="text-xs text-slate-500">No stage transitions recorded yet.</p>
                ) : (
                  selectedCaseDetail.history.map((hist) => (
                    <div
                      key={hist.id}
                      className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-mono text-[11px] text-slate-400">{hist.id}</span>
                        <span>{hist.timestamp ? new Date(hist.timestamp).toLocaleTimeString() : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="font-semibold text-white">{hist.actor}</span>
                        <span className="text-slate-500">performed</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-200 uppercase text-[10px]">
                          {hist.action}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {hist.from_stage} &rarr; {hist.to_stage}
                        </span>
                      </div>
                      {hist.comments && (
                        <p className="text-slate-400 pt-0.5 text-[11px] italic">{hist.comments}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/60">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-slate-300">No Case Selected</h3>
            <p className="text-xs text-slate-500 mt-1">Select a case from the worklist or create a new one.</p>
          </div>
        )}
      </div>

      {/* Modal: Create Case */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 text-slate-200">
            <h3 className="text-base font-semibold text-white">Create New EV Placement Case</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('campus')}
                    className={`py-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                      scope === 'campus'
                        ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    Campus (~50 Zones)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('city')}
                    className={`py-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                      scope === 'city'
                        ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    City (~100 Zones)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Case Planning Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Master placement plan for student hostels and athletic quads..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
                >
                  {isSubmitting ? 'Creating...' : 'Initialize Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reject Case */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 text-slate-200">
            <h3 className="text-base font-semibold text-red-400">Reject Case to Prior Stage</h3>
            <p className="text-xs text-slate-400">
              Provide specific technical or operational reasons for rejecting this case back to the prior stage.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Grid transformer limits exceeded; re-evaluate demand forecast..."
                  required
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
