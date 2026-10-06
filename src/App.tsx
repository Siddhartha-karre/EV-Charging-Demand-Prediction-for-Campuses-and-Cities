import React, { useState, useEffect } from 'react';
import {
  CaseDetail,
  CaseItem,
  CaseStage,
  DemandDataset,
  DemandPredictionResult,
  InterpretationSummary,
  PersonaType,
  StationPlacementResult,
  SystemHealth,
  Zone,
} from './types';
import {
  fetchHealth,
  fetchPersona,
  switchPersona,
  fetchCases,
  fetchCaseDetail,
  createCase,
  advanceCaseStage,
  rejectCaseStage,
  runAutomatedStep,
  fetchZones,
  generateDataset,
  fetchLatestDataset,
  trainDemandPrediction,
  fetchLatestDemandPrediction,
  optimizePlacement,
  fetchLatestPlacement,
  reviewStation,
  fetchInterpretationSummary,
} from './services/api';
import { TopNav } from './components/TopNav';
import { CaseSpineView } from './components/CaseSpineView';
import { DataPrepStageView } from './components/DataPrepStageView';
import { DemandAnalysisStageView } from './components/DemandAnalysisStageView';
import { SiteEvaluationStageView } from './components/SiteEvaluationStageView';
import { ApprovalStageView } from './components/ApprovalStageView';
import { SyntheticBadge } from './components/SyntheticBadge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const PERSONAS: PersonaType[] = [
  'Data Scientist',
  'Urban Mobility Analyst',
  'City Infrastructure Planner',
  'Application Control Agent',
];

