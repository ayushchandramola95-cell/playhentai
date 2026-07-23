-- Migration: Add Metadata Automation columns to Series and Episodes tables

-- Add metadata columns to series table
ALTER TABLE series
ADD COLUMN IF NOT EXISTS metadata_locks jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata_provenance jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata_versions jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS raw_provider_payload jsonb DEFAULT '{}';

-- Add metadata columns to episodes table
ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS metadata_locks jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata_provenance jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata_versions jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS raw_provider_payload jsonb DEFAULT '{}';
