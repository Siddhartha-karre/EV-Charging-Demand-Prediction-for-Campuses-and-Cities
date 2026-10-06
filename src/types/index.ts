export type PersonaType =
  | 'Data Scientist'
  | 'Urban Mobility Analyst'
  | 'City Infrastructure Planner'
  | 'Application Control Agent';

export type CaseStage =
  | 'Request'
  | 'Data Preparation'
  | 'Demand Analysis'
  | 'Site Evaluation'
  | 'Approval'
  | 'Resolution';

export interface Zone {
  zone_id: string;
  name: string;
  zone_type: string;
  scope: 'campus' | 'city';
  lat: number;
  lng: number;
  data_tag: string;
}

export interface EVVehicle {
  vehicle_id: string;
  vehicle_type: string;
  battery_kwh: number;
  home_zone_id: string;
  data_tag: string;
}

export interface ChargingStation {
  station_id: string;
  zone_id: string;
  zone_name?: string;
  zone_type?: string;
  scope?: string;
  lat?: number;
  lng?: number;
  charger_type: 'AC' | 'DC';
  power_kw: number;
  num_chargers: number;
  power_per_charger_kw?: number;
  total_power_kw?: number;
  peak_demand_kw?: number;
  avg_dwell_minutes?: number;
  target_utilization_pct?: number;
  status: 'proposed' | 'approved' | 'rejected';
  data_tag: string;
}

export interface DemandDatasetAssumption {
  assumption_id: string;
  category: string;
  statement: string;
  rationale: string;
}

export interface DemandDatasetParams {
  scope: 'campus' | 'city';
  days: number;
  noise_level: number;
  seed: number;
  zones_count: number;
  hours_per_day: number;
  expected_rows: number;
}

export interface DemandRecord {
  record_id: string;
  zone_id: string;
  timestamp: string;
  ev_count_present: number;
  avg_dwell_minutes: number;
  avg_arrival_soc: number;
  demand_kwh: number;
  data_tag: string;
}

export interface DemandDataset {
  dataset_id: string;
  scope: 'campus' | 'city';
  is_synthetic: boolean;
  data_tag: string;
  created_at: string | null;
  params: DemandDatasetParams;
  assumptions: DemandDatasetAssumption[];
  total_demand_records: number;
  total_mobility_flows: number;
  sample_records: DemandRecord[];
}

export interface CaseStageHistoryItem {
  id: string;
  from_stage: string;
  to_stage: string;
  actor: string;
  action: string;
  comments: string | null;
  timestamp: string | null;
}

export interface CaseItem {
  id: string;
  case_type: string;
  stage: CaseStage;
  status: string;
  assigned_persona: PersonaType;
  scope: 'campus' | 'city';
  selected_zones: string[];
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CaseDetail {
  case: CaseItem & { stages_order: CaseStage[] };
  history: CaseStageHistoryItem[];
}

export interface MLModelEvaluation {
  name: string;
  mae: number;
  rmse: number;
  mape_pct: number;
}

export interface MLFeatureImportanceItem {
  feature: string;
  importance_pct: number;
}

export interface HourlyForecastPoint {
  hour: number;
  hour_label: string;
  actual_kwh: number;
  lightgbm_pred_kwh: number;
  baseline_pred_kwh: number;
}

export interface ZoneForecastItem {
  zone_id: string;
  zone_name: string;
  zone_type: string;
  scope: string;
  actual_peak_kw: number;
  forecast_daily_kwh: number;
  baseline_daily_kwh: number;
}

export interface DemandPredictionResult {
  formula_definition: string;
  probability_model_justification: string;
  split_strategy: string;
  models: {
    baseline: MLModelEvaluation;
    lightgbm: MLModelEvaluation;
  };
  comparison: {
    mae_improvement_pct: number;
    rmse_improvement_pct: number;
    mape_improvement_pct: number;
    lightgbm_beats_baseline: boolean;
    status_verdict: string;
  };
  feature_importances: MLFeatureImportanceItem[];
  hourly_24h_forecast: HourlyForecastPoint[];
  zone_forecasts: ZoneForecastItem[];
}

export interface ScoredPlacementZone {
  zone_id: string;
  name: string;
  zone_type: string;
  peak_kw: number;
  avg_dwell_minutes: number;
  flow_centrality: number;
  composite_score: number;
  lat: number;
  lng: number;
}

export interface StationPlacementResult {
  algorithm: string;
  top_n: number;
  target_utilization: number;
  total_regional_peak_kw: number;
  covered_peak_kw: number;
  coverage_pct: number;
  formula: string;
  ranked_zones: ScoredPlacementZone[];
  proposed_stations: ChargingStation[];
}

export interface LimitationItem {
  synthetic_input: string;
  limitation: string;
  real_world_replacement: string;
  feasibility: string;
}

export interface SiteExplanation {
  station_id: string;
  zone_id: string;
  zone_name: string;
  zone_type: string;
  charger_type: string;
  power_kw: number;
  num_chargers: number;
  status: string;
  explanation: string;
}

export interface InterpretationSummary {
  summary_metrics: {
    total_stations_evaluated: number;
    approved_stations: number;
    proposed_stations: number;
    rejected_stations: number;
    total_capacity_kw: number;
    total_charger_ports: number;
    model_accuracy: {
      mae: number;
      rmse: number;
      name: string;
    };
    coverage_pct: number;
  };
  site_explanations: SiteExplanation[];
  limitations: LimitationItem[];
}

export interface SystemHealth {
  status: string;
  blueprint_reference: string;
  data_label: string;
  active_persona: PersonaType;
  counts: {
    zones: number;
    ev_vehicles: number;
    charging_stations: number;
    demand_datasets: number;
    demand_records: number;
    mobility_flows: number;
    cases: number;
  };
}
