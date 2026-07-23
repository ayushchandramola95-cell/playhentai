import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getLocalSettings(): Record<string, string> {
  const defaultSettings = { 
    latest_series_sort_mode: 'latest_episode',
    hero_banner_source: 'featured_tags',
    hero_banner_slide_count: '5'
  };
  try {
    const filePath = path.join(process.cwd(), 'src', 'utils', 'site_settings.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      return { ...defaultSettings, ...JSON.parse(fileData) };
    }
  } catch (err) {
    console.error('Error reading local settings file:', err);
  }
  return defaultSettings;
}

function saveLocalSettings(newSettings: Record<string, string>) {
  try {
    const filePath = path.join(process.cwd(), 'src', 'utils', 'site_settings.json');
    const existing = getLocalSettings();
    const updated = { ...existing, ...newSettings };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Error writing local settings file:', err);
    return newSettings;
  }
}

export async function GET() {
  const localSettings = getLocalSettings();

  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from('site_settings')
      .select('key, value');

    if (error || !data || data.length === 0) {
      return NextResponse.json({ settings: localSettings });
    }

    const settingsMap = { ...localSettings };
    data.forEach((row: { key: string; value: string }) => {
      if (row.key && row.value) {
        settingsMap[row.key] = row.value;
      }
    });

    return NextResponse.json({ settings: settingsMap });
  } catch (err: any) {
    if (err.message === 'Unauthorized' || err.message === 'Forbidden') {
      const status = err.message === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: err.message }, { status });
    }
    // For DB table missing or connection errors, return local settings gracefully
    return NextResponse.json({ settings: localSettings });
  }
}

export async function PUT(request: Request) {
  try {
    await verifyAdmin();
    const payload = await request.json();

    const { settings } = payload;
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Always save to local file first for 100% reliable fallback
    const savedLocal = saveLocalSettings(settings);

    // 2. Attempt to save to Supabase site_settings table if it exists
    try {
      const adminSupabase = createAdminClient();
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      }));

      await adminSupabase
        .from('site_settings')
        .upsert(updates, { onConflict: 'key' });
    } catch (dbErr) {
      console.warn('Supabase site_settings table upsert notice (using local file fallback):', dbErr);
    }

    return NextResponse.json({ success: true, settings: savedLocal });
  } catch (err: any) {
    console.error('Error saving admin settings:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
