import os
import json
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from backend.database import engine, Base, get_db
from backend.models import (
    Zone,
    EVVehicle,
    ChargingStation,
    DemandDataset,
    DemandRecord,
    MobilityFlow,
    Case,
    CaseStageHistory,
)
from backend.orchestrator import CaseSpineOrchestrator, STAGES_ORDER
from backend.synthetic_generator import generate_phase2_synthetic_dataset, build_campus_zones, build_city_zones
from backend.ml_engine import DemandAnalysisEngine
from backend.placement_optimizer import StationPlacementOptimizer

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EV Charging Demand Prediction & Station Placement API",
    description="Pega Blueprint BP-2538779-2 Foundation, Case Spine, Synthetic Data, ML Demand, and Placement Recommendation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ACTIVE_SESSION = {
    "active_persona": "Data Scientist",
    "last_ml_results": None,
    "last_placement_results": None,
}

class CreateCaseRequest(BaseModel):
    scope: str = "campus"
    selected_zones: List[str] = []
    notes: Optional[str] = ""
    creator: Optional[str] = "Data Scientist"

class AdvanceCaseRequest(BaseModel):
    actor: str = "Data Scientist"
    comments: Optional[str] = "Stage objectives satisfied."

class RejectCaseRequest(BaseModel):
    actor: str = "City Infrastructure Planner"
    comments: str = "Insufficient coverage or grid headroom issues identified."

class GenerateDatasetRequest(BaseModel):
    scope: str = "campus"
    days: int = 14
    noise_level: float = 0.15
    seed: int = 42

class TrainMLRequest(BaseModel):
    dataset_id: str
    n_estimators: int = 100
    learning_rate: float = 0.08
    max_depth: int = 5
    test_split_pct: float = 0.20

class OptimizePlacementRequest(BaseModel):
    top_n: int = 10
    algorithm: str = "greedy_max_coverage"  # "greedy_max_coverage" | "demand_weighted_kmeans"
    target_utilization: float = 0.65
    dataset_id: Optional[str] = None

@app.on_event("startup")
def seed_dev_database():
    db = next(get_db())
    # 1. Seed Zones
    if db.query(Zone).count() == 0:
        campus_zones = build_campus_zones()
        city_zones = build_city_zones()
        all_zones = [
            Zone(
                zone_id=zd["zone_id"],
                name=zd["name"],
                zone_type=zd["zone_type"],
                scope=zd["scope"],
                lat=zd["lat"],
                lng=zd["lng"],
                data_tag="SYNTHETIC"
            )
            for zd in campus_zones + city_zones
        ]
        db.bulk_save_objects(all_zones)
        db.commit()

    # 2. Seed initial synthetic dataset (7 days for quick startup)
    if db.query(DemandDataset).count() == 0:
        generate_phase2_synthetic_dataset(db, scope="campus", days=7, seed=42)

    # 3. Seed initial master case
    if db.query(Case).count() == 0:
        CaseSpineOrchestrator.create_case(
            db,
            scope="campus",
            selected_zones=[],
            notes="Pilot EV deployment assessment for university tech campus",
            creator="Data Scientist"
        )

# -------------------------------------------------------------
# Phase 0: Health & Persona Switcher
# -------------------------------------------------------------
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    return {
        "status": "HEALTHY",
        "blueprint_reference": "Pega Blueprint BP-2538779-2",
        "data_label": "SYNTHETIC",
        "active_persona": ACTIVE_SESSION["active_persona"],
        "counts": {
            "zones": db.query(Zone).count(),
            "ev_vehicles": db.query(EVVehicle).count(),
            "charging_stations": db.query(ChargingStation).count(),
            "demand_datasets": db.query(DemandDataset).count(),
            "demand_records": db.query(DemandRecord).count(),
            "mobility_flows": db.query(MobilityFlow).count(),
            "cases": db.query(Case).count(),
        }
    }

@app.get("/api/persona")
def get_active_persona():
    return {"active_persona": ACTIVE_SESSION["active_persona"]}

@app.post("/api/persona/switch")
def switch_persona(payload: Dict[str, str]):
    persona = payload.get("persona")
    valid = ["Data Scientist", "Urban Mobility Analyst", "City Infrastructure Planner", "Application Control Agent"]
    if persona not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid persona. Choose from {valid}")
    ACTIVE_SESSION["active_persona"] = persona
    return {"status": "SUCCESS", "active_persona": persona}

