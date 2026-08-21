import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'utils', 'site_settings.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileData);
      return NextResponse.json({
        ads_block_banners: data.ads_block_banners === 'true',
        ads_block_popunder: data.ads_block_popunder === 'true',
        ads_block_instant_message: data.ads_block_instant_message === 'true',
        ads_block_in_page_push: data.ads_block_in_page_push === 'true',
      });
    }
  } catch (err) {
    console.error('Error fetching public ad settings:', err);
  }
  return NextResponse.json({
    ads_block_banners: false,
    ads_block_popunder: false,
    ads_block_instant_message: false,
    ads_block_in_page_push: false,
  });
}
