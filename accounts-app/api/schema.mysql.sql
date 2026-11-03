-- Database: thepoojagroup (on DirectAdmin it is shown as <account>_thepoojagroup). Create it in MySQL Management, then import this file into it.
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','manager') NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_attempts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attempts (username, ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS carwash_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_date DATE NOT NULL,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL DEFAULT '',
  model VARCHAR(100) NOT NULL DEFAULT '',
  vehicle_number VARCHAR(20) NOT NULL,
  vehicle_type ENUM('Car','Bike','Auto') NOT NULL DEFAULT 'Car',
  service VARCHAR(100) NOT NULL DEFAULT '',
  paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  due_on DATE NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_carwash_date (entry_date),
  INDEX idx_carwash_vehicle (vehicle_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS carwash_calls (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_number VARCHAR(20) NOT NULL,
  comment VARCHAR(500) NOT NULL,
  called_by INT UNSIGNED NULL,
  called_by_name VARCHAR(100) NOT NULL DEFAULT '',
  called_at DATETIME NOT NULL,
  INDEX idx_calls_vehicle (vehicle_number, called_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business VARCHAR(100) NOT NULL,
  expense_date DATE NOT NULL,
  category ENUM('Supplies','Rent','Salary') NOT NULL DEFAULT 'Supplies',
  item VARCHAR(100) NOT NULL,
  qty DECIMAL(10,2) NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expenses_biz_date (business, expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employees (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  father_name VARCHAR(100) NOT NULL DEFAULT '',
  phone VARCHAR(20) NOT NULL,
  alt_phone VARCHAR(20) NOT NULL DEFAULT '',
  dob DATE NULL,
  gender VARCHAR(10) NOT NULL DEFAULT '',
  blood_group VARCHAR(5) NOT NULL DEFAULT '',
  address VARCHAR(255) NOT NULL DEFAULT '',
  business VARCHAR(100) NOT NULL DEFAULT '',
  designation VARCHAR(100) NOT NULL DEFAULT '',
  join_date DATE NULL,
  leave_date DATE NULL,
  status ENUM('Active','Left') NOT NULL DEFAULT 'Active',
  monthly_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  bank_name VARCHAR(100) NOT NULL DEFAULT '',
  bank_account VARCHAR(30) NOT NULL DEFAULT '',
  ifsc VARCHAR(11) NOT NULL DEFAULT '',
  emergency_name VARCHAR(100) NOT NULL DEFAULT '',
  emergency_phone VARCHAR(20) NOT NULL DEFAULT '',
  emergency_relation VARCHAR(50) NOT NULL DEFAULT '',
  aadhaar_last4 CHAR(4) NOT NULL DEFAULT '',
  aadhaar_no CHAR(12) NOT NULL DEFAULT '',
  city VARCHAR(60) NOT NULL DEFAULT '',
  state VARCHAR(60) NOT NULL DEFAULT '',
  pincode CHAR(6) NOT NULL DEFAULT '',
  perm_address VARCHAR(255) NOT NULL DEFAULT '',
  perm_city VARCHAR(60) NOT NULL DEFAULT '',
  perm_state VARCHAR(60) NOT NULL DEFAULT '',
  perm_pincode CHAR(6) NOT NULL DEFAULT '',
  notes VARCHAR(1000) NOT NULL DEFAULT '',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employees_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  doc_type VARCHAR(30) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(64) NOT NULL,
  mime VARCHAR(50) NOT NULL,
  size INT UNSIGNED NOT NULL,
  uploaded_by INT UNSIGNED NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_empdocs_emp (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  att_date DATE NOT NULL,
  status ENUM('Present','Half day','Absent','Leave') NOT NULL,
  marked_by INT UNSIGNED NULL,
  marked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_att (employee_id, att_date),
  INDEX idx_att_date (att_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS salary_sheets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  month CHAR(7) NOT NULL,
  bonus DECIMAL(10,2) NOT NULL DEFAULT 0,
  bonus_note VARCHAR(200) NOT NULL DEFAULT '',
  status ENUM('Open','Paid') NOT NULL DEFAULT 'Open',
  paid_on DATE NULL,
  snap_salary DECIMAL(10,2) NULL,
  snap_days DECIMAL(5,1) NULL,
  snap_earned DECIMAL(10,2) NULL,
  expense_id INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sheet (employee_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS investments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business VARCHAR(100) NOT NULL,
  invest_date DATE NOT NULL,
  category VARCHAR(60) NOT NULL,
  item VARCHAR(150) NOT NULL,
  paid_to VARCHAR(100) NOT NULL DEFAULT '',
  amount DECIMAL(14,2) NOT NULL,
  payment_mode ENUM('Cash','UPI','Card','Bank transfer','Cheque') NOT NULL DEFAULT 'Bank transfer',
  funded_by ENUM('Own funds','Loan') NOT NULL DEFAULT 'Own funds',
  refundable TINYINT(1) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_investments_biz_date (business, invest_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS loans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business VARCHAR(100) NOT NULL DEFAULT '',
  lender VARCHAR(100) NOT NULL,
  sanctioned DECIMAL(14,2) NOT NULL,
  interest_rate DECIMAL(5,2) NULL,
  tenure_months SMALLINT UNSIGNED NULL,
  sanction_date DATE NOT NULL,
  notes VARCHAR(300) NOT NULL DEFAULT '',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS loan_disbursements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  loan_id INT UNSIGNED NOT NULL,
  disb_date DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  note VARCHAR(200) NOT NULL DEFAULT '',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_disb_loan (loan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pooja Taxi Services: drivers earn a share (30%) of each day's total earning; vehicles carry their own daily EMI.
CREATE TABLE IF NOT EXISTS taxi_vehicles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  model VARCHAR(100) NOT NULL DEFAULT '',
  emi_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
  run_day_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  maintenance_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_mode VARCHAR(20) NOT NULL DEFAULT 'full',
  active TINYINT(1) NOT NULL DEFAULT 1,
  driver_id INT UNSIGNED NULL,
  account_name VARCHAR(100) NOT NULL DEFAULT '',
  deposit_to VARCHAR(100) NOT NULL DEFAULT '',
  make VARCHAR(60) NOT NULL DEFAULT '',
  fuel_type VARCHAR(20) NOT NULL DEFAULT 'CNG',
  color VARCHAR(40) NOT NULL DEFAULT '',
  mfg_year SMALLINT NULL,
  reg_date DATE NULL,
  chassis_no VARCHAR(40) NOT NULL DEFAULT '',
  engine_no VARCHAR(40) NOT NULL DEFAULT '',
  owner_name VARCHAR(100) NOT NULL DEFAULT '',
  purchase_date DATE NULL,
  purchase_price DECIMAL(12,2) NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS taxi_drivers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(20) NOT NULL DEFAULT '',
  share_pct DECIMAL(5,2) NOT NULL DEFAULT 30,
  active TINYINT(1) NOT NULL DEFAULT 1,
  father_name VARCHAR(100) NOT NULL DEFAULT '',
  alt_phone VARCHAR(20) NOT NULL DEFAULT '',
  dob DATE NULL,
  gender VARCHAR(10) NOT NULL DEFAULT '',
  blood_group VARCHAR(4) NOT NULL DEFAULT '',
  address VARCHAR(255) NOT NULL DEFAULT '',
  join_date DATE NULL,
  leave_date DATE NULL,
  licence_no VARCHAR(40) NOT NULL DEFAULT '',
  licence_expiry DATE NULL,
  badge_no VARCHAR(40) NOT NULL DEFAULT '',
  aadhaar_last4 VARCHAR(4) NOT NULL DEFAULT '',
  aadhaar_no CHAR(12) NOT NULL DEFAULT '',
  city VARCHAR(60) NOT NULL DEFAULT '',
  state VARCHAR(60) NOT NULL DEFAULT '',
  pincode CHAR(6) NOT NULL DEFAULT '',
  perm_address VARCHAR(255) NOT NULL DEFAULT '',
  perm_city VARCHAR(60) NOT NULL DEFAULT '',
  perm_state VARCHAR(60) NOT NULL DEFAULT '',
  perm_pincode CHAR(6) NOT NULL DEFAULT '',
  bank_name VARCHAR(100) NOT NULL DEFAULT '',
  bank_account VARCHAR(20) NOT NULL DEFAULT '',
  ifsc VARCHAR(11) NOT NULL DEFAULT '',
  emergency_name VARCHAR(100) NOT NULL DEFAULT '',
  emergency_phone VARCHAR(20) NOT NULL DEFAULT '',
  emergency_relation VARCHAR(50) NOT NULL DEFAULT '',
  notes VARCHAR(1000) NOT NULL DEFAULT '',
  employee_id VARCHAR(40) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS taxi_trips (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  trip_date DATE NOT NULL,
  driver_id INT UNSIGNED NOT NULL,
  vehicle_id INT UNSIGNED NULL,
  vehicle_id INT UNSIGNED NULL,
  shift VARCHAR(20) NOT NULL DEFAULT 'Day',
  in_time VARCHAR(5) NOT NULL DEFAULT '',
  out_time VARCHAR(5) NOT NULL DEFAULT '',
  start_km DECIMAL(10,1) NULL,
  end_km DECIMAL(10,1) NULL,
  cng_kg DECIMAL(8,2) NOT NULL DEFAULT 0,
  cng_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  petrol_ltr DECIMAL(8,2) NOT NULL DEFAULT 0,
  petrol_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_earning DECIMAL(10,2) NOT NULL DEFAULT 0,
  payout DECIMAL(10,2) NOT NULL DEFAULT 0,
  online_transfer DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplies DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_items TEXT NULL,
  share_pct DECIMAL(5,2) NOT NULL DEFAULT 30,
  cash_received DECIMAL(10,2) NULL,
  on_leave TINYINT(1) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  parking DECIMAL(10,2) NOT NULL DEFAULT 0,
  deposited_on DATE NULL,
  deposited_amount DECIMAL(10,2) NULL,
  deposited_by INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_taxi_driver_day (driver_id, trip_date),
  INDEX idx_taxi_trips_date (trip_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS taxi_ledger (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_date DATE NOT NULL,
  driver_id INT UNSIGNED NOT NULL,
  kind VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  vehicle_id INT UNSIGNED NULL,
  note VARCHAR(300) NOT NULL DEFAULT '',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_taxi_ledger_driver (driver_id, entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vehicle records: documents (with expiry), service history (with next due) and accidents. All linked to taxi_vehicles.
CREATE TABLE IF NOT EXISTS taxi_vehicle_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT UNSIGNED NOT NULL,
  doc_type VARCHAR(40) NOT NULL,
  doc_number VARCHAR(60) NOT NULL DEFAULT '',
  issued_on DATE NULL,
  expires_on DATE NULL,
  notes VARCHAR(300) NOT NULL DEFAULT '',
  original_name VARCHAR(200) NOT NULL,
  stored_name VARCHAR(80) NOT NULL,
  mime VARCHAR(60) NOT NULL,
  size INT UNSIGNED NOT NULL,
  uploaded_by INT UNSIGNED NULL,
  uploaded_at DATETIME NOT NULL,
  INDEX idx_tvdoc_vehicle (vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS taxi_vehicle_services (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT UNSIGNED NOT NULL,
  service_date DATE NOT NULL,
  kind VARCHAR(40) NOT NULL,
  odometer_km DECIMAL(10,1) NULL,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  vendor VARCHAR(100) NOT NULL DEFAULT '',
  description VARCHAR(500) NOT NULL DEFAULT '',
  next_due_date DATE NULL,
  next_due_km DECIMAL(10,1) NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tvsvc_vehicle (vehicle_id, service_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS taxi_vehicle_accidents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT UNSIGNED NOT NULL,
  accident_date DATE NOT NULL,
  driver_id INT UNSIGNED NULL,
  location VARCHAR(150) NOT NULL DEFAULT '',
  description VARCHAR(500) NOT NULL,
  damage VARCHAR(300) NOT NULL DEFAULT '',
  repair_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  insurance_claim VARCHAR(20) NOT NULL DEFAULT 'None',
  claim_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Open',
  repaired_on DATE NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tvacc_vehicle (vehicle_id, accident_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Driver documents (photo, licence, Aadhaar...). Files live in api/storage/drivers, served only through the signed-in owner API.
CREATE TABLE IF NOT EXISTS taxi_driver_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  driver_id INT UNSIGNED NOT NULL,
  doc_type VARCHAR(40) NOT NULL,
  original_name VARCHAR(200) NOT NULL,
  stored_name VARCHAR(80) NOT NULL,
  mime VARCHAR(60) NOT NULL,
  size INT UNSIGNED NOT NULL,
  uploaded_by INT UNSIGNED NULL,
  uploaded_at DATETIME NOT NULL,
  INDEX idx_tddoc_driver (driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Money to ask the car's owner for when something falls due (insurance, permit, service...): nothing is deducted in advance.
CREATE TABLE IF NOT EXISTS taxi_owner_dues (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT UNSIGNED NOT NULL,
  kind VARCHAR(40) NOT NULL,
  description VARCHAR(200) NOT NULL DEFAULT '',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  due_date DATE NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'Due',
  asked_on DATE NULL,
  received_on DATE NULL,
  ref VARCHAR(40) NOT NULL DEFAULT '',
  note VARCHAR(300) NOT NULL DEFAULT '',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tdues_vehicle (vehicle_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
