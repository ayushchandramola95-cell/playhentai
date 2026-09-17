import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import { syncLocalCatalogWithSupabase, getLocalCatalog } from '@/utils/localCatalogStore';
import { revalidateAllCatalogTags } from '@/utils/revalidateCatalog';

export async function POST() {
  try {
    await verifyAdmin();
    const snapshot = await syncLocalCatalogWithSupabase();
    revalidateAllCatalogTags();

    return NextResponse.json({
      success: true,
      message: 'Local catalog store synchronized successfully with Supabase.',
      lastSyncedAt: snapshot.lastSyncedAt,
      stats: {
        seriesCount: snapshot.series.length,
        seasonsCount: snapshot.seasons.length,
        episodesCount: snapshot.episodes.length,
        collectionsCount: snapshot.collections.length
      }
    });
  } catch (err: any) {
    console.error('Error syncing local DB:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server error' }, { status });
  }
}

export async function GET() {
  try {
    await verifyAdmin();
    const catalog = await getLocalCatalog();

    return NextResponse.json({
      lastSyncedAt: catalog.lastSyncedAt,
      stats: {
        seriesCount: catalog.series.length,
        seasonsCount: catalog.seasons.length,
        episodesCount: catalog.episodes.length,
        collectionsCount: catalog.collections.length
      }
    });
  } catch (err: any) {
    console.error('Error fetching local DB status:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server error' }, { status });
  }
}
