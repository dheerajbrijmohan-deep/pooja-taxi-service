-- For databases created before 3 Nov 2026 (run once). Fresh installs already have these columns in the schema files.
-- MySQL:
ALTER TABLE taxi_trips ADD COLUMN parking DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER notes;
ALTER TABLE taxi_vehicles ADD COLUMN cost_mode VARCHAR(20) NOT NULL DEFAULT 'full' AFTER maintenance_per_day;
-- SQLite:
--   ALTER TABLE taxi_trips ADD COLUMN parking REAL NOT NULL DEFAULT 0;
--   ALTER TABLE taxi_vehicles ADD COLUMN cost_mode TEXT NOT NULL DEFAULT 'full';
-- Car 1376 is costed as CNG + petrol + driver earning only:
UPDATE taxi_vehicles SET cost_mode = 'fuel_share', run_day_charge = 0, emi_per_day = 0, maintenance_per_day = 0 WHERE code = 'MH31GD1376';

-- Saved driver salary slips (added 3 Nov 2026). MySQL:
CREATE TABLE IF NOT EXISTS taxi_salary_slips (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  driver_id INT UNSIGNED NOT NULL,
  vehicle_id INT UNSIGNED NOT NULL,
  month CHAR(7) NOT NULL,
  net_payable DECIMAL(12,2) NOT NULL,
  data MEDIUMTEXT NOT NULL,
  generated_at DATETIME NOT NULL,
  generated_by INT UNSIGNED NULL,
  INDEX idx_taxi_slips (driver_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Car 8000: no EMI or maintenance charged
UPDATE taxi_vehicles SET emi_per_day = 0, maintenance_per_day = 0 WHERE code = 'MH31GD8000';

-- Car 1026: same as 8000 (no EMI, maintenance or running-day charge)
UPDATE taxi_vehicles SET emi_per_day = 0, maintenance_per_day = 0, run_day_charge = 0 WHERE code = 'MH31GD1026';

-- Cost = CNG + petrol + driver earning for every car; other expenses (puncture etc.) are tracked separately
UPDATE taxi_vehicles SET cost_mode = 'fuel_share' WHERE code IN ('MH31GD8000', 'MH31GD1026');

-- Driver Employee ID (shown on the salary slip). MySQL:
ALTER TABLE taxi_drivers ADD COLUMN employee_id VARCHAR(40) NOT NULL DEFAULT '';
-- SQLite: ALTER TABLE taxi_drivers ADD COLUMN employee_id TEXT NOT NULL DEFAULT '';

-- Full 12-digit Aadhaar number for drivers and employees (replaces the old last-4 box). MySQL:
ALTER TABLE taxi_drivers ADD COLUMN aadhaar_no CHAR(12) NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN aadhaar_no CHAR(12) NOT NULL DEFAULT '';
-- SQLite: ALTER TABLE taxi_drivers ADD COLUMN aadhaar_no TEXT NOT NULL DEFAULT '';  (same for employees)

-- Current address (city, state, PIN code) and permanent address for drivers and employees. MySQL (run for both taxi_drivers and employees):
ALTER TABLE taxi_drivers ADD COLUMN city VARCHAR(60) NOT NULL DEFAULT '', ADD COLUMN state VARCHAR(60) NOT NULL DEFAULT '', ADD COLUMN pincode CHAR(6) NOT NULL DEFAULT '',
  ADD COLUMN perm_address VARCHAR(255) NOT NULL DEFAULT '', ADD COLUMN perm_city VARCHAR(60) NOT NULL DEFAULT '', ADD COLUMN perm_state VARCHAR(60) NOT NULL DEFAULT '', ADD COLUMN perm_pincode CHAR(6) NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN city VARCHAR(60) NOT NULL DEFAULT '', ADD COLUMN state VARCHAR(60) NOT NULL DEFAULT '', ADD COLUMN pincode CHAR(6) NOT NULL DEFAULT '',
  ADD COLUMN perm_address VARCHAR(255) NOT NULL DEFAULT '', ADD COLUMN perm_city VARCHAR(60) NOT NULL DEFAULT '', ADD COLUMN perm_state VARCHAR(60) NOT NULL DEFAULT '', ADD COLUMN perm_pincode CHAR(6) NOT NULL DEFAULT '';

-- Car-wise Pooja Taxi expenses (puncture, servicing, other). MySQL:
CREATE TABLE IF NOT EXISTS taxi_expenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expense_date DATE NOT NULL,
  vehicle_id INT UNSIGNED NOT NULL,
  category VARCHAR(20) NOT NULL,
  item VARCHAR(120) NOT NULL DEFAULT '',
  amount DECIMAL(12,2) NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_taxi_expenses (vehicle_id, expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
