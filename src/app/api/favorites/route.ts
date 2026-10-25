import { NextResponse } from 'next/server';
import {
  getCurrentUserFromCookies,
  getUserFavorites,
  toggleUserFavorite,
  batchAddUserFavorites,
  removeUserFavorite,
  clearUserFavorites,
} from '@/utils/authStore';
import { getLocalAllPublishedSeries } from '@/utils/localCatalogStore';
import { getSeriesViewsMap } from '@/utils/views';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('series_id');
    const idsParam = searchParams.get('ids');

    // 1. If IDs specified (guest local storage lookup or batch check)
    if (idsParam) {
      const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ favorites: [] });
      }

      const [allSeries, viewsMap] = await Promise.all([
        getLocalAllPublishedSeries(),
        getSeriesViewsMap('all').catch(() => ({} as Record<string, number>))
      ]);

      const matching = allSeries.filter((s) => ids.includes(s.id));
      const sorted = [...matching].sort((a, b) => {
        const idxA = ids.indexOf(a.id);
        const idxB = ids.indexOf(b.id);
        return idxA - idxB;
      });

      const formattedFavorites = sorted.map((s) => ({
        id: s.id,
        series_id: s.id,
        created_at: s.created_at || new Date().toISOString(),
        series: {
          ...s,
          views: viewsMap[s.id] || s.views || 0,
        },
      }));

      return NextResponse.json({ favorites: formattedFavorites });
    }

    // 2. Unauthenticated user check
    if (!user) {
      return NextResponse.json({ isFavorite: false, favorites: [] });
    }

    const userFavs = await getUserFavorites(user.id);

    // 3. Single series favorite check
    if (seriesId) {
      const isFavorite = userFavs.includes(seriesId);
      return NextResponse.json({ isFavorite });
    }

    if (userFavs.length === 0) {
      return NextResponse.json({ favorites: [] });
    }

    // 4. Return full favorite series list for user
    const [allSeries, viewsMap] = await Promise.all([
      getLocalAllPublishedSeries(),
      getSeriesViewsMap('all').catch(() => ({} as Record<string, number>))
    ]);

    const matching = allSeries.filter((s) => userFavs.includes(s.id));
    const sorted = [...matching].sort((a, b) => {
      const idxA = userFavs.indexOf(a.id);
      const idxB = userFavs.indexOf(b.id);
      return idxA - idxB;
    });

    const formattedFavorites = sorted.map((s) => ({
      id: s.id,
      series_id: s.id,
      created_at: s.created_at || new Date().toISOString(),
      series: {
        ...s,
        views: viewsMap[s.id] || s.views || 0,
      },
    }));

    return NextResponse.json({ favorites: formattedFavorites });
  } catch (err: any) {
    console.error('Error in GET /api/favorites:', err);
    return NextResponse.json({ isFavorite: false, favorites: [], error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { series_id, series_ids } = body;

    // Batch add (e.g. sync local storage favorites on user login)
    if (Array.isArray(series_ids) && series_ids.length > 0) {
      const updated = await batchAddUserFavorites(user.id, series_ids);
      return NextResponse.json({ isFavorite: true, favorites: updated });
    }

    if (series_id) {
      const result = await toggleUserFavorite(user.id, series_id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Missing series_id' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/favorites:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('series_id');
    const clearAll = searchParams.get('all') === 'true';

    if (clearAll) {
      await clearUserFavorites(user.id);
      return NextResponse.json({ success: true, favorites: [] });
    }

    if (seriesId) {
      const updated = await removeUserFavorite(user.id, seriesId);
      return NextResponse.json({ success: true, favorites: updated });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in DELETE /api/favorites:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}
