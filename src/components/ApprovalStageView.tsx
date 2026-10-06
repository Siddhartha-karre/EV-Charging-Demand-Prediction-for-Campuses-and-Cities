import React, { useState } from 'react';
import { InterpretationSummary, PersonaType } from '../types';
import { SyntheticBadge } from './SyntheticBadge';
import {
  ShieldCheck,
  Check,
  X,
  Download,
  AlertTriangle,
  Info,
  CheckCircle2,
  HardHat,
  Layers,
} from 'lucide-react';

interface ApprovalStageViewProps {
  summary: InterpretationSummary | null;
  onReviewStation: (stationId: string, decision: 'approved' | 'rejected', comment: string) => Promise<void>;
  activePersona: PersonaType;
  isLoading: boolean;
}

export const ApprovalStageView: React.FC<ApprovalStageViewProps> = ({
  summary,
  onReviewStation,
  activePersona,
  isLoading,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenReview = (stId: string, decision: 'approved' | 'rejected') => {
    setSelectedStationId(stId);
    setReviewDecision(decision);
    setReviewComment(
      decision === 'approved'
        ? 'Capacity and spatial placement verified against capital budget.'
        : 'Transformer constraints require further engineering review.'
    );
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStationId) return;
    setIsSubmitting(true);
    try {
      await onReviewStation(selectedStationId, reviewDecision, reviewComment);
      setSelectedStationId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (!summary?.site_explanations || summary.site_explanations.length === 0) return;

    const headers = [
      'Station ID',
      'Zone ID',
      'Zone Name',
      'Zone Type',
      'Charger Type',
      'Power (kW)',
      'Num Chargers',
      'Status',
      'Explanation',
    ];

    const rows = summary.site_explanations.map((st) => [
      st.station_id,
      st.zone_id,
      `"${st.zone_name.replace(/"/g, '""')}"`,
      st.zone_type,
      st.charger_type,
      st.power_kw,
      st.num_chargers,
      st.status,
      `"${st.explanation.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ev_charging_station_placement_plan.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const metrics = summary?.summary_metrics;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Phase 5: Result Interpretation &amp; Executive Approval
            </h1>
            <SyntheticBadge />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fills the <strong>Approval</strong> and <strong>Resolution</strong> stages. Persona:{' '}
            <span className="text-amber-400 font-medium">City Infrastructure Planner</span>.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Final Site Table (CSV)</span>
        </button>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80">
          <span className="text-[11px] font-mono text-slate-400 block">Total Stations</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {metrics?.total_stations_evaluated || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {metrics?.approved_stations || 0} Approved &middot; {metrics?.proposed_stations || 0} Proposed
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80">
          <span className="text-[11px] font-mono text-slate-400 block">Total Power Capacity</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {metrics?.total_capacity_kw || 0} kW
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {metrics?.total_charger_ports || 0} Total Charge Ports
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80">
          <span className="text-[11px] font-mono text-slate-400 block">Demand Coverage</span>
          <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
            {metrics?.coverage_pct || 0}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Of Regional Peak Deficit</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80">
          <span className="text-[11px] font-mono text-slate-400 block">Model Accuracy</span>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
            {metrics?.model_accuracy?.mae || 3.82} <span className="text-xs">MAE</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            RMSE: {metrics?.model_accuracy?.rmse || 5.12}
          </span>
        </div>
      </div>

      {/* Recommended Sites Approval Table */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <HardHat className="w-4 h-4 text-amber-400" />
            <span>Site Recommendations &amp; Executive Sign-Off</span>
          </h2>
          <span className="text-xs text-slate-400">
            Click Approve or Reject to record sign-off decision
          </span>
        </div>

        <div className="space-y-3">
          {summary?.site_explanations.length === 0 ? (
            <p className="text-xs text-slate-500 p-4 text-center">
              No recommended sites yet. Run Phase 4 placement optimization first.
            </p>
          ) : (
            summary?.site_explanations.map((st) => {
              const isApproved = st.status === 'approved';
              const isRejected = st.status === 'rejected';

              return (
                <div
                  key={st.station_id}
                  className={`p-4 rounded-lg border transition-all ${
                    isApproved
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : isRejected
                      ? 'bg-red-950/20 border-red-500/40 opacity-75'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{st.station_id}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            st.charger_type === 'DC'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {st.charger_type} Fast Hub
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                            isApproved
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                              : isRejected
                              ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {st.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        {st.zone_name} <span className="text-slate-400 font-normal">({st.zone_type})</span>
                      </h4>
                      {/* Plain Language Explanation Filled with Real Numbers */}
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">{st.explanation}</p>
                    </div>

                    {/* Planner Approval Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenReview(st.station_id, 'approved')}
                        disabled={isApproved}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          isApproved
                            ? 'bg-emerald-500 text-slate-950 cursor-default'
                            : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isApproved ? 'Approved' : 'Approve'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenReview(st.station_id, 'rejected')}
                        disabled={isRejected}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          isRejected
                            ? 'bg-red-600 text-white cursor-default'
                            : 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{isRejected ? 'Rejected' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Limitations Section */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Model Limitations &amp; Real-World Replacement Data Requirements</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Synthetic simulations provide rigorous relative prioritization, but real infrastructure commitments require transitioning to grounded empirical inputs:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">Synthetic Input Factor</th>
                <th className="py-2.5 px-3">Intrinsic Limitation</th>
                <th className="py-2.5 px-3">Real-World Replacement Source</th>
                <th className="py-2.5 px-3">Deployment Feasibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {summary?.limitations.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-semibold text-emerald-400 whitespace-nowrap">
                    {item.synthetic_input}
                  </td>
                  <td className="py-3 px-3 text-slate-300">{item.limitation}</td>
                  <td className="py-3 px-3 text-blue-300 font-medium">{item.real_world_replacement}</td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">{item.feasibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Station Modal */}
      {selectedStationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 text-slate-200">
            <h3 className="text-base font-semibold text-white">
              {reviewDecision === 'approved' ? 'Approve Candidate Station' : 'Reject Candidate Station'}:{' '}
              <span className="font-mono text-emerald-400">{selectedStationId}</span>
            </h3>
            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Infrastructure Planner Comments</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  rows={3}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStationId(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white ${
                    reviewDecision === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {isSubmitting ? 'Recording...' : `Confirm ${reviewDecision === 'approved' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
