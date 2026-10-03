-- Issue #48: what each team owes for its adverts (event money). One row per charge (advert approved), credit
-- (approved advert later rejected) or payment (staff took the balance from the team's bank).
-- Amounts are positive; the kind says which way they go. The team and a description are copied in, so the
-- record stands even if the advert is later deleted (no refunds for deleting an approved advert).
CREATE TABLE IF NOT EXISTS team_ledger (
    id BIGSERIAL PRIMARY KEY,
    team VARCHAR(255) NOT NULL,
    kind VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    image_id BIGINT,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    recorded_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_team_ledger_team ON team_ledger (team);
