import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSeriesViewsMap } from '@/utils/views';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('series_id');
    const idsParam = searchParams.get('ids');

    // If guest or client specifically requests details for a list of series IDs (e.g. from local storage)
    if (idsParam) {
      const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ favorites: [] });
      }

      const adminSupabase = createAdminClient();
      const [seriesRes, viewsMap] = await Promise.all([
        adminSupabase
          .from('series')
          .select('*, seasons(is_published, episodes(is_published))')
          .in('id', ids),
        getSeriesViewsMap('all').catch(() => ({} as Record<string, number>))
      ]);

      const seriesList = seriesRes.data || [];
      const sorted = [...seriesList].sort((a, b) => {
        const idxA = ids.indexOf(a.id);
        const idxB = ids.indexOf(b.id);
        return idxA - idxB;
      });

      const formattedFavorites = sorted.map((s) => ({
        id: s.id,
        series_id: s.id,
        created_at: s.created_at,
        series: {
          ...s,
          views: viewsMap[s.id] || 0,
        },
      }));

      return NextResponse.json({ favorites: formattedFavorites });
    }

    if (!user) {
      return NextResponse.json({ isFavorite: false, favorites: [] });
    }

    const userFavs: string[] = Array.isArray(user.user_metadata?.favorites)
      ? user.user_metadata.favorites
      : [];

    if (seriesId) {
      const isFavorite = userFavs.includes(seriesId);
      return NextResponse.json({ isFavorite });
    }

    if (userFavs.length === 0) {
      return NextResponse.json({ favorites: [] });
    }

    // Fetch full series details for these IDs along with views map
    const adminSupabase = createAdminClient();
    const [seriesRes, viewsMap] = await Promise.all([
      adminSupabase
        .from('series')
        .select('*, seasons(is_published, episodes(is_published))')
        .in('id', userFavs),
      getSeriesViewsMap('all').catch(() => ({} as Record<string, number>))
    ]);

    if (seriesRes.error || !seriesRes.data) {
      console.error('Error fetching favorite series:', seriesRes.error);
      return NextResponse.json({ favorites: [] });
    }

    // Sort matching order of favorites (newest first)
    const sorted = [...seriesRes.data].sort((a, b) => {
      const idxA = userFavs.indexOf(a.id);
      const idxB = userFavs.indexOf(b.id);
      return idxB - idxA;
    });

    const formattedFavorites = sorted.map((s) => ({
      id: s.id,
      series_id: s.id,
      created_at: s.created_at,
      series: {
        ...s,
        views: viewsMap[s.id] || 0,
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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { series_id, series_ids } = body;

    const currentFavs: string[] = Array.isArray(user.user_metadata?.favorites)
      ? [...user.user_metadata.favorites]
      : [];

    let updatedFavs = [...currentFavs];
    let isFavorite = false;

    // Support batch merge (e.g. sync local favorites upon login)
    if (Array.isArray(series_ids) && series_ids.length > 0) {
      for (const id of series_ids) {
        if (typeof id === 'string' && id && !updatedFavs.includes(id)) {
          updatedFavs.push(id);
        }
      }
      isFavorite = true;
    } else if (series_id) {
      const idx = updatedFavs.indexOf(series_id);
      if (idx > -1) {
        updatedFavs.splice(idx, 1);
        isFavorite = false;
      } else {
        updatedFavs.push(series_id);
        isFavorite = true;
      }
    } else {
      return NextResponse.json({ error: 'Missing series_id' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        favorites: updatedFavs,
      },
    });

    if (updateError) {
      console.error('Error updating user favorites metadata:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ isFavorite, favorites: updatedFavs });
  } catch (err: any) {
    console.error('Error in POST /api/favorites:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('series_id');
    const clearAll = searchParams.get('all') === 'true';

    let updatedFavs: string[] = [];

    if (!clearAll && seriesId) {
      const currentFavs: string[] = Array.isArray(user.user_metadata?.favorites)
        ? user.user_metadata.favorites
        : [];
      updatedFavs = currentFavs.filter((id) => id !== seriesId);
    }

    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        favorites: updatedFavs,
      },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, favorites: updatedFavs });
  } catch (err: any) {
    console.error('Error in DELETE /api/favorites:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}
