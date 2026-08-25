import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/utils/supabase/admin';

export async function POST() {
  try {
    // 1. Verify user is authorized admin
    await verifyAdmin();

    // 2. Clear Next.js cache for dynamic sitemap pages/routes right away
    revalidatePath('/sitemap.xml');
    revalidatePath('/sitemap-video.xml');

    return NextResponse.json({
      success: true,
      message: 'Sitemaps revalidated successfully! Next crawler fetch will receive fresh database entries.'
    });
  } catch (err: any) {
    console.error('Error revalidating sitemaps:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
