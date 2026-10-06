import {
  CaseDetail,
  CaseItem,
  ChargingStation,
  DemandDataset,
  DemandPredictionResult,
  InterpretationSummary,
  PersonaType,
  StationPlacementResult,
  SystemHealth,
  Zone,
} from '../types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchPersona(): Promise<{ active_persona: PersonaType }> {
  const res = await fetch(`${API_BASE}/persona`);
  if (!res.ok) throw new Error('Failed to fetch persona');
  return res.json();
}

export async function switchPersona(persona: PersonaType): Promise<{ active_persona: PersonaType }> {
  const res = await fetch(`${API_BASE}/persona/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona }),
  });
  if (!res.ok) throw new Error('Failed to switch persona');
  return res.json();
}

export async function fetchCases(assignedToMe: boolean = false): Promise<CaseItem[]> {
  const res = await fetch(`${API_BASE}/cases?assigned_to_me=${assignedToMe}`);
  if (!res.ok) throw new Error('Failed to fetch cases');
  return res.json();
}

export async function fetchCaseDetail(caseId: string): Promise<CaseDetail> {
  const res = await fetch(`${API_BASE}/cases/${caseId}`);
  if (!res.ok) throw new Error('Failed to fetch case detail');
  return res.json();
}

export async function createCase(data: {
  scope: 'campus' | 'city';
  selected_zones: string[];
  notes?: string;
  creator?: string;
}): Promise<CaseItem> {
  const res = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create case');
  return res.json();
}

export async function advanceCaseStage(caseId: string, actor: string, comments?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor, comments }),
  });
  if (!res.ok) throw new Error('Failed to advance case stage');
  return res.json();
}

export async function rejectCaseStage(caseId: string, actor: string, comments: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor, comments }),
  });
  if (!res.ok) throw new Error('Failed to reject case stage');
  return res.json();
}

export async function runAutomatedStep(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/run-automated-step`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to run automated step');
  return res.json();
}

export async function fetchZones(scope?: 'campus' | 'city'): Promise<Zone[]> {
  const url = scope ? `${API_BASE}/zones?scope=${scope}` : `${API_BASE}/zones`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch zones');
  return res.json();
}

export async function generateDataset(params: {
  scope: 'campus' | 'city';
  days: number;
  noise_level: number;
  seed: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to generate dataset');
  return res.json();
}

export async function fetchLatestDataset(scope?: 'campus' | 'city'): Promise<DemandDataset> {
  const url = scope ? `${API_BASE}/datasets/latest?scope=${scope}` : `${API_BASE}/datasets/latest`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch latest dataset');
  return res.json();
}

export async function trainDemandPrediction(params: {
  dataset_id: string;
  n_estimators?: number;
  learning_rate?: number;
  max_depth?: number;
  test_split_pct?: number;
}): Promise<DemandPredictionResult> {
  const res = await fetch(`${API_BASE}/demand-prediction/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to train demand prediction');
  return res.json();
}

export async function fetchLatestDemandPrediction(): Promise<DemandPredictionResult> {
  const res = await fetch(`${API_BASE}/demand-prediction/latest`);
  if (!res.ok) throw new Error('Failed to fetch demand prediction');
  return res.json();
}

export async function optimizePlacement(params: {
  top_n: number;
  algorithm: string;
  target_utilization: number;
  dataset_id?: string;
}): Promise<StationPlacementResult> {
  const res = await fetch(`${API_BASE}/station-placement/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to optimize station placement');
  return res.json();
}

export async function fetchLatestPlacement(): Promise<StationPlacementResult> {
  const res = await fetch(`${API_BASE}/station-placement/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest placement');
  return res.json();
}

export async function fetchStations(): Promise<ChargingStation[]> {
  const res = await fetch(`${API_BASE}/charging-stations`);
  if (!res.ok) throw new Error('Failed to fetch charging stations');
  return res.json();
}

export async function reviewStation(stationId: string, decision: 'approved' | 'rejected', comment?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/charging-stations/${stationId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, comment }),
  });
  if (!res.ok) throw new Error('Failed to review station');
  return res.json();
}

export async function fetchInterpretationSummary(): Promise<InterpretationSummary> {
  const res = await fetch(`${API_BASE}/result-interpretation/summary`);
  if (!res.ok) throw new Error('Failed to fetch interpretation summary');
  return res.json();
}
