# Pega Blueprint BP-2538779-2 Assumptions & Specifications

## Project Overview
- **Project**: EV Charging Demand Prediction for Campuses and Cities
- **Blueprint Reference**: Pega Blueprint BP-2538779-2
- **Master Case Type**: EV Charging Station Placement (`CASE-EV-PLCMNT`)

---

## 1. Personas & Access Profiles

1. **Data Scientist (`ROLE_DATA_SCIENTIST`)**:
   - Focus: Synthetic data generation parameters, distribution curves, feature engineering, ML model hyperparameter tuning, model performance metrics ($R^2$, RMSE, MAE), LightGBM/GBDT tree depth, mobility correlation factors.
   - Access: Synthetic Data Generation workflow, Demand Prediction model configuration, ML diagnostics.

2. **Urban Mobility Analyst (`ROLE_MOBILITY_ANALYST`)**:
   - Focus: Spatial demand heatmaps, hourly zone flow analysis, origin-destination mobility matrices, commuter peak-load dynamics, EV adoption growth rate simulations.
   - Access: Mobility flow inspection, spatial zone metrics, demand curves by hour and day-of-week.

3. **City Infrastructure Planner (`ROLE_INFRA_PLANNER`)**:
   - Focus: Station placement recommendations, grid capacity constraints (kW / MVA), budget allocations, Level 2 vs DC Fast Charger mix, payback period, spatial coverage ratio.
   - Access: Station Placement Recommendation workflow, Candidate site approval, budget & constraint adjustment, final placement plan sign-off.

4. **Application Control Agent (`ACTOR_SYS_AGENT`)**:
   - Focus: Automated orchestration actor (non-human autonomous system agent).
   - Responsibilities: Triggers scheduled batch forecasts, validates data schema invariants, executes constraint-satisfaction placement algorithms, runs automated interpretation rules, records audit trails.

---

## 2. Core Data Objects

1. **Zone (`Zone`)**:
   - `zone_id`: Unique identifier (e.g., `ZN-CAMPUS-NORTH`, `ZN-DOWNTOWN-CORE`).
   - `name`: Human-readable zone name.
   - `category`: `Campus Core`, `Research & Tech Park`, `Residential Quad`, `Downtown Commercial`, `Transit Interchange`, `Medical Center`.
   - `area_sq_km`: Spatial area in square kilometers.
   - `center_lat`, `center_lng`: Geographic coordinates.
   - `polygon_geojson`: GeoJSON boundary coordinates.
   - `parking_capacity`: Total vehicle parking bays.
   - `grid_power_capacity_kw`: Maximum electric feeder capacity available for EV infrastructure.
   - `existing_chargers_kw`: Total installed capacity of existing chargers.
   - `data_tag`: Explicitly labeled `SYNTHETIC` (or `VERIFIED_REAL` on manual upload).

2. **EV Vehicle (`EVVehicle`)**:
   - `vehicle_id`: Unique simulated vehicle identifier.
   - `battery_capacity_kwh`: Battery pack size (35 kWh - 100 kWh).
   - `current_soc_pct`: State of Charge percentage (0-100%).
   - `charge_rate_max_kw`: Maximum accepted charging power (7.4 kW AC to 250 kW DC).
   - `arrival_zone_id`, `arrival_hour`: Simulated arrival time and zone.
   - `dwell_time_hours`: Parked duration before next trip.
   - `energy_needed_kwh`: Required charge energy to reach target SOC (80%).
   - `data_tag`: `SYNTHETIC`.

3. **Charging Station (`ChargingStation`)**:
   - `station_id`: Identifier (e.g., `CS-0104`).
   - `zone_id`: Target deployment zone.
   - `station_name`: Descriptive site name.
   - `lat`, `lng`: Exact site coordinates.
   - `ports_level2`: Number of Level 2 AC ports (7.2 kW - 11 kW).
   - `ports_dcfc`: Number of DC Fast Charge ports (50 kW - 150 kW).
   - `total_power_kw`: Installed electrical power.
   - `status`: `EXISTING`, `RECOMMENDED_TIER_1`, `RECOMMENDED_TIER_2`, `PLANNED`.
   - `estimated_capex_usd`: Capital expenditure for installation.
   - `expected_daily_utilization_pct`: Forecasted utilization percentage.
   - `data_tag`: `SYNTHETIC`.

