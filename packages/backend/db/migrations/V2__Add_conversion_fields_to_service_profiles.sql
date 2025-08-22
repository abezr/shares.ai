-- Add conversion-related fields to service_profiles
ALTER TABLE service_profiles
  ADD COLUMN IF NOT EXISTS source_content TEXT,
  ADD COLUMN IF NOT EXISTS target_provider VARCHAR(100);
