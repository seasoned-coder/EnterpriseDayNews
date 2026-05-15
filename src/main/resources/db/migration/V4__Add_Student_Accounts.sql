CREATE TABLE student_accounts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_student_accounts_username UNIQUE (username)
);

