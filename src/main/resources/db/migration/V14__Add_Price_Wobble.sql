-- Issue #41: staff make prices go up or down for a while ("price wobble"). At most one row; none = normal prices.
CREATE TABLE IF NOT EXISTS price_wobble (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    percent INTEGER NOT NULL,
    message VARCHAR(120),
    starts_at TIMESTAMP,
    ends_at TIMESTAMP
);
