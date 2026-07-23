import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ inWatchlist: false });
    }

    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('series_id');

    if (!seriesId) {
      return NextResponse.json({ error: 'Missing series_id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('watchlist')
      .select('id')
      .eq('profile_id', user.id)
      .eq('series_id', seriesId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ inWatchlist: !!data });
  } catch (err: any) {
    console.error('Error checking watchlist status:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
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
    if (!series_id) {
      return NextResponse.json({ error: 'Missing series_id' }, { status: 400 });
    }

    // 1. Check if already exists
    const { data: existing } = await supabase
      .from('watchlist')
      .select('id')
      .eq('profile_id', user.id)
      .eq('series_id', series_id)
      .maybeSingle();

    if (existing) {
      // 2. Delete it (remove from watchlist)
      const { error: deleteError } = await supabase
        .from('watchlist')
        .delete()
        .eq('profile_id', user.id)
        .eq('series_id', series_id);

      if (deleteError) throw deleteError;
      return NextResponse.json({ inWatchlist: false });
    } else {
      // 3. Insert it (add to watchlist)
      const { error: insertError } = await supabase
        .from('watchlist')
        .insert({
          profile_id: user.id,
          series_id,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
      return NextResponse.json({ inWatchlist: true });
    }
  } catch (err: any) {
    console.error('Error toggling watchlist:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}
