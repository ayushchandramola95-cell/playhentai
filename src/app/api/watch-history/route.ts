import { NextResponse } from 'next/server';
import {
  getCurrentUserFromCookies,
  getUserWatchHistory,
  upsertUserWatchHistory,
  removeUserWatchHistory,
  clearUserWatchHistory,
} from '@/utils/authStore';

export async function GET() {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ history: [] });
    }

    const history = await getUserWatchHistory(user.id);
    return NextResponse.json({ history });
  } catch (err: any) {
    console.error('Error in GET /api/watch-history:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { episode_id, last_position_seconds, duration_seconds } = await request.json();

    if (!episode_id || last_position_seconds === undefined || !duration_seconds) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const watched_percentage = Math.min(
      100,
      Math.round((last_position_seconds / duration_seconds) * 100)
    );
    const completed = watched_percentage > 90;

    const entry = await upsertUserWatchHistory(user.id, {
      episode_id,
      last_position_seconds,
      duration_seconds,
      watched_percentage,
      completed,
    });

    return NextResponse.json({ success: true, completed, watched_percentage, entry });
  } catch (err: any) {
    console.error('Error in POST /api/watch-history:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode_id');
    const clearAll = searchParams.get('all') === 'true';

    if (clearAll) {
      await clearUserWatchHistory(user.id);
      return NextResponse.json({ success: true, cleared: true });
    }

    if (episodeId) {
      await removeUserWatchHistory(user.id, episodeId);
      return NextResponse.json({ success: true, removed: true });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in DELETE /api/watch-history:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}
