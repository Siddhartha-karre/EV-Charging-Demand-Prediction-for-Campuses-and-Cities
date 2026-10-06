import math
import random
import datetime
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.models import (
    Zone,
    EVVehicle,
    ChargingStation,
    DemandDataset,
    DemandRecord,
    MobilityFlow,
)

CAMPUS_BASE_LAT = 37.4275
CAMPUS_BASE_LNG = -122.1697

CITY_BASE_LAT = 37.7749
CITY_BASE_LNG = -122.4194

def build_campus_zones() -> List[Dict[str, Any]]:
    """Builds 50 realistic campus zones."""
    zones = []
    # 1. Hostels / Student Residences (12)
    for i in range(1, 13):
        lat = CAMPUS_BASE_LAT - 0.006 + (i % 4) * 0.0018
        lng = CAMPUS_BASE_LNG - 0.005 + (i // 4) * 0.0020
        zones.append({
            "zone_id": f"Z-CMP-HST-{i:02d}",
            "name": f"Student Hostel Block {chr(64 + i)}",
            "zone_type": "hostel",
            "scope": "campus",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        })
    # 2. Academic Blocks & Labs (14)
    for i in range(1, 15):
        lat = CAMPUS_BASE_LAT + 0.002 + (i % 5) * 0.0015
        lng = CAMPUS_BASE_LNG - 0.004 + (i // 5) * 0.0022
        zones.append({
            "zone_id": f"Z-CMP-ACD-{i:02d}",
            "name": f"Academic Complex {i} (Eng & Science)",
            "zone_type": "academic_block",
            "scope": "campus",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        })
    # 3. Parking Lots & Decks (8)
    for i in range(1, 9):
        lat = CAMPUS_BASE_LAT + ((i % 3) - 1) * 0.004
        lng = CAMPUS_BASE_LNG + ((i // 3) - 1) * 0.0045
        zones.append({
            "zone_id": f"Z-CMP-PKG-{i:02d}",
            "name": f"Campus Parking Deck {chr(64 + i)}",
            "zone_type": "parking",
            "scope": "campus",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        })
    # 4. Libraries & Study Halls (4)
    lib_names = ["Central University Library", "Science & Engineering Library", "Graduate Research Archive", "Law & Humanities Commons"]
    for i, name in enumerate(lib_names, 1):
        zones.append({
            "zone_id": f"Z-CMP-LIB-{i:02d}",
            "name": name,
            "zone_type": "library",
            "scope": "campus",
            "lat": round(CAMPUS_BASE_LAT + 0.001 * i, 6),
            "lng": round(CAMPUS_BASE_LNG - 0.0015 * i, 6),
        })
    # 5. Canteens & Dining Halls (6)
    canteen_names = ["Central Dining Commons", "North Quad Bistro", "South Food Hall", "Tech Park Cafe", "Student Union Plaza", "Athletic Pavilion Cafe"]
    for i, name in enumerate(canteen_names, 1):
        zones.append({
            "zone_id": f"Z-CMP-CNT-{i:02d}",
            "name": name,
            "zone_type": "canteen",
            "scope": "campus",
            "lat": round(CAMPUS_BASE_LAT - 0.002 + 0.0012 * i, 6),
            "lng": round(CAMPUS_BASE_LNG + 0.0015 * (i % 3), 6),
        })
    # 6. Campus Gates & Interchanges (6)
    gate_names = ["Main North Gate", "South Transit Gate", "East University Blvd Gate", "West Athletic Gate", "Express Shuttle Interchange", "Service & Logistics Depot"]
    for i, name in enumerate(gate_names, 1):
        zones.append({
            "zone_id": f"Z-CMP-GTE-{i:02d}",
            "name": name,
            "zone_type": "gate",
            "scope": "campus",
            "lat": round(CAMPUS_BASE_LAT + 0.005 * math.cos(i * math.pi / 3), 6),
            "lng": round(CAMPUS_BASE_LNG + 0.006 * math.sin(i * math.pi / 3), 6),
        })
    return zones  # Total = 12 + 14 + 8 + 4 + 6 + 6 = 50 zones

def build_city_zones() -> List[Dict[str, Any]]:
    """Builds 100 realistic metropolitan city zones."""
    zones = []
    # 1. Residential Quarters (25)
    for i in range(1, 26):
        lat = CITY_BASE_LAT - 0.025 + (i % 5) * 0.008
        lng = CITY_BASE_LNG - 0.030 + (i // 5) * 0.009
        zones.append({
            "zone_id": f"Z-CTY-RES-{i:02d}",
            "name": f"Residential District {i}",
            "zone_type": "residential",
            "scope": "city",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        })
    # 2. Office & Financial Towers (25)
    for i in range(1, 26):
        lat = CITY_BASE_LAT + 0.005 + (i % 5) * 0.006
        lng = CITY_BASE_LNG - 0.010 + (i // 5) * 0.006
        zones.append({
            "zone_id": f"Z-CTY-OFC-{i:02d}",
            "name": f"Corporate Tower Cluster {i}",
            "zone_type": "office",
            "scope": "city",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        })
    # 3. Shopping Malls & Retail Centers (18)
    for i in range(1, 19):
        lat = CITY_BASE_LAT - 0.010 + (i % 6) * 0.007
        lng = CITY_BASE_LNG + 0.012 + (i // 6) * 0.008
        zones.append({
            "zone_id": f"Z-CTY-MAL-{i:02d}",
            "name": f"Commercial Plaza & Mall {i}",
            "zone_type": "mall",
            "scope": "city",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        })
    # 4. Transit Hubs & Train Stations (16)
    for i in range(1, 17):
        lat = CITY_BASE_LAT + 0.015 - (i % 4) * 0.010
        lng = CITY_BASE_LNG - 0.020 + (i // 4) * 0.012
        zones.append({
            "zone_id": f"Z-CTY-TRN-{i:02d}",
            "name": f"Metro & Transit Hub {i}",
            "zone_type": "transit_hub",
            "scope": "city",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        })
    # 5. Highway Entries & Arterial Nodes (16)
    for i in range(1, 17):
        angle = i * (2 * math.pi / 16)
        lat = CITY_BASE_LAT + 0.035 * math.cos(angle)
        lng = CITY_BASE_LNG + 0.040 * math.sin(angle)
        zones.append({
            "zone_id": f"Z-CTY-HWY-{i:02d}",
            "name": f"Highway Arterial Gateway {i}",
            "zone_type": "highway_entry",
            "scope": "city",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        })
    return zones  # Total = 25 + 25 + 18 + 16 + 16 = 100 zones

DEFAULT_ASSUMPTIONS = [
    {
        "assumption_id": "ASM-001",
        "category": "Fleet Dynamics",
        "statement": "EV adoption rate is parameterized at 22% of total active mobility population.",
        "rationale": "Aligned with municipal 2026 clean transport benchmarks."
    },
    {
        "assumption_id": "ASM-002",
        "category": "Diurnal Rhythm",
        "statement": "Campus class schedule imposes bimodal arrival peaks at 08:30-10:00 and 13:00-14:00.",
        "rationale": "Observed academic timetable synchronization."
    },
    {
        "assumption_id": "ASM-003",
        "category": "Metropolitan Commute",
        "statement": "City commute flows peak between 07:30-09:30 (inbound) and 17:00-19:30 (outbound).",
        "rationale": "Regional transportation authority origin-destination surveys."
    },
    {
        "assumption_id": "ASM-004",
        "category": "Charging Behavior",
        "statement": "Average battery capacity is 62.5 kWh; users plug in when state of charge drops below 50%.",
        "rationale": "Empirical EV driver range anxiety inflection curve."
    },
    {
        "assumption_id": "ASM-005",
        "category": "Data Provenance",
        "statement": "All records, flows, and metrics are deterministically generated and strictly tagged 'SYNTHETIC'.",
        "rationale": "Compliance with AI Studio verification and reproducibility protocol."
    }
]

def generate_phase2_synthetic_dataset(
    db: Session,
    scope: str = "campus",
    days: int = 90,
    noise_level: float = 0.15,
    seed: int = 42,
    dataset_name: str = "Standard Synthetic Baseline"
) -> Dict[str, Any]:
    """
    Executes Phase 2 Synthetic Data Generation.
    - Campus (~50 zones) or City (~100 zones)
    - Specified days at 1-hour resolution
    - DemandRecord and MobilityFlow generation
    - Seeded reproducibility: same seed gives identical records
    - Stores every assumption in DemandDataset.assumptions_json
    """
    random.seed(seed)

    # 1. Prepare Zones
    zone_defs = build_campus_zones() if scope == "campus" else build_city_zones()
    zone_count = len(zone_defs)

    # Upsert or ensure zones in DB
    existing_zone_ids = set([z[0] for z in db.query(Zone.zone_id).all()])
    for zd in zone_defs:
        if zd["zone_id"] not in existing_zone_ids:
            z = Zone(
                zone_id=zd["zone_id"],
                name=zd["name"],
                zone_type=zd["zone_type"],
                scope=zd["scope"],
                lat=zd["lat"],
                lng=zd["lng"],
                data_tag="SYNTHETIC"
            )
            db.add(z)
    db.commit()

    # 2. Generate EV Vehicles (if none exist for scope)
    veh_count = db.query(EVVehicle).count()
    if veh_count < 100:
        veh_types = [
            ("Sedan", 60.0),
            ("SUV", 82.0),
            ("Campus Shuttle", 100.0) if scope == "campus" else ("Delivery Van", 90.0),
            ("Compact EV", 42.0),
            ("Electric Scooter", 8.0) if scope == "campus" else ("Rideshare Sedan", 65.0)
        ]
        created_vehs = []
        for i in range(1, 301):
            vt, batt = random.choice(veh_types)
            hz = random.choice(zone_defs)["zone_id"]
            veh = EVVehicle(
                vehicle_id=f"EV-{scope.upper()[:3]}-{i:04d}",
                vehicle_type=vt,
                battery_kwh=batt,
                home_zone_id=hz,
                data_tag="SYNTHETIC"
            )
            created_vehs.append(veh)
        db.bulk_save_objects(created_vehs)
        db.commit()

    # 3. Create DemandDataset
    dataset_id = f"DS-{scope.upper()[:3]}-S{seed}-{int(datetime.datetime.utcnow().timestamp())}"
    params_dict = {
        "scope": scope,
        "days": days,
        "noise_level": noise_level,
        "seed": seed,
        "zones_count": zone_count,
        "hours_per_day": 24,
        "expected_rows": zone_count * days * 24
    }

    dataset = DemandDataset(
        dataset_id=dataset_id,
        scope=scope,
        is_synthetic=True,
        params_json=json.dumps(params_dict),
        assumptions_json=json.dumps(DEFAULT_ASSUMPTIONS),
        created_at=datetime.datetime.utcnow(),
        data_tag="SYNTHETIC"
    )
    db.add(dataset)
    db.commit()

    # 4. Generate DemandRecords
    # To optimize insertion speed and memory for large 90-day runs, we generate hourly records deterministically
    base_date = datetime.date(2026, 1, 1)  # Fixed reproducible reference epoch
    records = []
    rec_id_counter = 0

    # Hourly multipliers by zone type
    def get_zone_activity(ztype: str, hour: int, is_weekend: bool, is_holiday: bool) -> float:
        if is_holiday or is_weekend:
            if ztype in ["hostel", "residential"]:
                return 0.8 + 0.5 * math.sin((hour - 8) * math.pi / 14) if 8 <= hour <= 22 else 0.4
            elif ztype in ["canteen", "mall"]:
                return 1.4 * math.exp(-((hour - 14.5) ** 2) / 18.0) + 0.2
            elif ztype in ["academic_block", "office"]:
                return 0.15
            elif ztype in ["library"]:
                return 0.45 * math.exp(-((hour - 15) ** 2) / 20.0) + 0.1
            else:
                return 0.35
        else:
            # Weekday patterns
            if ztype == "academic_block":
                # Class peak 09:00 - 16:00
                return 1.6 * math.exp(-((hour - 10) ** 2) / 8.0) + 1.3 * math.exp(-((hour - 14.5) ** 2) / 7.0) + 0.1
            elif ztype == "office":
                # Office workday 08:30 - 18:00
                return 1.8 * math.exp(-((hour - 9) ** 2) / 7.0) + 1.2 * math.exp(-((hour - 14) ** 2) / 10.0) + 0.1
            elif ztype in ["gate", "transit_hub", "highway_entry"]:
                # Rush hours 08:00 and 17:30
                return 1.9 * math.exp(-((hour - 8.5) ** 2) / 4.0) + 2.0 * math.exp(-((hour - 17.5) ** 2) / 5.0) + 0.2
            elif ztype in ["canteen", "mall"]:
                # Lunch and evening peak
                return 1.7 * math.exp(-((hour - 12.5) ** 2) / 3.0) + 1.5 * math.exp(-((hour - 19.0) ** 2) / 6.0) + 0.1
            elif ztype in ["hostel", "residential"]:
                # Morning wake & evening return
                return 1.3 if (hour < 7 or hour > 19) else 0.5
            elif ztype == "library":
                return 1.4 * math.exp(-((hour - 15.0) ** 2) / 12.0) + 0.2
            elif ztype == "parking":
                return 1.5 * math.exp(-((hour - 9.0) ** 2) / 6.0) + 1.1 * math.exp(-((hour - 16.0) ** 2) / 8.0) + 0.2
            else:
                return 0.6

    BATCH_SIZE = 1500
    holidays = {5, 25, 45, 68, 82}  # Specific holiday offsets

    for d in range(days):
        cur_date = base_date + datetime.timedelta(days=d)
        is_weekend = cur_date.weekday() in (5, 6)
        is_holiday = d in holidays

        for hr in range(24):
            timestamp_str = f"{cur_date.isoformat()} {hr:02d}:00"

            for zd in zone_defs:
                rec_id_counter += 1
                base_act = get_zone_activity(zd["zone_type"], hr, is_weekend, is_holiday)
                
                # Deterministic noise with specified seed
                noise = random.gauss(0, noise_level)
                act_factor = max(0.05, base_act + noise)

                # Base capacity per zone
                base_cap = 60 if scope == "campus" else 150
                ev_count = max(0, int(base_cap * act_factor * 0.25))
                
                dwell_mins = round(min(480.0, max(20.0, 75.0 * (1.0 / max(0.3, act_factor)) + random.uniform(-10, 15))), 1)
                arrival_soc = round(min(85.0, max(15.0, 52.0 - 15.0 * act_factor + random.uniform(-4, 4))), 1)
                
                # Deterministic demand formula: EVs * (1 - SOC/100) * 18 kWh avg charging draw
                urgency = 0.70 if (7 <= hr <= 10 or 17 <= hr <= 20) else 0.40
                demand_kwh = round(ev_count * (1.0 - arrival_soc / 100.0) * 20.0 * urgency, 2)

                rec = DemandRecord(
                    record_id=f"REC-{rec_id_counter:08d}",
                    dataset_id=dataset_id,
                    zone_id=zd["zone_id"],
                    timestamp=timestamp_str,
                    ev_count_present=ev_count,
                    avg_dwell_minutes=dwell_mins,
                    avg_arrival_soc=arrival_soc,
                    demand_kwh=demand_kwh,
                    data_tag="SYNTHETIC"
                )
                records.append(rec)

                if len(records) >= BATCH_SIZE:
                    db.bulk_save_objects(records)
                    db.commit()
                    records = []

    if records:
        db.bulk_save_objects(records)
        db.commit()
        records = []

    # 5. Generate MobilityFlows for key zones
    flow_records = []
    flow_counter = 0
    # Create flows for sample day 1 (24 hours) for high-density OD pairs
    sample_zones = zone_defs[:15]
    for hr in range(24):
        timestamp_str = f"2026-01-01 {hr:02d}:00"
        for oz in sample_zones:
            for dz in sample_zones:
                if oz["zone_id"] == dz["zone_id"]:
                    continue
                flow_counter += 1
                o_type = oz["zone_type"]
                d_type = dz["zone_type"]
                # Morning flow toward office/academic
                weight = 1.0
                if 7 <= hr <= 9:
                    if o_type in ["hostel", "residential"] and d_type in ["academic_block", "office"]:
                        weight = 2.8
                elif 16 <= hr <= 19:
                    if o_type in ["academic_block", "office"] and d_type in ["hostel", "residential", "canteen"]:
                        weight = 2.5

                cnt = int(max(1, 15 * weight + random.randint(-2, 4)))
                mf = MobilityFlow(
                    flow_id=f"FLW-{flow_counter:07d}",
                    dataset_id=dataset_id,
                    timestamp=timestamp_str,
                    origin_zone_id=oz["zone_id"],
                    dest_zone_id=dz["zone_id"],
                    count=cnt,
                    data_tag="SYNTHETIC"
                )
                flow_records.append(mf)

    db.bulk_save_objects(flow_records)
    db.commit()

    return {
        "dataset_id": dataset_id,
        "scope": scope,
        "days": days,
        "noise_level": noise_level,
        "seed": seed,
        "zones_count": zone_count,
        "demand_records_count": rec_id_counter,
        "mobility_flows_count": flow_counter,
        "assumptions": DEFAULT_ASSUMPTIONS,
        "data_tag": "SYNTHETIC"
    }
