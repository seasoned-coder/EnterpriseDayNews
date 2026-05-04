CREATE TABLE images (
    id BIGSERIAL PRIMARY KEY,
    file_path VARCHAR(255),
    original_file_name VARCHAR(255),
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP,
    status VARCHAR(50),
    vetted_by VARCHAR(255),
    vetted_at TIMESTAMP,
    display BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0
);
