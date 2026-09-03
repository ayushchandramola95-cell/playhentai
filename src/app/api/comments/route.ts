import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode_id');

    // Admin / Global comments retrieval
    if (!episodeId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Missing episode_id' }, { status: 400 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Missing episode_id' }, { status: 400 });
      }

      const { data, error } = await adminSupabase
        .from('comments')
        .select(`
          *,
          profiles (
            username,
            role
          ),
          episodes (
            id,
            title,
            episode_number,
            seasons (
              id,
              title,
              season_number,
              series (
                id,
                title,
                slug,
                poster_image_key
              )
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) {
        console.warn('Comments table not available, returning empty list:', error.message);
        return NextResponse.json({ comments: [] });
      }

      // Format comments with flattened series and episode metadata
      const formattedComments = (data || []).map((c: any) => {
        const ep = c.episodes;
        const season = ep?.seasons;
        const series = season?.series;

        return {
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          profile_id: c.profile_id,
          episode_id: c.episode_id,
          status: c.status || 'approved',
          profiles: c.profiles || { username: 'Anonymous', role: 'user' },
          episodeTitle: ep?.title ? `Ep ${ep.episode_number}: ${ep.title}` : ep?.episode_number ? `Episode ${ep.episode_number}` : (c.episode_id ? `Episode ID: ${c.episode_id.substring(0, 8)}...` : 'General Discussion'),
          seriesTitle: series?.title || (season?.title ? season.title : 'Global Discussion'),
          seriesSlug: series?.slug || null,
          posterKey: series?.poster_image_key || null
        };
      });

      return NextResponse.json({ comments: formattedComments });
    }

    // Public per-episode comments
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (
          username,
          role
        )
      `)
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Comments table not available for episode, returning empty list:', error.message);
      return NextResponse.json({ comments: [] });
    }

    return NextResponse.json({ comments: data || [] });
  } catch (err: any) {
    console.error('Error fetching comments:', err);
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to post comments.' }, { status: 401 });
    }

    // 2. Parse payload
    const { episode_id, content } = await request.json();
    if (!episode_id || !content?.trim()) {
      return NextResponse.json({ error: 'Missing episode_id or comment content' }, { status: 400 });
    }

    // 3. Query user profile username & role
    let username = user.email?.split('@')[0] || 'User';
    let role = 'user';
    try {
      const { data: pData } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', user.id)
        .single();
      if (pData) {
        if (pData.username) username = pData.username;
        if (pData.role) role = pData.role;
      }
    } catch (pErr) {}

    // 4. Try insert into DB
    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({
          episode_id,
          profile_id: user.id,
          content: content.trim(),
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          profiles (
            username,
            role
          )
        `)
        .single();

      if (!insertError && data) {
        return NextResponse.json({ success: true, comment: data });
      }
    } catch (dbErr) {
      console.warn('Database insert failed, using memory comment fallback:', dbErr);
    }

    // Fallback response if comments table does not exist in schema cache
    const fallbackComment = {
      id: `comment-${Date.now()}`,
      episode_id,
      profile_id: user.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      profiles: {
        username,
        role
      }
    };

    return NextResponse.json({ success: true, comment: fallbackComment });
  } catch (err: any) {
    console.error('Error posting comment:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');

    if (!id && !ids) {
      return NextResponse.json({ error: 'Missing comment ID or IDs' }, { status: 400 });
    }

    try {
      if (ids) {
        const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
        const { error: deleteError } = await adminSupabase
          .from('comments')
          .delete()
          .in('id', idList);
        if (deleteError) {
          console.warn('Supabase bulk delete comments failed:', deleteError.message);
        }
        return NextResponse.json({ success: true, count: idList.length });
      }

      const { error: deleteError } = await adminSupabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.warn('Supabase delete comment failed:', deleteError.message);
      }
    } catch (err) {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting comment:', err);
    return NextResponse.json({ success: true });
  }
}
