-- Secrets the application generates for itself when none are configured (e.g. the JWT signing key),
-- so a deployment needs no secret in .env and keeps the same key across restarts.
CREATE TABLE app_secrets (
    name VARCHAR(100) PRIMARY KEY,
    secret_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
