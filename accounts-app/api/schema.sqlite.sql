CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_attempts ON login_attempts (username, ip, attempted_at);

CREATE TABLE IF NOT EXISTS carwash_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  vehicle_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'Car',
  service TEXT NOT NULL DEFAULT '',
  paid REAL NOT NULL DEFAULT 0,
  due_on TEXT NOT NULL,
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_carwash_date ON carwash_entries (entry_date);
CREATE INDEX IF NOT EXISTS idx_carwash_vehicle ON carwash_entries (vehicle_number);

CREATE TABLE IF NOT EXISTS carwash_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_number TEXT NOT NULL,
  comment TEXT NOT NULL,
  called_by INTEGER NULL,
  called_by_name TEXT NOT NULL DEFAULT '',
  called_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_calls_vehicle ON carwash_calls (vehicle_number, called_at);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Supplies' CHECK (category IN ('Supplies','Rent','Salary')),
  item TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  price REAL NOT NULL DEFAULT 0,
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expenses_biz_date ON expenses (business, expense_date);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  father_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  alt_phone TEXT NOT NULL DEFAULT '',
  dob TEXT NULL,
  gender TEXT NOT NULL DEFAULT '',
  blood_group TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  business TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL DEFAULT '',
  join_date TEXT NULL,
  leave_date TEXT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Left')),
  monthly_salary REAL NOT NULL DEFAULT 0,
  bank_name TEXT NOT NULL DEFAULT '',
  bank_account TEXT NOT NULL DEFAULT '',
  ifsc TEXT NOT NULL DEFAULT '',
  emergency_name TEXT NOT NULL DEFAULT '',
  emergency_phone TEXT NOT NULL DEFAULT '',
  emergency_relation TEXT NOT NULL DEFAULT '',
  aadhaar_last4 TEXT NOT NULL DEFAULT '',
  aadhaar_no TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  perm_address TEXT NOT NULL DEFAULT '',
  perm_city TEXT NOT NULL DEFAULT '',
  perm_state TEXT NOT NULL DEFAULT '',
  perm_pincode TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees (status);

CREATE TABLE IF NOT EXISTS employee_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by INTEGER NULL,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_empdocs_emp ON employee_documents (employee_id);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  att_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Present','Half day','Absent','Leave')),
  marked_by INTEGER NULL,
  marked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, att_date)
);
CREATE INDEX IF NOT EXISTS idx_att_date ON attendance (att_date);

CREATE TABLE IF NOT EXISTS salary_sheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  bonus REAL NOT NULL DEFAULT 0,
  bonus_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Paid')),
  paid_on TEXT NULL,
  snap_salary REAL NULL,
  snap_days REAL NULL,
  snap_earned REAL NULL,
  expense_id INTEGER NULL,
  updated_by INTEGER NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, month)
);

CREATE TABLE IF NOT EXISTS investments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business TEXT NOT NULL,
  invest_date TEXT NOT NULL,
  category TEXT NOT NULL,
  item TEXT NOT NULL,
  paid_to TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Bank transfer' CHECK (payment_mode IN ('Cash','UPI','Card','Bank transfer','Cheque')),
  funded_by TEXT NOT NULL DEFAULT 'Own funds' CHECK (funded_by IN ('Own funds','Loan')),
  refundable INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_investments_biz_date ON investments (business, invest_date);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business TEXT NOT NULL DEFAULT '',
  lender TEXT NOT NULL,
  sanctioned REAL NOT NULL,
  interest_rate REAL NULL,
  tenure_months INTEGER NULL,
  sanction_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_disbursements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL,
  disb_date TEXT NOT NULL,
  amount REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_disb_loan ON loan_disbursements (loan_id);

