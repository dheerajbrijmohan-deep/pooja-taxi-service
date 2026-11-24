-- Car wash: payment mode (Online / Cash / Credit, blank allowed). Run once on older databases.
ALTER TABLE carwash_entries ADD COLUMN payment_mode VARCHAR(15) NOT NULL DEFAULT '' AFTER paid;
