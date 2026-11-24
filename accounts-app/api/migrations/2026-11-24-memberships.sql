-- AutoShine membership passes and the public holiday list. Run once on older databases.

CREATE TABLE IF NOT EXISTS carwash_memberships (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pass_no VARCHAR(12) NOT NULL DEFAULT '',
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  vehicle_number VARCHAR(20) NOT NULL,
  model VARCHAR(100) NOT NULL DEFAULT '',
  vehicle_type VARCHAR(10) NOT NULL,
  plan VARCHAR(12) NOT NULL,
  washes_total INT NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_mode VARCHAR(15) NOT NULL,
  sold_on DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'Active',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_memberships_vehicle (vehicle_number),
  INDEX idx_memberships_sold (sold_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS carwash_membership_washes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  membership_id INT UNSIGNED NOT NULL,
  wash_date DATE NOT NULL,
  entry_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_membership_day (membership_id, wash_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS public_holidays (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Holidays to start with (national + Maharashtra, please verify; the owner can edit the list in the app)
INSERT IGNORE INTO public_holidays (holiday_date, name) VALUES
('2026-01-26','Republic Day'),
('2026-02-19','Chhatrapati Shivaji Maharaj Jayanti'),
('2026-03-04','Holi (Dhulivandan)'),
('2026-03-19','Gudi Padwa'),
('2026-03-26','Ram Navami'),
('2026-03-31','Mahavir Jayanti'),
('2026-04-03','Good Friday'),
('2026-04-14','Dr. Ambedkar Jayanti'),
('2026-05-01','Maharashtra Day / Buddha Purnima'),
('2026-05-28','Bakri Eid'),
('2026-06-26','Muharram'),
('2026-08-15','Independence Day'),
('2026-08-26','Eid-e-Milad'),
('2026-09-14','Ganesh Chaturthi'),
('2026-10-02','Gandhi Jayanti'),
('2026-10-20','Dussehra'),
('2026-11-08','Diwali (Laxmi Pujan)'),
('2026-11-10','Diwali (Balipratipada)'),
('2026-11-11','Bhau Beej'),
('2026-11-24','Guru Nanak Jayanti'),
('2026-12-25','Christmas'),
('2027-01-26','Republic Day'),
('2027-04-14','Dr. Ambedkar Jayanti'),
('2027-05-01','Maharashtra Day'),
('2027-08-15','Independence Day'),
('2027-10-02','Gandhi Jayanti'),
('2027-12-25','Christmas');
