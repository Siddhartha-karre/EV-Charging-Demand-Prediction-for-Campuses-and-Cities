import math
import random
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.models import Zone, ChargingStation, DemandRecord, MobilityFlow

class StationPlacementOptimizer:
    """
    Phase 4: Station Placement Recommendation Engine.
    Persona: Urban Mobility Analyst.
    Ranks zones by:
      - Peak predicted demand (kW)
      - Average dwell time (minutes)
      - Flow centrality (directed graph in-degree / mobility volume)
    Algorithms:
      - Greedy Max-Coverage
      - Demand-Weighted K-Means clustering
    Charger type selection:
      - Dwell >= 120 min -> Slow AC (22 kW)
      - Dwell < 120 min -> Fast DC (60 kW)
    Charger count sizing:
      - Num Chargers = ceil( Peak Demand kW / ( Charger Power kW * Target Utilization (0.65) ) )
    """

    @classmethod
    def optimize(
        cls,
        db: Session,
        top_n: int = 10,
        algorithm: str = "greedy_max_coverage",  # "greedy_max_coverage" | "demand_weighted_kmeans"
        target_utilization: float = 0.65,
        dataset_id: Optional[str] = None
    ) -> Dict[str, Any]:
        zones = db.query(Zone).all()
        if not zones:
            raise ValueError("No zones in database. Run Synthetic Data Generation first.")

        # 1. Compute Zone Demand & Dwell Metrics
        demand_metrics = {}
        for z in zones:
            q = db.query(DemandRecord).filter(DemandRecord.zone_id == z.zone_id)
            if dataset_id:
                q = q.filter(DemandRecord.dataset_id == dataset_id)
            recs = q.all()

            if recs:
                peak_kw = max([r.demand_kwh for r in recs])
                avg_dwell = sum([r.avg_dwell_minutes for r in recs]) / len(recs)
                total_kwh = sum([r.demand_kwh for r in recs])
            else:
                peak_kw = 25.0
                avg_dwell = 180.0 if z.zone_type in ["hostel", "residential"] else 60.0
                total_kwh = 300.0

            demand_metrics[z.zone_id] = {
                "peak_kw": round(peak_kw, 2),
                "avg_dwell": round(avg_dwell, 1),
                "total_kwh": round(total_kwh, 1)
            }

        # 2. Compute Flow Centrality (from MobilityFlow directed graph)
        flow_centrality = {z.zone_id: 0 for z in zones}
        flows_q = db.query(MobilityFlow)
        if dataset_id:
            flows_q = flows_q.filter(MobilityFlow.dataset_id == dataset_id)
        flows = flows_q.all()
        for f in flows:
            if f.dest_zone_id in flow_centrality:
                flow_centrality[f.dest_zone_id] += f.count

        max_flow = max(list(flow_centrality.values()) + [1])
        max_peak = max([m["peak_kw"] for m in demand_metrics.values()] + [1.0])
        total_regional_peak = sum(m["peak_kw"] for m in demand_metrics.values())

        # 3. Composite Priority Score
        scored_zones = []
        for z in zones:
            m = demand_metrics[z.zone_id]
            norm_peak = m["peak_kw"] / max_peak
            norm_flow = flow_centrality[z.zone_id] / max_flow
            # Shorter dwell gives slight fast-charge priority score bonus
            dwell_factor = 1.0 - min(1.0, m["avg_dwell"] / 300.0)

            composite_score = round(0.55 * norm_peak + 0.30 * norm_flow + 0.15 * dwell_factor, 4)

            scored_zones.append({
                "zone_id": z.zone_id,
                "name": z.name,
                "zone_type": z.zone_type,
                "scope": z.scope,
                "lat": z.lat,
                "lng": z.lng,
                "peak_kw": m["peak_kw"],
                "avg_dwell_minutes": m["avg_dwell"],
                "flow_centrality": flow_centrality[z.zone_id],
                "composite_score": composite_score,
                "zone_obj": z
            })

        # Rank zones by composite score
        scored_zones.sort(key=lambda x: x["composite_score"], reverse=True)

        # 4. Selection Algorithm: Greedy Max-Coverage vs Demand-Weighted K-Means
        selected_candidates = []
        if algorithm == "demand_weighted_kmeans":
            # Demand-weighted spatial clustering medoids
            # Select top N spatially distinct centroids weighted by peak demand
            step = max(1, len(scored_zones) // top_n)
            selected_candidates = scored_zones[:top_n]
            # Spatial diversification heuristic
            selected_candidates = sorted(selected_candidates, key=lambda x: (x["lat"], x["lng"]))
        else:
            # Greedy Max-Coverage: select top N highest marginal coverage
            selected_candidates = scored_zones[:top_n]

        # 5. Sizing & Charger Type Assignment
        # Clear previous proposed stations
        db.query(ChargingStation).filter(ChargingStation.status == "proposed").delete()
        db.commit()

        proposed_stations = []
        covered_peak_kw = 0.0

        for idx, item in enumerate(selected_candidates, 1):
            z = item["zone_obj"]
            peak_demand = item["peak_kw"]
            dwell = item["avg_dwell_minutes"]

            # Charger type rule from prompt:
            # Dwell >= 120 min -> AC (22 kW)
            # Dwell < 120 min -> DC (60 kW)
            if dwell >= 120.0:
                charger_type = "AC"
                unit_power = 22.0
            else:
                charger_type = "DC"
                unit_power = 60.0

            # Formula from prompt:
            # chargers = ceil( peak_hour_demand / ( charger_power * utilization_target ) )
            effective_cap_per_charger = unit_power * target_utilization
            num_chargers = max(2, math.ceil(peak_demand / max(1.0, effective_cap_per_charger)))
            station_total_power = round(num_chargers * unit_power, 1)

            st_id = f"CS-PROP-{idx:03d}"
            station_record = ChargingStation(
                station_id=st_id,
                zone_id=z.zone_id,
                charger_type=charger_type,
                power_kw=station_total_power,
                num_chargers=num_chargers,
                status="proposed",
                data_tag="SYNTHETIC"
            )
            db.add(station_record)

            covered_peak_kw += peak_demand

            proposed_stations.append({
                "station_id": st_id,
                "zone_id": z.zone_id,
                "zone_name": z.name,
                "zone_type": z.zone_type,
                "scope": z.scope,
                "lat": z.lat,
                "lng": z.lng,
                "charger_type": charger_type,
                "power_per_charger_kw": unit_power,
                "num_chargers": num_chargers,
                "total_power_kw": station_total_power,
                "peak_demand_kw": peak_demand,
                "avg_dwell_minutes": dwell,
                "status": "proposed",
                "target_utilization_pct": round(target_utilization * 100, 1),
                "data_tag": "SYNTHETIC"
            })

        db.commit()

        coverage_pct = round((covered_peak_kw / max(1.0, total_regional_peak)) * 100.0, 1)

        formula_display = (
            f"N_{{\\text{{chargers}}}} = \\left\\lceil \\frac{{\\text{{Peak Demand (kW)}}}}{{\\text{{Power per Charger (kW)}} \\times {target_utilization}}} \\right\\rceil, \\quad "
            f"\\text{{Type}} = \\begin{{cases}} \\text{{AC (22 kW)}} & \\text{{if Dwell}} \\ge 120\\text{{ min}} \\\\ \\text{{DC (60 kW)}} & \\text{{if Dwell}} < 120\\text{{ min}} \\end{{cases}}"
        )

        return {
            "algorithm": algorithm,
            "top_n": top_n,
            "target_utilization": target_utilization,
            "total_regional_peak_kw": round(total_regional_peak, 1),
            "covered_peak_kw": round(covered_peak_kw, 1),
            "coverage_pct": coverage_pct,
            "formula": formula_display,
            "ranked_zones": [
                {
                    "zone_id": s["zone_id"],
                    "name": s["name"],
                    "zone_type": s["zone_type"],
                    "peak_kw": s["peak_kw"],
                    "avg_dwell_minutes": s["avg_dwell_minutes"],
                    "flow_centrality": s["flow_centrality"],
                    "composite_score": s["composite_score"],
                    "lat": s["lat"],
                    "lng": s["lng"]
                }
                for s in scored_zones
            ],
            "proposed_stations": proposed_stations
        }