4. **Demand Dataset (`DemandDataset`)**:
   - `dataset_id`: Unique dataset identifier.
   - `version`: Version string (e.g., `v1.2-SYNTH`).
   - `created_at`: Timestamp of generation or upload.
   - `data_source`: `SYNTHETIC_GENERATOR` or `USER_CSV_UPLOAD`.
   - `data_tag`: `SYNTHETIC` (or `REAL`).
   - `total_records`: Hourly zone observations count.
   - `features`: `[hour_of_day, day_of_week, temperature_c, is_weekend, zone_parking_occ_pct, incoming_flow_vehicles, ev_share_pct]`.
   - `target`: `demand_kwh`.

5. **Mobility Flow (`MobilityFlow`)**:
   - `flow_id`: Flow identifier.
   - `origin_zone_id`, `destination_zone_id`: Zone pair.
   - `hour_of_day`: 0 through 23.
   - `vehicle_volume`: Estimated vehicle count per hour.
   - `ev_volume`: Estimated EV subset volume based on regional adoption rate.
   - `data_tag`: `SYNTHETIC`.

---

## 3. Workflows & Stages (Master Case Orchestration)

The master case **"EV Charging Station Placement" (`CASE-EV-PLCMNT`)** orchestrates 4 sub-workflows:

### Workflow 1: Synthetic Data Generation
- **Stage 1 - Parameterization**: Define campus/city scale (zones, vehicles, time span 7-90 days, EV adoption rate 8%-35%, diurnal curve profiles).
- **Stage 2 - Generation Engine**: Execute Poisson/Gaussian arrival models + Monte Carlo battery depletion to simulate realistic charging demand and mobility flow.
- **Stage 3 - Validation & Labeling**: Check schema invariants, tag all entities as `SYNTHETIC`, commit to SQLite database.

### Workflow 2: Demand Prediction
- **Stage 1 - Feature Engineering**: Lagged features ($t-1, t-24$), cyclic hour encodings ($\sin/\cos$), zone density interactions.
- **Stage 2 - Model Training & Evaluation**: Train LightGBM / Gradient Boosted Trees and Ridge Regression baselines. Compute $R^2$, RMSE, MAE.
- **Stage 3 - Spatial-Temporal Hourly Inference**: Output 24-hour demand forecasts per zone (kWh and concurrent charging sessions).

### Workflow 3: Station Placement Recommendation
- **Stage 1 - Deficit & Density Scoring**: Calculate unmet demand = $\max(0, \text{Peak Demand kW} - \text{Existing Capacity kW})$.
- **Stage 2 - Constrained Optimization**: Formulate candidate placement using Maximal Covering Location Problem (MCLP) subject to grid transformer limits, budget ceiling, and minimum spacing.
- **Stage 3 - Specification & Port Mix**: Allocate Level 2 vs DC Fast charging ports and compute CapEx & utilization ROI.

### Workflow 4: Result Interpretation
- **Stage 1 - Explainability & Feature Importance**: SHAP-style importance ranking (e.g., Hour of day, Parking occupancy, Grid capacity).
- **Stage 2 - Bottleneck Analysis**: Identify grid capacity overloads and uncovered commuter corridors.
- **Stage 3 - Executive Sign-Off**: Automated synthesis report for City Planner approval.

---

## 4. Mathematical Models & Explicit Formulas

All numbers shown in the UI are strictly computed by the backend using these deterministic formulas:

1. **Hourly Demand Model**:
   $$\text{Demand}_{z, t} = N_{z, t}^{\text{EV}} \times \left(1 - \text{SOC}_{\text{avg}}\right) \times C_{\text{battery}} \times \alpha_{\text{plug-in}}(t)$$
   where $\alpha_{\text{plug-in}}(t)$ is the diurnal urgency coefficient peaking at morning commute (08:00-09:30) and evening dwell (17:00-19:30).

2. **LightGBM / Regressor Model Objective**:
   $$\mathcal{L} = \frac{1}{N} \sum_{i=1}^N \left(y_i - \hat{y}_i\right)^2 + \lambda_1 \|\mathbf{w}\|_1 + \frac{\lambda_2}{2} \|\mathbf{w}\|_2^2$$

3. **Placement Priority Score ($S_z$)**:
   $$S_z = w_1 \cdot \frac{\text{Unmet Peak kW}_z}{\max_k(\text{Unmet kW}_k)} + w_2 \cdot \frac{\text{Mobility Inflow}_z}{\max_k(\text{Flow}_k)} + w_3 \cdot \left(1 - \frac{\text{Existing Chargers}_z}{\text{Grid Cap}_z}\right)$$
   Default weights: $w_1 = 0.50$, $w_2 = 0.30$, $w_3 = 0.20$.

4. **Capital Expenditure (CapEx)**:
   $$\text{CapEx} = N_{\text{L2}} \times \$6,500 + N_{\text{DCFC}} \times \$48,000 + \text{Transformer Upgrade Fee}$$
