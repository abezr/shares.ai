-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- service_profiles table
CREATE TABLE IF NOT EXISTS service_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  goals JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- run_ledger table
CREATE TABLE IF NOT EXISTS run_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_profile_id UUID NOT NULL REFERENCES service_profiles(id),
  status VARCHAR(50) NOT NULL,
  steps JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
