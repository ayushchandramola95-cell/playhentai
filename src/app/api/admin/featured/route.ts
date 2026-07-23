import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';

export async function GET() {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();

    // Fetch all series
    const { data: allSeries, error } = await adminSupabase
      .from('series')
      .select('id, title, slug, poster_image_key, tags, is_published')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Determine currently featured series and their order
    const featuredItems: { id: string; order: number }[] = [];

    (allSeries || []).forEach((s) => {
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
      series: allSeries || [],
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
