-- Issue #47: the price wobble (#41) in force when an advert was uploaded, as a percentage of normal prices,
-- so cards can say e.g. "Price 5 - half price". Adverts uploaded before this were at normal prices.
ALTER TABLE images ADD COLUMN IF NOT EXISTS price_percent INTEGER NOT NULL DEFAULT 100;
