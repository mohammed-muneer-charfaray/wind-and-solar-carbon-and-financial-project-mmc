/*
  # Solar Grid Integration Schema
  
  Tables for solar installations, energy generation, storage, and grid management
*/

CREATE TABLE IF NOT EXISTS solar_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  location_city text NOT NULL,
  location_country text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  total_capacity_kw numeric NOT NULL,
  panel_area_m2 numeric NOT NULL,
  panel_efficiency_percent numeric NOT NULL,
  installation_cost_r numeric NOT NULL,
  operational_lifetime_years integer DEFAULT 25,
  grid_emission_factor numeric DEFAULT 0.95,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS irradiance_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES solar_installations(id),
  month integer,
  day_of_month integer,
  hour integer,
  irradiance_w_m2 numeric,
  temperature_c numeric,
  cloud_cover_percent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pv_output_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES solar_installations(id),
  calculation_date date,
  instantaneous_power_w numeric,
  daily_energy_kwh numeric,
  monthly_energy_kwh numeric,
  annual_energy_kwh numeric,
  loss_factor_percent numeric DEFAULT 15,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS battery_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES solar_installations(id),
  battery_capacity_kwh numeric,
  daily_load_kwh numeric,
  days_of_autonomy numeric,
  depth_of_discharge_percent numeric DEFAULT 80,
  round_trip_efficiency_percent numeric DEFAULT 90,
  temperature_factor numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hydrogen_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES solar_installations(id),
  electrolyzer_efficiency_percent numeric DEFAULT 70,
  fuel_cell_efficiency_percent numeric DEFAULT 60,
  energy_density_kwh_per_kg numeric DEFAULT 33,
  required_h2_kg numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS substation_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES solar_installations(id),
  substation_name text,
  transformer_capacity_kva numeric,
  step_up_ratio numeric DEFAULT 1.0,
  poc_voltage_kv numeric,
  modbus_address integer DEFAULT 1,
  scada_protocol text DEFAULT 'modbus_tcp',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS protection_relays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substation_connection_id uuid REFERENCES substation_connections(id),
  relay_type text,
  min_threshold numeric,
  max_threshold numeric,
  trip_delay_ms integer DEFAULT 200,
  low_voltage_ride_through_kv numeric DEFAULT 0.45,
  high_voltage_ride_through_kv numeric DEFAULT 1.2,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scada_control_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substation_connection_id uuid REFERENCES substation_connections(id),
  event_type text,
  power_target_w numeric,
  reactive_power_var numeric,
  weather_forecast_condition text,
  grid_voltage_v numeric,
  grid_frequency_hz numeric,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS load_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES solar_installations(id),
  hour_of_day integer,
  day_of_week integer,
  average_load_kw numeric,
  peak_load_kw numeric,
  min_load_kw numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispatch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES solar_installations(id),
  timestamp timestamptz,
  demand_kw numeric,
  solar_generation_kw numeric,
  wind_generation_kw numeric DEFAULT 0,
  hydro_generation_kw numeric DEFAULT 0,
  battery_discharge_kw numeric DEFAULT 0,
  fuel_cell_discharge_kw numeric DEFAULT 0,
  battery_charge_kw numeric DEFAULT 0,
  electrolyzer_charge_kw numeric DEFAULT 0,
  curtailed_kw numeric DEFAULT 0,
  grid_shortfall_kw numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES solar_installations(id),
  discount_rate_percent numeric,
  electricity_price_r_per_kwh numeric,
  annual_price_increase_percent numeric DEFAULT 5,
  net_present_value_r numeric,
  internal_rate_of_return_percent numeric,
  roi_percent numeric,
  lcoe_r_per_kwh numeric,
  payback_period_years numeric,
  required_renewable_capacity_kw numeric,
  storage_deficit_kwh numeric,
  years_to_100_percent_renewable integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE solar_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE irradiance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE pv_output_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE battery_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hydrogen_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE substation_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE protection_relays ENABLE ROW LEVEL SECURITY;
ALTER TABLE scada_control_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow user access to own installations"
  ON solar_installations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow user insert installations"
  ON solar_installations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user update own installations"
  ON solar_installations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow data access"
  ON irradiance_data FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow data access"
  ON pv_output_metrics FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow data access"
  ON battery_configurations FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow data access"
  ON hydrogen_storage FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow data access"
  ON substation_connections FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow data access"
  ON protection_relays FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow data access"
  ON scada_control_logs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow data access"
  ON load_profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow data access"
  ON dispatch_logs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow data access"
  ON financial_projections FOR SELECT
  TO authenticated USING (true);

CREATE INDEX idx_solar_installations_user ON solar_installations(user_id);
CREATE INDEX idx_irradiance_installation ON irradiance_data(installation_id);
CREATE INDEX idx_pv_output_installation ON pv_output_metrics(installation_id);
CREATE INDEX idx_dispatch_timestamp ON dispatch_logs(installation_id, timestamp);
