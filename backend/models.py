import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from backend.database import Base

class Zone(Base):
    __tablename__ = "zones"

    zone_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    zone_type = Column(String(64), nullable=False)  # hostel, academic_block, parking, library, canteen, gate, residential, office, mall, transit_hub, highway_entry
    scope = Column(String(32), nullable=False, default="campus")  # campus | city
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    data_tag = Column(String(32), nullable=False, default="SYNTHETIC")

class EVVehicle(Base):
    __tablename__ = "ev_vehicles"

    vehicle_id = Column(String(64), primary_key=True, index=True)
    vehicle_type = Column(String(64), nullable=False, default="Sedan")  # Sedan, SUV, Campus Shuttle, Delivery Van, Two-Wheeler
    battery_kwh = Column(Float, nullable=False, default=60.0)
    home_zone_id = Column(String(64), ForeignKey("zones.zone_id"), nullable=False)
    data_tag = Column(String(32), nullable=False, default="SYNTHETIC")

class ChargingStation(Base):
    __tablename__ = "charging_stations"

    station_id = Column(String(64), primary_key=True, index=True)
    zone_id = Column(String(64), ForeignKey("zones.zone_id"), nullable=False)
    charger_type = Column(String(16), nullable=False, default="AC")  # AC | DC
    power_kw = Column(Float, nullable=False, default=22.0)
    num_chargers = Column(Integer, nullable=False, default=4)
    status = Column(String(32), nullable=False, default="proposed")  # proposed | approved | rejected
    data_tag = Column(String(32), nullable=False, default="SYNTHETIC")

class DemandDataset(Base):
    __tablename__ = "demand_datasets"

    dataset_id = Column(String(64), primary_key=True, index=True)
    scope = Column(String(32), nullable=False, default="campus")  # campus | city
    is_synthetic = Column(Boolean, nullable=False, default=True)
    params_json = Column(Text, nullable=False, default="{}")
    assumptions_json = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    data_tag = Column(String(32), nullable=False, default="SYNTHETIC")

class DemandRecord(Base):
    __tablename__ = "demand_records"

    record_id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(64), ForeignKey("demand_datasets.dataset_id"), nullable=False, index=True)
    zone_id = Column(String(64), ForeignKey("zones.zone_id"), nullable=False, index=True)
    timestamp = Column(String(32), nullable=False, index=True)  # ISO string or YYYY-MM-DD HH:00
    ev_count_present = Column(Integer, nullable=False, default=0)
    avg_dwell_minutes = Column(Float, nullable=False, default=60.0)
    avg_arrival_soc = Column(Float, nullable=False, default=45.0)  # 0 - 100 %
    demand_kwh = Column(Float, nullable=False, default=0.0)
    data_tag = Column(String(32), nullable=False, default="SYNTHETIC")

class MobilityFlow(Base):
    __tablename__ = "mobility_flows"

    flow_id = Column(String(64), primary_key=True, index=True)
    dataset_id = Column(String(64), ForeignKey("demand_datasets.dataset_id"), nullable=False, index=True)
    timestamp = Column(String(32), nullable=False, index=True)
    origin_zone_id = Column(String(64), ForeignKey("zones.zone_id"), nullable=False)
    dest_zone_id = Column(String(64), ForeignKey("zones.zone_id"), nullable=False)
    count = Column(Integer, nullable=False, default=0)
    data_tag = Column(String(32), nullable=False, default="SYNTHETIC")

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True, index=True)
    case_type = Column(String(64), nullable=False, default="EV Charging Station Placement")
    stage = Column(String(64), nullable=False, default="Request")
    # Stages: Request | Data Preparation | Demand Analysis | Site Evaluation | Approval | Resolution
    status = Column(String(32), nullable=False, default="Open")  # Open | In Progress | Pending Approval | Approved | Rejected | Resolved
    assigned_persona = Column(String(64), nullable=False, default="Data Scientist")
    # Personas: Data Scientist | Urban Mobility Analyst | City Infrastructure Planner | Application Control Agent
    scope = Column(String(32), nullable=False, default="campus")  # campus | city
    selected_zones_json = Column(Text, nullable=False, default="[]")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class CaseStageHistory(Base):
    __tablename__ = "case_stage_history"

    id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    from_stage = Column(String(64), nullable=False)
    to_stage = Column(String(64), nullable=False)
    actor = Column(String(64), nullable=False)
    action = Column(String(64), nullable=False)  # advance | reject | create | auto_step
    comments = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
