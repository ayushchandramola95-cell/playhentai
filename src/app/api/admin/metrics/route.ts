import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyAdmin } from '@/utils/supabase/admin';
import { 
  getFakeMetricsConfig, 
  generateAllFakeMetrics, 
  resetAllFakeMetrics, 
  setFakeMetricsMode 
} from '@/utils/fakeMetricsStore';

export async function GET() {
  try {
    await verifyAdmin();
    const config = getFakeMetricsConfig();

    const seriesCount = Object.keys(config.series || {}).length;
    const episodesCount = Object.keys(config.episodes || {}).length;

    let totalViews = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    Object.values(config.series || {}).forEach((s) => {
      totalViews += s.views || 0;
      if (s.rating) {
        ratingSum += s.rating;
        ratingCount++;
      }
    });

    const avgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 8.8;

    return NextResponse.json({
      success: true,
      config: {
        enabled: config.enabled,
        mode: config.mode,
        generatedAt: config.generatedAt,
        settings: config.settings,
        seriesCount,
        episodesCount,
        totalViews,
        avgRating,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/metrics:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const body = await request.json();
    const { action } = body;

    if (action === 'generate') {
      const { minEpisodeViews, maxEpisodeViews, minRating, maxRating } = body;
      const result = await generateAllFakeMetrics({
        minEpisodeViews: minEpisodeViews ? parseInt(minEpisodeViews, 10) : undefined,
        maxEpisodeViews: maxEpisodeViews ? parseInt(maxEpisodeViews, 10) : undefined,
        minRating: minRating ? parseFloat(minRating) : undefined,
        maxRating: maxRating ? parseFloat(maxRating) : undefined,
      });

      // Clear Next.js cache so the whole site picks it up immediately
      try {
        revalidateTag('views_cache', {});
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Successfully generated realistic fake metrics for ${result.seriesCount} series and ${result.episodesCount} episodes!`,
        data: result,
      });
    }

    if (action === 'toggle') {
      const mode = body.mode === 'real' ? 'real' : 'boosted';
      const updated = setFakeMetricsMode(mode);

      try {
        revalidateTag('views_cache', {});
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Switched metrics display mode to: ${mode.toUpperCase()}`,
        config: updated,
      });
    }

    if (action === 'reset') {
      resetAllFakeMetrics();

      try {
        revalidateTag('views_cache', {});
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: 'All fake metrics have been reset. Real database stats are now active.',
      });
    }

    return NextResponse.json({ error: 'Invalid action provided' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/admin/metrics:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
