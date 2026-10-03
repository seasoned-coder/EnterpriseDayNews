-- Issue #37: details printed on team login slips. Entered by staff on the day (never in the public repo).
CREATE TABLE IF NOT EXISTS event_details (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    wifi_name VARCHAR(32),
    wifi_password VARCHAR(63),
    app_address VARCHAR(200)
);
