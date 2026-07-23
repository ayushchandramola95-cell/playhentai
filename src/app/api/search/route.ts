import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { MOCK_SERIES } from '@/utils/mockData';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return NextResponse.json({ series: [] });
    }

    const supabase = await createClient();
    let results: any[] = [];
    let isDbEmpty = true;

    try {
      const { data, error } = await supabase
        .from('series')
        .select('id, title, slug, description, poster_image_key, tags, studio')
        .eq('is_published', true)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);

      if (!error && data) {
        results = data;
      }

      const { count } = await supabase.from('series').select('*', { count: 'exact', head: true });
      if (count && count > 0) {
        isDbEmpty = false;
      }
    } catch (err) {
      console.error('Database search error:', err);
    }

    const activeResults = isDbEmpty
      ? MOCK_SERIES.filter(item =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10)
      : results;

    return NextResponse.json({ series: activeResults });
  } catch (err: any) {
    console.error('Error in search api:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
