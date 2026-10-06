import React, { useState, useEffect, useRef } from 'react';
import { PersonaType, StationPlacementResult } from '../types';
import { SyntheticBadge } from './SyntheticBadge';
import {
  MapPin,
  Sliders,
  Zap,
  BatteryCharging,
  Layers,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import L from 'leaflet';

interface SiteEvaluationStageViewProps {
  placementResult: StationPlacementResult | null;
  onOptimize: (params: {
    top_n: number;
    algorithm: string;
    target_utilization: number;
  }) => Promise<void>;
  isLoading: boolean;
  activePersona: PersonaType;
}

export const SiteEvaluationStageView: React.FC<SiteEvaluationStageViewProps> = ({
  placementResult,
  onOptimize,
  isLoading,
  activePersona,
}) => {
  const [topN, setTopN] = useState<number>(10);
  const [algorithm, setAlgorithm] = useState<string>('greedy_max_coverage');
  const [targetUtilization, setTargetUtilization] = useState<number>(0.65);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize or update Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = placementResult?.ranked_zones[0]?.lat || 37.4275;
      const initialLng = placementResult?.ranked_zones[0]?.lng || -122.1697;

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 14);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    // Refresh markers
    if (mapInstanceRef.current && layerGroupRef.current) {
      layerGroupRef.current.clearLayers();

      // Render zones with demand circles
      placementResult?.ranked_zones.forEach((z) => {
        const radius = Math.min(250, Math.max(80, z.peak_kw * 3.5));
        const circle = L.circle([z.lat, z.lng], {
          color: '#38bdf8',
          fillColor: '#38bdf8',
          fillOpacity: 0.2,
          radius: radius,
        }).bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong>${z.name}</strong><br/>
            Peak Demand: <strong>${z.peak_kw} kW</strong><br/>
            Avg Dwell: <strong>${z.avg_dwell_minutes} mins</strong><br/>
            Flow Centrality: <strong>${z.flow_centrality}</strong><br/>
            Score: <strong>${z.composite_score}</strong>
          </div>
        `);
        layerGroupRef.current?.addLayer(circle);
      });

      // Render proposed stations with custom marker icons
      placementResult?.proposed_stations.forEach((st) => {
        if (!st.lat || !st.lng) return;
        const isDC = st.charger_type === 'DC';
        const color = isDC ? '#ef4444' : '#10b981';

        const customIcon = L.divIcon({
          className: 'custom-station-pin',
          html: `
            <div style="
              background-color: ${color};
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              border: 2px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: bold;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            ">
              ${isDC ? 'DC' : 'AC'}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([st.lat, st.lng], { icon: customIcon }).bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <div style="font-weight: bold; color: ${color};">${st.station_id} · ${st.charger_type} Hub</div>
            <div>Zone: <strong>${st.zone_name || st.zone_id}</strong></div>
            <div>Chargers: <strong>${st.num_chargers} ports</strong> (${st.total_power_kw} kW)</div>
            <div>Peak Demand: <strong>${st.peak_demand_kw} kW</strong></div>
            <div>Target Util: <strong>${st.target_utilization_pct}%</strong></div>
            <div style="margin-top: 4px; font-size: 10px; color: #64748b;">Status: PROPOSED</div>
          </div>
        `);
        layerGroupRef.current?.addLayer(marker);
      });

      if (placementResult?.proposed_stations && placementResult.proposed_stations.length > 0) {
        const first = placementResult.proposed_stations[0];
        if (first.lat && first.lng) {
          mapInstanceRef.current.panTo([first.lat, first.lng]);
        }
      }
    }
  }, [placementResult]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onOptimize({
      top_n: topN,
      algorithm,
      target_utilization: targetUtilization,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Phase 4: Station Placement Recommendation
            </h1>
            <SyntheticBadge />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fills the <strong>Site Evaluation</strong> stage. Persona:{' '}
            <span className="text-emerald-400 font-medium">Urban Mobility Analyst</span>.
          </p>
        </div>
      </div>

      {/* Algorithm & Sizing Formula Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1.5">
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block">
            Charger Sizing Mathematical Formula
          </span>
          <div className="font-mono text-xs text-slate-200 bg-slate-950/60 p-2.5 rounded border border-slate-800">
            N_chargers = &lceil; Peak_kW / ( Unit_Power_kW &times; Target_Util ) &rceil;
          </div>
          <p className="text-[11px] text-slate-400">
            Sized to meet peak demand at target {(targetUtilization * 100).toFixed(0)}% utilization.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1.5">
          <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider block">
            Charger Technology Selection
          </span>
          <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <div>
              &bull; Dwell &ge; 120 mins &rarr; <strong className="text-emerald-400">Slow AC (22 kW)</strong>
            </div>
            <div>
              &bull; Dwell &lt; 120 mins &rarr; <strong className="text-red-400">Fast DC (60 kW)</strong>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Allocated by commuter parking dwell characteristics.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1.5">
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block">
            Regional Demand Coverage
          </span>
          <div className="flex items-baseline gap-2 bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <span className="text-xl font-bold font-mono text-white">
              {placementResult ? `${placementResult.coverage_pct}%` : '--%'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({placementResult?.covered_peak_kw || 0} / {placementResult?.total_regional_peak_kw || 0} kW)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Coverage achieved by Top {topN} candidate sites.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Optimization Controls & Ranked Table */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Optimization Parameters</span>
            </h3>

            <form onSubmit={handleApply} className="space-y-4 text-xs">
              {/* Algorithm Choice */}
              <div>
                <label className="text-slate-300 font-medium block mb-1">Coverage Algorithm</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAlgorithm('greedy_max_coverage')}
                    className={`p-2 rounded-lg border text-left transition-colors ${
                      algorithm === 'greedy_max_coverage'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-semibold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    Greedy Max-Coverage
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlgorithm('demand_weighted_kmeans')}
                    className={`p-2 rounded-lg border text-left transition-colors ${
                      algorithm === 'demand_weighted_kmeans'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-semibold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    Demand-Weighted K-Means
                  </button>
                </div>
              </div>

              {/* Top N Selection */}
              <div>
                <label className="text-slate-300 font-medium block mb-1">Select Top N Sites</label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 15].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTopN(n)}
                      className={`py-2 rounded-lg border text-center font-mono transition-colors ${
                        topN === n
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-semibold'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Top {n} Sites
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Utilization */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium">Target Daily Utilization</label>
                  <span className="font-mono text-emerald-400">{(targetUtilization * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.60"
                  max="0.70"
                  step="0.01"
                  value={targetUtilization}
                  onChange={(e) => setTargetUtilization(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>{isLoading ? 'Computing Optimal Placement...' : 'Run Placement Optimizer'}</span>
              </button>
            </form>
          </div>

          {/* Ranked Candidates Summary Table */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
              <span>Candidate Sites Table ({placementResult?.proposed_stations.length || 0} Proposed)</span>
              <span className="text-[11px] font-mono text-emerald-400">Saved as &quot;proposed&quot;</span>
            </h3>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 px-2.5">Station</th>
                    <th className="py-2 px-2.5">Zone</th>
                    <th className="py-2 px-2.5">Type</th>
                    <th className="py-2 px-2.5 text-right">Ports</th>
                    <th className="py-2 px-2.5 text-right">kW</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {placementResult?.proposed_stations.map((st) => (
                    <tr key={st.station_id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-2.5 text-emerald-400 font-semibold">{st.station_id}</td>
                      <td className="py-2 px-2.5 font-sans text-slate-200 truncate max-w-[120px]">
                        {st.zone_name || st.zone_id}
                      </td>
                      <td className="py-2 px-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            st.charger_type === 'DC'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {st.charger_type}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-200">{st.num_chargers}</td>
                      <td className="py-2 px-2.5 text-right text-slate-300">{st.total_power_kw}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Leaflet Interactive Map View */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Demand Heatmap &amp; Recommended Station Sites</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Interactive Leaflet spatial view with demand circles and proposed charging pins
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-300">Fast DC</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">Slow AC</span>
                </div>
              </div>
            </div>

            <div
              ref={mapContainerRef}
              className="h-[520px] w-full rounded-lg border border-slate-800 bg-slate-950 overflow-hidden relative z-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
