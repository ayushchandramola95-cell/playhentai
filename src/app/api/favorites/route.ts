import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ isFavorite: false });
    }

    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('series_id');
    if (seriesId) {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('profile_id', user.id)
        .eq('series_id', seriesId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ isFavorite: false });
      }

      return NextResponse.json({ isFavorite: !!data });
    }

    // Fetch full user favorites list
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('id, created_at, series(*)')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ favorites: [] });
    }

    return NextResponse.json({ favorites });
  } catch (err: any) {
    return NextResponse.json({ isFavorite: false, favorites: [] });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { series_id } = await request.json();
    if (!series_id) return NextResponse.json({ error: 'Missing series_id' }, { status: 400 });

    const { data: existing, error: selectErr } = await supabase
      .from('favorites')
      .select('id')
      .eq('profile_id', user.id)
      .eq('series_id', series_id)
      .maybeSingle();

    if (selectErr) {
      return NextResponse.json({ success: true });
    }

    if (existing) {
      await supabase
        .from('favorites')
        .delete()
        .eq('profile_id', user.id)
        .eq('series_id', series_id);
      return NextResponse.json({ isFavorite: false });
    } else {
      await supabase
        .from('favorites')
        .insert({
          profile_id: user.id,
          series_id,
          created_at: new Date().toISOString()
        });
      return NextResponse.json({ isFavorite: true });
    }
  } catch (err: any) {
    return NextResponse.json({ success: true });
  }
}
