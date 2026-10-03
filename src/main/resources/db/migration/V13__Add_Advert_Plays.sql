-- Issue #40: each time the projector showed a student advert, and for how long. The team is copied from the
-- advert at the time, so screen time still counts if the team later deletes the advert.
CREATE TABLE IF NOT EXISTS advert_plays (
    id BIGSERIAL PRIMARY KEY,
    image_id BIGINT NOT NULL,
    team VARCHAR(255) NOT NULL,
    played_at TIMESTAMP NOT NULL,
    seconds INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_advert_plays_team ON advert_plays (team);
CREATE INDEX IF NOT EXISTS idx_advert_plays_image ON advert_plays (image_id);
