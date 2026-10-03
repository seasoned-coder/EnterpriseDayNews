-- Staff sign-ins move out of source code and into the database (issue #30).
CREATE TABLE staff_accounts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    temporary_lock_until TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_staff_accounts_username UNIQUE (username)
);