export default function App() {
  const [activePersona, setActivePersona] = useState<PersonaType>('Data Scientist');
  const [activeTab, setActiveTab] = useState<string>('cases');
  const [health, setHealth] = useState<SystemHealth | null>(null);

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<CaseDetail | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [filterAssignedToMe, setFilterAssignedToMe] = useState<boolean>(false);

  const [dataset, setDataset] = useState<DemandDataset | null>(null);
  const [predictionResult, setPredictionResult] = useState<DemandPredictionResult | null>(null);
  const [placementResult, setPlacementResult] = useState<StationPlacementResult | null>(null);
  const [summary, setSummary] = useState<InterpretationSummary | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial data load
  useEffect(() => {
    async function init() {
      try {
        const [h, p, cList, zList] = await Promise.all([
          fetchHealth().catch(() => null),
          fetchPersona().catch(() => ({ active_persona: 'Data Scientist' as PersonaType })),
          fetchCases().catch(() => []),
          fetchZones().catch(() => []),
        ]);

        if (h) setHealth(h);
        if (p?.active_persona) setActivePersona(p.active_persona);
        setCases(cList);
        setZones(zList);

        if (cList.length > 0) {
          const firstDetail = await fetchCaseDetail(cList[0].id).catch(() => null);
          if (firstDetail) setSelectedCaseDetail(firstDetail);
        }

        // Fetch datasets & predictions in background
        const [ds, pred, place, summ] = await Promise.all([
          fetchLatestDataset().catch(() => null),
          fetchLatestDemandPrediction().catch(() => null),
          fetchLatestPlacement().catch(() => null),
          fetchInterpretationSummary().catch(() => null),
        ]);

        if (ds) setDataset(ds);
        if (pred) setPredictionResult(pred);
        if (place) setPlacementResult(place);
        if (summ) setSummary(summ);
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  // Persona switch handler
  const handlePersonaChange = async (newPersona: PersonaType) => {
    try {
      await switchPersona(newPersona);
      setActivePersona(newPersona);
      showToast(`Switched persona to: ${newPersona}`);
      // Refresh worklist
      const updatedCases = await fetchCases(filterAssignedToMe);
      setCases(updatedCases);
    } catch (err) {
      console.error(err);
    }
  };

  // Case Selection
  const handleSelectCase = async (caseId: string) => {
    try {
      const detail = await fetchCaseDetail(caseId);
      setSelectedCaseDetail(detail);
    } catch (err) {
      console.error(err);
    }
  };

  // Create Case
  const handleCreateCase = async (data: {
    scope: 'campus' | 'city';
    selected_zones: string[];
    notes: string;
  }) => {
    try {
      const created = await createCase({
        ...data,
        creator: activePersona,
      });
      showToast(`Case ${created.id} created successfully.`);
      const updated = await fetchCases(filterAssignedToMe);
      setCases(updated);
      handleSelectCase(created.id);
    } catch (err: any) {
      alert(`Error creating case: ${err.message}`);
    }
  };

  // Advance Stage
  const handleAdvanceStage = async (caseId: string, comments?: string) => {
    try {
      const res = await advanceCaseStage(caseId, activePersona, comments);
      showToast(`Case advanced to stage: ${res.new_stage}`);
      const [updatedCases, detail] = await Promise.all([
        fetchCases(filterAssignedToMe),
        fetchCaseDetail(caseId),
      ]);
      setCases(updatedCases);
      setSelectedCaseDetail(detail);
    } catch (err: any) {
      alert(`Error advancing stage: ${err.message}`);
    }
  };

  // Reject Stage
  const handleRejectStage = async (caseId: string, comments: string) => {
    try {
      const res = await rejectCaseStage(caseId, activePersona, comments);
      showToast(`Case rejected back to: ${res.new_stage}`);
      const [updatedCases, detail] = await Promise.all([
        fetchCases(filterAssignedToMe),
        fetchCaseDetail(caseId),
      ]);
      setCases(updatedCases);
      setSelectedCaseDetail(detail);
    } catch (err: any) {
      alert(`Error rejecting stage: ${err.message}`);
    }
  };

  // Automated Step
  const handleRunAutomatedStep = async (caseId: string) => {
    try {
      setIsLoading(true);
      const res = await runAutomatedStep(caseId);
      showToast(`Automated step executed: ${res.action}`);
      const [updatedCases, detail] = await Promise.all([
        fetchCases(filterAssignedToMe),
        fetchCaseDetail(caseId),
      ]);
      setCases(updatedCases);
      setSelectedCaseDetail(detail);
    } catch (err: any) {
      alert(`Automated step error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to stage workspace tab
  const handleNavigateToStage = (stage: CaseStage) => {
    switch (stage) {
      case 'Data Preparation':
        setActiveTab('data_prep');
        break;
      case 'Demand Analysis':
        setActiveTab('demand');
        break;
      case 'Site Evaluation':
        setActiveTab('site_eval');
        break;
      case 'Approval':
      case 'Resolution':
        setActiveTab('approval');
        break;
      default:
        setActiveTab('cases');
    }
  };

  // Phase 2: Generate Dataset
  const handleGenerateDataset = async (params: {
    scope: 'campus' | 'city';
    days: number;
    noise_level: number;
    seed: number;
  }) => {
    try {
      setIsLoading(true);
      await generateDataset(params);
      showToast(`Synthetic dataset generated successfully (${params.days} days, seed ${params.seed}).`);
      const [latestDs, zList] = await Promise.all([
        fetchLatestDataset(params.scope),
        fetchZones(params.scope),
      ]);
      setDataset(latestDs);
      setZones(zList);
    } catch (err: any) {
      alert(`Dataset generation error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 3: Train Demand Prediction
  const handleTrainModel = async (params: { dataset_id: string }) => {
    try {
      setIsLoading(true);
      const res = await trainDemandPrediction(params);
      setPredictionResult(res);
      showToast(`Demand prediction model trained (MAE: ${res.models.lightgbm.mae})`);
    } catch (err: any) {
      alert(`Training error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 4: Optimize Placement
  const handleOptimizePlacement = async (params: {
    top_n: number;
    algorithm: string;
    target_utilization: number;
  }) => {
    try {
      setIsLoading(true);
      const res = await optimizePlacement({
        ...params,
        dataset_id: dataset?.dataset_id,
      });
      setPlacementResult(res);
      showToast(`Optimized top ${params.top_n} candidate charging sites (${res.coverage_pct}% coverage).`);
      // Refresh summary
      const summ = await fetchInterpretationSummary().catch(() => null);
      if (summ) setSummary(summ);
    } catch (err: any) {
      alert(`Placement optimization error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 5: Review Station
  const handleReviewStation = async (stationId: string, decision: 'approved' | 'rejected', comment: string) => {
    try {
      await reviewStation(stationId, decision, comment);
      showToast(`Station ${stationId} marked as ${decision.toUpperCase()}.`);
      // Refresh summary and cases
      const [summ, updatedCases] = await Promise.all([
        fetchInterpretationSummary(),
        fetchCases(filterAssignedToMe),
      ]);
      setSummary(summ);
      setCases(updatedCases);
      if (selectedCaseDetail) {
        handleSelectCase(selectedCaseDetail.case.id);
      }
    } catch (err: any) {
      alert(`Station review error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Bar Contract */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activePersona={activePersona}
        onPersonaChange={handlePersonaChange}
        personas={PERSONAS}
      />

      {/* Persona Context Sub-header Banner */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Operating Role:</span>
          <span className="font-semibold text-emerald-400">{activePersona}</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-slate-400">
            {activePersona === 'Data Scientist'
              ? 'Feature engineering, diurnal models & LightGBM demand training'
              : activePersona === 'Urban Mobility Analyst'
              ? 'Spatial flow centrality, dwell time & site recommendation'
              : activePersona === 'City Infrastructure Planner'
              ? 'Grid feeder constraints, candidate review & executive sign-off'
              : 'Autonomous background orchestration & invariant audit'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
          <span>Zones: <strong className="text-white">{zones.length}</strong></span>
          <span>Records: <strong className="text-white">{dataset?.total_demand_records.toLocaleString() || '0'}</strong></span>
          <span>Status: <strong className="text-emerald-400 font-bold">HEALTHY</strong></span>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs shadow-xl shadow-black/50 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Router */}
      <main className="flex-1 pb-12">
        {activeTab === 'cases' && (
          <CaseSpineView
            cases={cases}
            selectedCaseDetail={selectedCaseDetail}
            activePersona={activePersona}
            zones={zones}
            onSelectCase={handleSelectCase}
            onCreateCase={handleCreateCase}
            onAdvanceStage={handleAdvanceStage}
            onRejectStage={handleRejectStage}
            onRunAutomatedStep={handleRunAutomatedStep}
            onNavigateToStage={handleNavigateToStage}
            filterAssignedToMe={filterAssignedToMe}
            setFilterAssignedToMe={async (val) => {
              setFilterAssignedToMe(val);
              const updated = await fetchCases(val);
              setCases(updated);
            }}
          />
        )}

        {activeTab === 'data_prep' && (
          <DataPrepStageView
            dataset={dataset}
            activePersona={activePersona}
            onGenerateDataset={handleGenerateDataset}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'demand' && (
          <DemandAnalysisStageView
            predictionResult={predictionResult}
            datasetId={dataset?.dataset_id}
            onTrainModel={handleTrainModel}
            isLoading={isLoading}
            activePersona={activePersona}
          />
        )}

        {activeTab === 'site_eval' && (
          <SiteEvaluationStageView
            placementResult={placementResult}
            onOptimize={handleOptimizePlacement}
            isLoading={isLoading}
            activePersona={activePersona}
          />
        )}

        {activeTab === 'approval' && (
          <ApprovalStageView
            summary={summary}
            onReviewStation={handleReviewStation}
            activePersona={activePersona}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
