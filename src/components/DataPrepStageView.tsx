import React, { useState } from 'react';
import { DemandDataset, PersonaType } from '../types';
import { SyntheticBadge } from './SyntheticBadge';
import {
  Database,
  Sparkles,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Clock,
  Layers,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface DataPrepStageViewProps {
  dataset: DemandDataset | null;
  activePersona: PersonaType;
  onGenerateDataset: (params: {
    scope: 'campus' | 'city';
    days: number;
    noise_level: number;
    seed: number;
  }) => Promise<void>;
  isLoading: boolean;
}

export const DataPrepStageView: React.FC<DataPrepStageViewProps> = ({
  dataset,
  activePersona,
  onGenerateDataset,
  isLoading,
}) => {
  const [scope, setScope] = useState<'campus' | 'city'>('campus');
  const [days, setDays] = useState<number>(14);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.15);
  const [seed, setSeed] = useState<number>(42);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateDataset({
      scope,
      days,
      noise_level: noiseLevel,
      seed,
    });
  };

  const sampleChartData =
    dataset?.sample_records?.map((r) => ({
      hour: r.timestamp.split(' ')[1] || '00:00',
      demand_kwh: r.demand_kwh,
      ev_count: r.ev_count_present,
      arrival_soc: r.avg_arrival_soc,
      dwell_mins: r.avg_dwell_minutes,
    })) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Phase 2: Synthetic Data Generation
            </h1>
            <SyntheticBadge />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fills the <strong>Data Preparation</strong> stage. Persona:{' '}
            <span className="text-blue-400 font-medium">Data Scientist</span> (triggered by Application Control Agent)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generator Parameters Form */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Synthetic Generation Parameters</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Scope Selection */}
              <div>
                <label className="text-slate-300 font-medium block mb-1">Regional Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('campus')}
                    className={`py-2 px-3 rounded-lg border text-left transition-colors ${
                      scope === 'campus'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold">Campus Scope</div>
                    <div className="text-[11px] text-slate-400">~50 Zones (Hostels, Labs, Quads)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('city')}
                    className={`py-2 px-3 rounded-lg border text-left transition-colors ${
                      scope === 'city'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold">City Scope</div>
                    <div className="text-[11px] text-slate-400">~100 Zones (Offices, Malls, Transit)</div>
                  </button>
                </div>
              </div>

              {/* Days Selection */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium">Horizon Time Span</label>
                  <span className="font-mono text-emerald-400">{days} Days ({days * 24} hours)</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[7, 14, 30, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      className={`py-1.5 rounded border font-mono text-center transition-colors ${
                        days === d
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-semibold'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Noise Level Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium">Stochastic Noise Level (&sigma;)</label>
                  <span className="font-mono text-slate-400">{(noiseLevel * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.35"
                  step="0.01"
                  value={noiseLevel}
                  onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Seed */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium">Reproducibility Seed</label>
                  <span className="text-[11px] text-slate-500 font-mono">Identical data guaranteed</span>
                </div>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-2 font-mono text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? 'Generating Engine Running...' : 'Generate Synthetic Dataset'}</span>
              </button>
            </form>
          </div>

          {/* Dataset Summary Card */}
          {dataset && (
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                <span>Dataset Summary</span>
                <span className="font-mono text-xs text-emerald-400">{dataset.dataset_id}</span>
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Total Demand Records</span>
                  <strong className="text-base font-mono text-white">
                    {dataset.total_demand_records.toLocaleString()}
                  </strong>
                  <span className="text-[10px] text-slate-500 block">
                    {dataset.params.zones_count} zones &times; {dataset.params.days * 24} hrs
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Mobility Flow Pairs</span>
                  <strong className="text-base font-mono text-white">
                    {dataset.total_mobility_flows.toLocaleString()}
                  </strong>
                  <span className="text-[10px] text-slate-500 block">24-hour diurnal OD links</span>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div>
                  <span className="text-slate-500">Seed: </span>
                  <strong className="font-mono text-slate-300">{dataset.params.seed}</strong> · Scope:{' '}
                  <strong className="text-slate-300 uppercase">{dataset.scope}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Created: </span>
                  <span className="text-slate-400 font-mono">
                    {dataset.created_at ? new Date(dataset.created_at).toLocaleString() : 'Recent'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Assumptions Registry & Sample Plots */}
        <div className="lg:col-span-7 space-y-5">
          {/* Sample Diurnal Curve Plot */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Sample 24-Hour Diurnal Demand (DemandRecord)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Hourly actual charging draw (kWh) across initial sample records
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400">kWh / hr</span>
            </div>

            <div className="h-56 w-full pt-2">
              {sampleChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sampleChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="demand_kwh"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="Demand (kWh)"
                    />
                    <Line
                      type="monotone"
                      dataKey="ev_count"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      dot={false}
                      name="Active EVs"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Generate dataset to view diurnal curves
                </div>
              )}
            </div>
          </div>

          {/* Assumptions Registry Table */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Assumptions Registry (Stored in DemandDataset.assumptions_json)</span>
            </h3>

            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 px-2.5">ID</th>
                    <th className="py-2 px-2.5">Category</th>
                    <th className="py-2 px-2.5">Assumption Statement</th>
                    <th className="py-2 px-2.5">Technical Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {dataset?.assumptions?.map((asm) => (
                    <tr key={asm.assumption_id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-2.5 font-mono text-[11px] text-emerald-400">
                        {asm.assumption_id}
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-300 font-medium whitespace-nowrap">
                        {asm.category}
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-300">{asm.statement}</td>
                      <td className="py-2.5 px-2.5 text-slate-400 text-[11px]">{asm.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