# -------------------------------------------------------------
# Phase 1: Master Case Spine Endpoints
# -------------------------------------------------------------
@app.get("/api/cases")
def list_cases(assigned_to_me: bool = False, db: Session = Depends(get_db)):
    query = db.query(Case).order_by(Case.created_at.desc())
    if assigned_to_me:
        query = query.filter(Case.assigned_persona == ACTIVE_SESSION["active_persona"])
    cases = query.all()
    return [
        {
            "id": c.id,
            "case_type": c.case_type,
            "stage": c.stage,
            "status": c.status,
            "assigned_persona": c.assigned_persona,
            "scope": c.scope,
            "selected_zones": json.loads(c.selected_zones_json),
            "notes": c.notes,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in cases
    ]

@app.post("/api/cases")
def create_case(req: CreateCaseRequest, db: Session = Depends(get_db)):
    c = CaseSpineOrchestrator.create_case(
        db,
        scope=req.scope,
        selected_zones=req.selected_zones,
        notes=req.notes or "",
        creator=req.creator or ACTIVE_SESSION["active_persona"]
    )
    return {
        "id": c.id,
        "case_type": c.case_type,
        "stage": c.stage,
        "status": c.status,
        "assigned_persona": c.assigned_persona,
        "scope": c.scope,
        "notes": c.notes
    }

@app.get("/api/cases/{case_id}")
def get_case_detail(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    history = (
        db.query(CaseStageHistory)
        .filter(CaseStageHistory.case_id == case_id)
        .order_by(CaseStageHistory.timestamp.asc())
        .all()
    )
    return {
        "case": {
            "id": case.id,
            "case_type": case.case_type,
            "stage": case.stage,
            "status": case.status,
            "assigned_persona": case.assigned_persona,
            "scope": case.scope,
            "selected_zones": json.loads(case.selected_zones_json),
            "notes": case.notes,
            "stages_order": STAGES_ORDER,
            "created_at": case.created_at.isoformat() if case.created_at else None,
            "updated_at": case.updated_at.isoformat() if case.updated_at else None,
        },
        "history": [
            {
                "id": h.id,
                "from_stage": h.from_stage,
                "to_stage": h.to_stage,
                "actor": h.actor,
                "action": h.action,
                "comments": h.comments,
                "timestamp": h.timestamp.isoformat() if h.timestamp else None,
            }
            for h in history
        ]
    }

@app.post("/api/cases/{case_id}/advance")
def advance_case_stage(case_id: str, req: AdvanceCaseRequest, db: Session = Depends(get_db)):
    c = CaseSpineOrchestrator.advance_case(db, case_id=case_id, actor=req.actor, comments=req.comments)
    return {"status": "ADVANCED", "case_id": c.id, "new_stage": c.stage, "assigned_persona": c.assigned_persona}

@app.post("/api/cases/{case_id}/reject")
def reject_case_stage(case_id: str, req: RejectCaseRequest, db: Session = Depends(get_db)):
    c = CaseSpineOrchestrator.reject_case(db, case_id=case_id, actor=req.actor, comments=req.comments)
    return {"status": "REJECTED_TO_PRIOR", "case_id": c.id, "new_stage": c.stage, "assigned_persona": c.assigned_persona}

@app.post("/api/cases/{case_id}/run-automated-step")
def run_case_automated_step(case_id: str, db: Session = Depends(get_db)):
    return CaseSpineOrchestrator.run_automated_step(db, case_id=case_id, agent_name="Application Control Agent")

# -------------------------------------------------------------
# Phase 2: Synthetic Data Endpoints
# -------------------------------------------------------------
@app.get("/api/zones")
def list_zones(scope: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Zone)
    if scope:
        query = query.filter(Zone.scope == scope)
    zones = query.all()
    return [
        {
            "zone_id": z.zone_id,
            "name": z.name,
            "zone_type": z.zone_type,
            "scope": z.scope,
            "lat": z.lat,
            "lng": z.lng,
            "data_tag": z.data_tag
        }
        for z in zones
    ]

@app.post("/api/datasets/generate")
def trigger_generate_dataset(req: GenerateDatasetRequest, db: Session = Depends(get_db)):
    return generate_phase2_synthetic_dataset(
        db=db,
        scope=req.scope,
        days=req.days,
        noise_level=req.noise_level,
        seed=req.seed
    )

@app.get("/api/datasets/latest")
def get_latest_dataset(scope: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(DemandDataset).order_by(DemandDataset.created_at.desc())
    if scope:
        query = query.filter(DemandDataset.scope == scope)
    ds = query.first()
    if not ds:
        raise HTTPException(status_code=404, detail="No dataset found")

    rec_count = db.query(DemandRecord).filter(DemandRecord.dataset_id == ds.dataset_id).count()
    flow_count = db.query(MobilityFlow).filter(MobilityFlow.dataset_id == ds.dataset_id).count()

    sample_records = (
        db.query(DemandRecord)
        .filter(DemandRecord.dataset_id == ds.dataset_id)
        .limit(24)
        .all()
    )

    return {
        "dataset_id": ds.dataset_id,
        "scope": ds.scope,
        "is_synthetic": ds.is_synthetic,
        "data_tag": ds.data_tag,
        "created_at": ds.created_at.isoformat() if ds.created_at else None,
        "params": json.loads(ds.params_json),
        "assumptions": json.loads(ds.assumptions_json),
        "total_demand_records": rec_count,
        "total_mobility_flows": flow_count,
        "sample_records": [
            {
                "record_id": r.record_id,
                "zone_id": r.zone_id,
                "timestamp": r.timestamp,
                "ev_count_present": r.ev_count_present,
                "avg_dwell_minutes": r.avg_dwell_minutes,
                "avg_arrival_soc": r.avg_arrival_soc,
                "demand_kwh": r.demand_kwh,
                "data_tag": r.data_tag
            }
            for r in sample_records
        ]
    }

# -------------------------------------------------------------
# Phase 3: Demand Prediction Endpoints
# -------------------------------------------------------------
@app.post("/api/demand-prediction/train")
def train_demand_prediction(req: TrainMLRequest, db: Session = Depends(get_db)):
    res = DemandAnalysisEngine.train_and_evaluate(
        db=db,
        dataset_id=req.dataset_id,
        n_estimators=req.n_estimators,
        learning_rate=req.learning_rate,
        max_depth=req.max_depth,
        test_split_pct=req.test_split_pct
    )
    ACTIVE_SESSION["last_ml_results"] = res
    return res

@app.get("/api/demand-prediction/latest")
def get_latest_demand_prediction(db: Session = Depends(get_db)):
    if ACTIVE_SESSION["last_ml_results"]:
        return ACTIVE_SESSION["last_ml_results"]
    latest_ds = db.query(DemandDataset).order_by(DemandDataset.created_at.desc()).first()
    if not latest_ds:
        raise HTTPException(status_code=400, detail="No dataset found. Generate synthetic data first.")
    res = DemandAnalysisEngine.train_and_evaluate(db, dataset_id=latest_ds.dataset_id)
    ACTIVE_SESSION["last_ml_results"] = res
    return res

# -------------------------------------------------------------
# Phase 4: Station Placement Recommendation Endpoints
# -------------------------------------------------------------
@app.post("/api/station-placement/optimize")
def optimize_placement(req: OptimizePlacementRequest, db: Session = Depends(get_db)):
    res = StationPlacementOptimizer.optimize(
        db=db,
        top_n=req.top_n,
        algorithm=req.algorithm,
        target_utilization=req.target_utilization,
        dataset_id=req.dataset_id
    )
    ACTIVE_SESSION["last_placement_results"] = res
    return res

@app.get("/api/station-placement/latest")
def get_latest_placement(db: Session = Depends(get_db)):
    if ACTIVE_SESSION["last_placement_results"]:
        return ACTIVE_SESSION["last_placement_results"]
    res = StationPlacementOptimizer.optimize(db)
    ACTIVE_SESSION["last_placement_results"] = res
    return res

@app.get("/api/charging-stations")
def list_stations(db: Session = Depends(get_db)):
    stations = db.query(ChargingStation).all()
    return [
        {
            "station_id": s.station_id,
            "zone_id": s.zone_id,
            "charger_type": s.charger_type,
            "power_kw": s.power_kw,
            "num_chargers": s.num_chargers,
            "status": s.status,
            "data_tag": s.data_tag
        }
        for s in stations
    ]

@app.get("/api/mobility-flows")
def list_flows(dataset_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MobilityFlow)
    if dataset_id:
        query = query.filter(MobilityFlow.dataset_id == dataset_id)
    flows = query.limit(50).all()
    return [
        {
            "flow_id": f.flow_id,
            "timestamp": f.timestamp,
            "origin_zone_id": f.origin_zone_id,
            "dest_zone_id": f.dest_zone_id,
            "count": f.count,
            "data_tag": f.data_tag
        }
        for f in flows
    ]

# -------------------------------------------------------------
# Phase 5: Result Interpretation & Executive Approval Endpoints
# -------------------------------------------------------------
class ReviewStationRequest(BaseModel):
    decision: str  # "approved" | "rejected"
    comment: Optional[str] = ""

@app.post("/api/charging-stations/{station_id}/review")
def review_station(station_id: str, req: ReviewStationRequest, db: Session = Depends(get_db)):
    st = db.query(ChargingStation).filter(ChargingStation.station_id == station_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Charging station not found")

    st.status = "approved" if req.decision == "approved" else "rejected"
    db.commit()

    # If any active case is at Approval stage and has all proposed reviewed, advance to Resolution
    active_case = db.query(Case).filter(Case.stage == "Approval").first()
    if active_case:
        CaseSpineOrchestrator.log_history(
            db,
            case_id=active_case.id,
            from_stage="Approval",
            to_stage="Approval",
            actor=ACTIVE_SESSION["active_persona"],
            action=f"station_{req.decision}",
            comments=f"Station {station_id} {req.decision}. Notes: {req.comment}"
        )
        # Check if all stations reviewed
        remaining_proposed = db.query(ChargingStation).filter(ChargingStation.status == "proposed").count()
        if remaining_proposed == 0:
            CaseSpineOrchestrator.advance_case(
                db,
                case_id=active_case.id,
                actor=ACTIVE_SESSION["active_persona"],
                comments="All candidate stations reviewed. Advancing case to Resolution."
            )

    return {"status": "SUCCESS", "station_id": station_id, "new_status": st.status}

@app.get("/api/result-interpretation/summary")
def get_interpretation_summary(db: Session = Depends(get_db)):
    from backend.interpretation_engine import ResultInterpretationEngine
    res = ResultInterpretationEngine.generate_summary(
        db,
        ml_results=ACTIVE_SESSION.get("last_ml_results"),
        placement_results=ACTIVE_SESSION.get("last_placement_results")
    )
    return res

