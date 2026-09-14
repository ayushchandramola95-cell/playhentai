-- Complete Database Schema for PlayHentai Supabase Project
-- Run this in your NEW Supabase project's SQL Editor to set up all tables

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  username TEXT,
  role TEXT DEFAULT 'user',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Studios Table
CREATE TABLE IF NOT EXISTS public.studios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Series Table
CREATE TABLE IF NOT EXISTS public.series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  poster_image_key TEXT,
  cover_image_key TEXT,
  banner_image_key TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  studio TEXT,
  release_year INTEGER,
  alt_title_japanese TEXT,
  alt_title_romaji TEXT,
  alt_title_english TEXT,
  original_language TEXT,
  status TEXT,
  episode_count_override INTEGER,
  runtime INTEGER,
  age_rating TEXT,
  content_rating TEXT,
  country TEXT,
  aliases TEXT[] DEFAULT '{}',
  featured_type TEXT,
  meta_title TEXT,
  meta_description TEXT,
  first_air_date TIMESTAMPTZ,
  last_air_date TIMESTAMPTZ,
  image_library TEXT[] DEFAULT '{}',
  poster_position TEXT,
  cover_position TEXT,
  banner_position TEXT,
  about_data JSONB,
  original_source TEXT,
  content_warnings TEXT[] DEFAULT '{}',
  about_text TEXT,
  faq_override JSONB,
  metadata_locks JSONB,
  metadata_provenance JSONB,
  metadata_versions JSONB,
  raw_provider_payload JSONB
);

-- 6. Seasons Table
CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  title TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Episodes Table
CREATE TABLE IF NOT EXISTS public.episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  video_key TEXT,
  thumbnail_key TEXT,
  duration_seconds INTEGER,
  release_date TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  thumbnail_options JSONB,
  metadata_locks JSONB,
  metadata_provenance JSONB,
  metadata_versions JSONB,
  raw_provider_payload JSONB
);

-- 8. Watchlist Table
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, series_id)
);

-- 9. Episode Views Table
CREATE TABLE IF NOT EXISTS public.episode_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_series_slug ON public.series(slug);
CREATE INDEX IF NOT EXISTS idx_series_published ON public.series(is_published);
CREATE INDEX IF NOT EXISTS idx_seasons_series_id ON public.seasons(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON public.episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_published ON public.episodes(is_published);
CREATE INDEX IF NOT EXISTS idx_episode_views_episode_id ON public.episode_views(episode_id);

-- 11. Disable RLS or allow public read for published rows
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_views ENABLE ROW LEVEL SECURITY;

-- Allow Public Read Access
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public series are viewable by everyone." ON public.series FOR SELECT USING (true);
CREATE POLICY "Public seasons are viewable by everyone." ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Public episodes are viewable by everyone." ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Public studios are viewable by everyone." ON public.studios FOR SELECT USING (true);
CREATE POLICY "Public categories are viewable by everyone." ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public watchlist are viewable by owners." ON public.watchlist FOR ALL USING (true);
CREATE POLICY "Public views are insertable by everyone." ON public.episode_views FOR ALL USING (true);
