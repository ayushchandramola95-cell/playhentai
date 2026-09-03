import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';
import { getSeriesViewsMap } from '@/utils/views';

export async function GET() {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();

    // Fetch all series with valid database columns
    const { data: allSeries, error } = await adminSupabase
      .from('series')
      .select('id, title, slug, poster_image_key, cover_image_key, banner_image_key, image_library, description, tags, is_published, studio')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch views map safely
    const viewsMap: Record<string, number> = await getSeriesViewsMap().catch(() => ({}));

    // Attach views and map description to synopsis + resolve image_library
    const formattedSeries = (allSeries || []).map((s) => {
      let poster = s.poster_image_key;
      let cover = s.cover_image_key || s.banner_image_key;

      if (!poster && Array.isArray(s.image_library)) {
        const pObj = s.image_library.find((img: any) => img.role === 'poster');
        if (pObj?.key) poster = pObj.key;
      }
      if (!cover && Array.isArray(s.image_library)) {
        const cObj = s.image_library.find((img: any) => img.role === 'cover' || img.role === 'banner');
        if (cObj?.key) cover = cObj.key;
      }

      return {
        ...s,
        poster_image_key: poster || s.poster_image_key,
        cover_image_key: cover || s.cover_image_key,
        banner_image_key: s.banner_image_key || cover || poster,
        synopsis: s.description || '',
        views: viewsMap[s.id] || 0,
      };
    });

    // Determine currently featured series and their order
    const featuredItems: { id: string; order: number }[] = [];

    formattedSeries.forEach((s) => {
      const featuredTag = s.tags?.find((t: string) => t.toLowerCase().startsWith('featured:'));
      if (featuredTag) {
        const orderNum = parseInt(featuredTag.split(':')[1], 10) || 999;
        featuredItems.push({ id: s.id, order: orderNum });
      } else if (s.tags?.includes('featured')) {
        // Handle legacy/plain featured tag
        featuredItems.push({ id: s.id, order: 999 });
      }
    });

    // Sort featured IDs by order
    featuredItems.sort((a, b) => a.order - b.order);
    const sortedFeaturedIds = featuredItems.map((item) => item.id);

    return NextResponse.json({
      series: formattedSeries,
      featured: sortedFeaturedIds,
    });
  } catch (err: any) {
    console.error('Error fetching featured series config:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { seriesIds } = await request.json();

    if (!Array.isArray(seriesIds)) {
      return NextResponse.json({ error: 'seriesIds must be an array of IDs' }, { status: 400 });
    }

    // Fetch all series to get their current tags
    const { data: allSeries, error: fetchError } = await adminSupabase
      .from('series')
      .select('id, tags');

    if (fetchError) throw fetchError;

    // Update tags for each series
    for (const s of allSeries || []) {
      // 1. Filter out any existing 'featured' or 'featured:X' tags
      let newTags = (s.tags || []).filter(
        (t: string) => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:')
      );

      // 2. If it is featured in the new list, add its order tag
      const index = seriesIds.indexOf(s.id);
      if (index !== -1) {
        newTags.push(`featured:${index + 1}`);
      }

      // 3. Update the series
      const { error: updateError } = await adminSupabase
        .from('series')
        .update({ tags: newTags })
        .eq('id', s.id);

      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating featured series config:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
