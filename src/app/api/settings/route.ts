import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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

export async function GET() {
  const localSettings = getLocalSettings();

  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
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
    return NextResponse.json({ settings: localSettings });
  }
}
