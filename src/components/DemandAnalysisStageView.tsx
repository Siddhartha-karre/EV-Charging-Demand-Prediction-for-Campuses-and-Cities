import React, { useState } from 'react';
import { DemandPredictionResult, PersonaType } from '../types';
import { SyntheticBadge } from './SyntheticBadge';
import {
  TrendingUp,
  Brain,
  CheckCircle,
  AlertTriangle,
  BarChart2,
  Cpu,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';

interface DemandAnalysisStageViewProps {
  predictionResult: DemandPredictionResult | null;
  datasetId?: string;
  onTrainModel: (params: { dataset_id: string }) => Promise<void>;
  isLoading: boolean;
  activePersona: PersonaType;
}

export const DemandAnalysisStageView: React.FC<DemandAnalysisStageViewProps> = ({
  predictionResult,
  datasetId,
  onTrainModel,
  isLoading,
  activePersona,
}) => {
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');

  const handleRetrain = () => {
    if (datasetId) {
      onTrainModel({ dataset_id: datasetId });
    }
  };

  const featureChartData =
    predictionResult?.feature_importances?.map((f) => ({
      feature: f.feature,
      importance: f.importance_pct,
    })) || [];

  const diurnalForecastData = predictionResult?.hourly_24h_forecast || [];

  const beatsBaseline = predictionResult?.comparison?.lightgbm_beats_baseline ?? true;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Phase 3: Demand Prediction (ML Engine)
            </h1>
            <SyntheticBadge />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fills the <strong>Demand Analysis</strong> stage. Models: Historical Baseline vs LightGBM Regressor.
          </p>
        </div>

        {datasetId && (
          <button
            onClick={handleRetrain}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Training Engine Running...' : 'Retrain LightGBM Model'}</span>
          </button>
        )}
      </div>

      {/* Acceptance Test Banner */}
      {predictionResult && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            beatsBaseline
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/40 border-red-500/50 text-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {beatsBaseline ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div>
              <h4 className="text-sm font-semibold">
                {beatsBaseline ? 'Model Verification Succeeded' : 'Model Underperformance Warning'}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {predictionResult.comparison.status_verdict}
              </p>
            </div>
          </div>
          <div className="text-right text-xs font-mono font-semibold">
            <span className={beatsBaseline ? 'text-emerald-400' : 'text-red-400'}>
              {predictionResult.comparison.mae_improvement_pct > 0 ? '+' : ''}
              {predictionResult.comparison.mae_improvement_pct}% MAE Improvement
            </span>
          </div>
        </div>
      )}

      {/* Formula & Probability Model Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-2">
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block">
            Core Demand Mathematical Definition
          </span>
          <div className="font-mono text-sm text-slate-100 bg-slate-950/60 p-3 rounded border border-slate-800">
            demand_kWh = ev_count_present &times; P(needs_charge | SOC, dwell) &times; avg_kWh_needed
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Where average energy needed is proportional to battery capacity (62.5 kWh) and depth of discharge.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-2">
          <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider block">
            Probability Model Justification
          </span>
          <div className="font-mono text-xs text-slate-200 bg-slate-950/60 p-3 rounded border border-slate-800 leading-relaxed">
            P(needs_charge | SOC, dwell) = 1 / (1 + exp(0.08 &times; (SOC - 50%) - 0.015 &times; (dwell - 60m)))
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Logistic sigmoid: Drivers with SOC &lt; 50% and parking dwell &gt; 60 mins exhibit exponential charging propensity.
          </p>
        </div>
      </div>

      {predictionResult && (
        <>
          {/* Metrics Comparison Table */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-400" />
                <span>Model Evaluation: Baseline vs LightGBM (Time-Based Train/Test Split)</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {predictionResult.split_strategy}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2.5 px-3">Model Architecture</th>
                    <th className="py-2.5 px-3 text-right">MAE (kWh)</th>
                    <th className="py-2.5 px-3 text-right">RMSE (kWh)</th>
                    <th className="py-2.5 px-3 text-right">MAPE (%)</th>
                    <th className="py-2.5 px-3 text-right">% Improvement vs Baseline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-sans text-slate-300 font-medium">
                      (a) Historical Average by (Zone, Hour) [Baseline]
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      {predictionResult.models.baseline.mae.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      {predictionResult.models.baseline.rmse.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      {predictionResult.models.baseline.mape_pct.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 font-sans">Reference Datum</td>
                  </tr>
                  <tr className="bg-emerald-950/20 hover:bg-emerald-950/30">
                    <td className="py-3 px-3 font-sans text-emerald-300 font-semibold flex items-center gap-1.5">
                      <span>(b) LightGBM Regressor (GBDT)</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded">Primary</span>
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300 font-bold">
                      {predictionResult.models.lightgbm.mae.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300 font-bold">
                      {predictionResult.models.lightgbm.rmse.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300 font-bold">
                      {predictionResult.models.lightgbm.mape_pct.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      +{predictionResult.comparison.mae_improvement_pct}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Visualizations: Feature Importance & 24-Hour Forecast */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Feature Importance Bar Chart */}
            <div className="lg:col-span-5 p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                <span>Feature Importance Ranking</span>
                <span className="text-xs text-slate-400 font-mono">% Contribution</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                    <YAxis
                      dataKey="feature"
                      type="category"
                      stroke="#94a3b8"
                      fontSize={10}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                    />
                    <Bar dataKey="importance" fill="#10b981" radius={[0, 4, 4, 0]} name="Importance %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 24-Hour Diurnal Demand Forecast */}
            <div className="lg:col-span-7 p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                <span>24-Hour Forecast: Actual vs LightGBM vs Baseline</span>
                <span className="text-xs text-slate-400 font-mono">Hourly kWh</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={diurnalForecastData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="hour_label" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual_kwh"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      dot={false}
                      name="Actual Test Ground Truth"
                    />
                    <Line
                      type="monotone"
                      dataKey="lightgbm_pred_kwh"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                      name="LightGBM Forecast"
                    />
                    <Line
                      type="monotone"
                      dataKey="baseline_pred_kwh"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Historical Baseline"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Zone Forecast Table */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">
              Zone-Level 24-Hour Forecast Summary
            </h3>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 px-3">Zone ID</th>
                    <th className="py-2 px-3">Zone Name</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3 text-right">Actual Peak (kW)</th>
                    <th className="py-2 px-3 text-right">LightGBM Daily (kWh)</th>
                    <th className="py-2 px-3 text-right">Baseline Daily (kWh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {predictionResult.zone_forecasts.map((zf) => (
                    <tr key={zf.zone_id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-emerald-400">{zf.zone_id}</td>
                      <td className="py-2 px-3 font-sans text-slate-200">{zf.zone_name}</td>
                      <td className="py-2 px-3 font-sans text-slate-400 uppercase text-[10px]">
                        {zf.zone_type}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-200">{zf.actual_peak_kw} kW</td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-semibold">
                        {zf.forecast_daily_kwh}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">{zf.baseline_daily_kwh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
