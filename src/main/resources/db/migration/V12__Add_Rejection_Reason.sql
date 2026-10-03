-- Issue #38: why staff rejected an advert, shown to the student.
ALTER TABLE images ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(200);
