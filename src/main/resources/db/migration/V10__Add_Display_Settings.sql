-- Projector settings. This table was only ever created by Hibernate (ddl-auto=update in docker-compose), so a
-- brand-new database with schema validation failed to start (found by the screenshot demo stack, #44).
-- IF NOT EXISTS: databases that already have it are left as they are.
CREATE TABLE IF NOT EXISTS display_settings (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    display_duration_seconds INTEGER NOT NULL,
    image_refresh_seconds INTEGER NOT NULL,
    interval_speed_seconds INTEGER NOT NULL
);
