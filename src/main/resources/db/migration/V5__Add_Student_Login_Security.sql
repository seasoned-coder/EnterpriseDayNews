ALTER TABLE student_accounts ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_accounts ADD COLUMN temporary_lock_until TIMESTAMP;

