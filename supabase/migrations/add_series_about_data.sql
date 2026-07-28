-- Migration to add structured About data column to the series table
ALTER TABLE series ADD COLUMN IF NOT EXISTS about_data jsonb DEFAULT NULL;
