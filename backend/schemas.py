from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class ZoneSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    zone_id: str
    name: str
    category: str
    area_sq_km: float
    center_lat: float
    center_lng: float
    polygon_geojson: Optional[str] = None
    parking_capacity: int
    grid_power_capacity_kw: float
    existing_chargers_kw: float
    data_tag: str

class EVVehicleSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    vehicle_id: str
    vehicle_model: str
    battery_capacity_kwh: float
    current_soc_pct: float
    charge_rate_max_kw: float
    arrival_zone_id: str
    arrival_hour: int
    dwell_time_hours: float
    energy_needed_kwh: float
    data_tag: str

class ChargingStationSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    station_id: str
    zone_id: str
    station_name: str
    lat: float
    lng: float
    ports_level2: int
    ports_dcfc: int
    total_power_kw: float
    status: str
    estimated_capex_usd: float
    expected_daily_utilization_pct: float
    data_tag: str

class DemandDatasetSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    dataset_id: str
    name: str
    version: str
    created_at: Any
    data_source: str
    data_tag: str
    total_records: int
    feature_metadata_json: Optional[str] = None

class HourlyDemandRecordSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    record_id: str
    dataset_id: str
    zone_id: str
    date_str: str
    hour_of_day: int
    day_of_week: int
    temperature_c: float
    is_weekend: bool
    parking_occupancy_pct: float
    incoming_flow_vehicles: int
    ev_share_pct: float
    actual_demand_kwh: float
    predicted_demand_kwh: Optional[float] = None
    data_tag: str

class MobilityFlowSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    flow_id: str
    origin_zone_id: str
    destination_zone_id: str
    hour_of_day: int
    vehicle_volume: int
    ev_volume: int
    data_tag: str

class MasterCaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    case_id: str
    title: str
    blueprint_id: str
    scenario_name: str
    persona_in_charge: str
    current_stage: str
    workflow_state: str
    status: str
    budget_usd: float
    target_deficit_reduction_pct: float
    created_at: Any
    updated_at: Any
    notes: Optional[str] = None

class AuditLogSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    log_id: str
    case_id: str
    timestamp: Any
    actor: str
    workflow_name: str
    action: str
    details_json: Optional[str] = None

class GenerateSyntheticDataRequest(BaseModel):
    scenario: str = "University Tech Campus"  # or "Metropolitan City Center"
    days: int = 14
    ev_adoption_rate: float = 0.22  # 22%
    num_vehicles: int = 650
    random_seed: int = 42

class TrainDemandModelRequest(BaseModel):
    dataset_id: str
    model_type: str = "LightGBM / GBDT Regressor"  # or "Ridge Linear Baseline"
    learning_rate: float = 0.08
    n_estimators: int = 80
    max_depth: int = 5
    test_split_pct: float = 0.20

class OptimizePlacementRequest(BaseModel):
    budget_usd: float = 250000.0
    l2_port_cost: float = 6500.0
    dcfc_port_cost: float = 48000.0
    min_station_spacing_km: float = 0.4
    target_coverage_pct: float = 85.0
    weight_unmet_deficit: float = 0.50
    weight_mobility_inflow: float = 0.30
    weight_grid_headroom: float = 0.20
