-- AutoShine appointments (2-hour slots, 9 am to 9 pm, one bay). Run once on older databases.
CREATE TABLE IF NOT EXISTS carwash_appointments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appt_date DATE NOT NULL,
  slot_hour TINYINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT '',
  mobile VARCHAR(15) NOT NULL DEFAULT '',
  vehicle_number VARCHAR(20) NOT NULL DEFAULT '',
  vehicle_type VARCHAR(10) NOT NULL DEFAULT 'Car',
  model VARCHAR(100) NOT NULL DEFAULT '',
  service VARCHAR(40) NOT NULL DEFAULT '',
  notes VARCHAR(300) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'Booked',
  slot_key VARCHAR(16) NULL,
  entry_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  created_by_name VARCHAR(100) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_appt_slot (slot_key),
  INDEX idx_appt_date (appt_date, slot_hour),
  INDEX idx_appt_vehicle (vehicle_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
