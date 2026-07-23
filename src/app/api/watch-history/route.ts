import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Get active user session server-side
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request payload
    const { episode_id, last_position_seconds, duration_seconds } = await request.json();

    if (!episode_id || last_position_seconds === undefined || !duration_seconds) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 3. Calculate percentage and completion status
    const watched_percentage = Math.min(
      100,
      Math.round((last_position_seconds / duration_seconds) * 100)
    );
    const completed = watched_percentage > 90;

    // 4. Upsert into database
    const { error: upsertError } = await supabase
      .from('watch_history')
      .upsert(
        {
          profile_id: user.id,
          episode_id,
          last_position_seconds,
          watched_percentage,
          completed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,episode_id' }
      );

    if (upsertError) {
      console.error('Database error upserting watch history:', upsertError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, completed, watched_percentage });
  } catch (err) {
    console.error('Server error handling watch progress:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('watch_history')
      .delete()
      .eq('profile_id', user.id);

    if (deleteError) {
      console.error('Error clearing watch history:', deleteError);
      return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Server error clearing watch history:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
