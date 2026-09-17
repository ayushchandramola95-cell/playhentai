import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { MOCK_SERIES } from '@/utils/mockData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ybtbdtgtryrxrhuchlkw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HLX-SCL51o2H254WH-gN0Q_HPpNwKo5';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

const getCachedSearchAutocomplete = unstable_cache(
  async (cleanQuery: string) => {
    let results: any[] = [];
    let isDbEmpty = true;

    try {
      const { data, error } = await publicSupabaseClient
        .from('series')
        .select('id, title, slug, description, poster_image_key, tags, studio')
        .eq('is_published', true)
        .or(`title.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`)
        .limit(10);

      if (!error && data) {
        isDbEmpty = false;
        results = data;
      }
    } catch (err) {
      console.error('Database search error:', err);
    }

    const activeResults = isDbEmpty
      ? MOCK_SERIES.filter(item =>
          item.title.toLowerCase().includes(cleanQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(cleanQuery.toLowerCase())
        ).slice(0, 10)
      : results;

    return activeResults;
  },
  ['api-search-autocomplete-cache-v1'],
  { revalidate: 120, tags: ['search_results'] }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q') || '';
    const query = rawQuery.replace(/[,().%\\"]/g, '').trim();

    if (!query) {
      return NextResponse.json(
        { series: [] },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
      );
    }

    const activeResults = await getCachedSearchAutocomplete(query);

    return NextResponse.json(
      { series: activeResults },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
    );
  } catch (err: any) {
    console.error('Error in search api:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
