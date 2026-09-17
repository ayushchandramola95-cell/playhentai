import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { searchLocalSeries } from '@/utils/localCatalogStore';

const getCachedSearchAutocomplete = unstable_cache(
  async (cleanQuery: string) => {
    return await searchLocalSeries(cleanQuery, 10);
  },
  ['api-search-autocomplete-cache-v2'],
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