-- Pooja Taxi Services: drivers earn a share (30%) of each day's total earning; vehicles carry their own daily EMI.
CREATE TABLE IF NOT EXISTS taxi_vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL DEFAULT '',
  emi_per_day REAL NOT NULL DEFAULT 0,
  run_day_charge REAL NOT NULL DEFAULT 0,
  maintenance_per_day REAL NOT NULL DEFAULT 0,
  cost_mode TEXT NOT NULL DEFAULT 'full',
  active INTEGER NOT NULL DEFAULT 1,
  driver_id INTEGER NULL,
  account_name TEXT NOT NULL DEFAULT '',
  deposit_to TEXT NOT NULL DEFAULT '',
  make TEXT NOT NULL DEFAULT '',
  fuel_type TEXT NOT NULL DEFAULT 'CNG',
  color TEXT NOT NULL DEFAULT '',
  mfg_year INTEGER NULL,
  reg_date TEXT NULL,
  chassis_no TEXT NOT NULL DEFAULT '',
  engine_no TEXT NOT NULL DEFAULT '',
  owner_name TEXT NOT NULL DEFAULT '',
  purchase_date TEXT NULL,
  purchase_price REAL NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS taxi_drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL DEFAULT '',
  share_pct REAL NOT NULL DEFAULT 30,
  active INTEGER NOT NULL DEFAULT 1,
  father_name TEXT NOT NULL DEFAULT '',
  alt_phone TEXT NOT NULL DEFAULT '',
  dob TEXT NULL,
  gender TEXT NOT NULL DEFAULT '',
  blood_group TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  join_date TEXT NULL,
  leave_date TEXT NULL,
  licence_no TEXT NOT NULL DEFAULT '',
  licence_expiry TEXT NULL,
  badge_no TEXT NOT NULL DEFAULT '',
  aadhaar_last4 TEXT NOT NULL DEFAULT '',
  aadhaar_no TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  perm_address TEXT NOT NULL DEFAULT '',
  perm_city TEXT NOT NULL DEFAULT '',
  perm_state TEXT NOT NULL DEFAULT '',
  perm_pincode TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  bank_account TEXT NOT NULL DEFAULT '',
  ifsc TEXT NOT NULL DEFAULT '',
  emergency_name TEXT NOT NULL DEFAULT '',
  emergency_phone TEXT NOT NULL DEFAULT '',
  emergency_relation TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  employee_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS taxi_trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_date TEXT NOT NULL,
  driver_id INTEGER NOT NULL,
  vehicle_id INTEGER NULL,
  shift TEXT NOT NULL DEFAULT 'Day',
  in_time TEXT NOT NULL DEFAULT '',
  out_time TEXT NOT NULL DEFAULT '',
  start_km REAL NULL,
  end_km REAL NULL,
  cng_kg REAL NOT NULL DEFAULT 0,
  cng_amount REAL NOT NULL DEFAULT 0,
  petrol_ltr REAL NOT NULL DEFAULT 0,
  petrol_amount REAL NOT NULL DEFAULT 0,
  total_earning REAL NOT NULL DEFAULT 0,
  payout REAL NOT NULL DEFAULT 0,
  online_transfer REAL NOT NULL DEFAULT 0,
  supplies REAL NOT NULL DEFAULT 0,
  other_items TEXT NOT NULL DEFAULT '',
  share_pct REAL NOT NULL DEFAULT 30,
  cash_received REAL NULL,
  on_leave INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  parking REAL NOT NULL DEFAULT 0,
  deposited_on TEXT NULL,
  deposited_amount REAL NULL,
  deposited_by INTEGER NULL,
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (driver_id, trip_date)
);
CREATE INDEX IF NOT EXISTS idx_taxi_trips_date ON taxi_trips (trip_date);

CREATE TABLE IF NOT EXISTS taxi_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL,
  driver_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  amount REAL NOT NULL,
  vehicle_id INTEGER NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS taxi_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_date TEXT NOT NULL,
  vehicle_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  item TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL,
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_taxi_expenses ON taxi_expenses (vehicle_id, expense_date);

CREATE TABLE IF NOT EXISTS taxi_salary_slips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_id INTEGER NOT NULL,
  vehicle_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  net_payable REAL NOT NULL,
  data TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  generated_by INTEGER NULL
);
CREATE INDEX IF NOT EXISTS idx_taxi_slips ON taxi_salary_slips (driver_id, month);
CREATE INDEX IF NOT EXISTS idx_taxi_ledger_driver ON taxi_ledger (driver_id, entry_date);

-- Vehicle records: documents (with expiry), service history (with next due) and accidents. All linked to taxi_vehicles.
CREATE TABLE IF NOT EXISTS taxi_vehicle_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL,
  doc_number TEXT NOT NULL DEFAULT '',
  issued_on TEXT NULL,
  expires_on TEXT NULL,
  notes TEXT NOT NULL DEFAULT '',
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by INTEGER NULL,
  uploaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tvdoc_vehicle ON taxi_vehicle_documents (vehicle_id);

CREATE TABLE IF NOT EXISTS taxi_vehicle_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  service_date TEXT NOT NULL,
  kind TEXT NOT NULL,
  odometer_km REAL NULL,
  cost REAL NOT NULL DEFAULT 0,
  vendor TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  next_due_date TEXT NULL,
  next_due_km REAL NULL,
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tvsvc_vehicle ON taxi_vehicle_services (vehicle_id, service_date);

CREATE TABLE IF NOT EXISTS taxi_vehicle_accidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  accident_date TEXT NOT NULL,
  driver_id INTEGER NULL,
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  damage TEXT NOT NULL DEFAULT '',
  repair_cost REAL NOT NULL DEFAULT 0,
  insurance_claim TEXT NOT NULL DEFAULT 'None',
  claim_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Open',
  repaired_on TEXT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tvacc_vehicle ON taxi_vehicle_accidents (vehicle_id, accident_date);

-- Driver documents (photo, licence, Aadhaar...). Files live in api/storage/drivers, served only through the signed-in owner API.
CREATE TABLE IF NOT EXISTS taxi_driver_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by INTEGER NULL,
  uploaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tddoc_driver ON taxi_driver_documents (driver_id);

-- Money to ask the car's owner for when something falls due (insurance, permit, service...): nothing is deducted in advance.
CREATE TABLE IF NOT EXISTS taxi_owner_dues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  due_date TEXT NULL,
  status TEXT NOT NULL DEFAULT 'Due',
  asked_on TEXT NULL,
  received_on TEXT NULL,
  ref TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tdues_vehicle ON taxi_owner_dues (vehicle_id, status);
