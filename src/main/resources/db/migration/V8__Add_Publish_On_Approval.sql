-- Issue #9: students choose whether an advert goes on screen as soon as it's approved, or waits until
-- they publish it. Existing uploads keep the old behaviour (on screen once approved).
ALTER TABLE images ADD COLUMN publish_on_approval BOOLEAN NOT NULL DEFAULT TRUE;
