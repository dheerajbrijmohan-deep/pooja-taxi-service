-- Owner notifications for manager activity. Run once on older databases.
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME NOT NULL,
  actor_name VARCHAR(100) NOT NULL,
  summary VARCHAR(300) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_notifications_read (is_read, id)
);
