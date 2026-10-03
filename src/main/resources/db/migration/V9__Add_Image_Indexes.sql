-- Issue #36: every phone, staff dashboard and the projector refresh these lists every few seconds.
-- Indexes keep those look-ups fast as the number of adverts grows through the day.
CREATE INDEX IF NOT EXISTS idx_images_uploaded_by ON images (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_images_status_display ON images (status, display);
CREATE INDEX IF NOT EXISTS idx_images_flash_mode ON images (is_flash_mode);
CREATE INDEX IF NOT EXISTS idx_images_info_message ON images (is_info_message);
-- Every /uploads image request looks its file up by name (UploadAccessInterceptor).
CREATE INDEX IF NOT EXISTS idx_images_file_path ON images (file_path);
