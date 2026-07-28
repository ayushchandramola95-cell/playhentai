-- Migration: Add extra SEO metadata columns to series table
ALTER TABLE series
ADD COLUMN IF NOT EXISTS original_source text,
ADD COLUMN IF NOT EXISTS content_warnings text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS about_text text,
ADD COLUMN IF NOT EXISTS faq_override jsonb DEFAULT '[]';
