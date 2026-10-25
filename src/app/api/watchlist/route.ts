import { NextResponse } from 'next/server';
import {
  getCurrentUserFromCookies,
  getUserWatchlist,
  toggleUserWatchlist,
  removeUserWatchlist,
  clearUserWatchlist,
} from '@/utils/authStore';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ inWatchlist: false });
    }

    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('series_id');

    if (!seriesId) {
      const watchlist = await getUserWatchlist(user.id);
      return NextResponse.json({ watchlist });
    }

    const watchlist = await getUserWatchlist(user.id);
    const inWatchlist = watchlist.includes(seriesId);

    return NextResponse.json({ inWatchlist });
  } catch (err: any) {
    console.error('Error checking watchlist status:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { series_id } = await request.json();
    if (!series_id) {
      return NextResponse.json({ error: 'Missing series_id' }, { status: 400 });
    }

    const result = await toggleUserWatchlist(user.id, series_id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error toggling watchlist:', err);
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
    const seriesId = searchParams.get('series_id');
    const clearAll = searchParams.get('all') === 'true';

    if (clearAll) {
      await clearUserWatchlist(user.id);
      return NextResponse.json({ success: true, watchlist: [] });
    }

    if (seriesId) {
      const updated = await removeUserWatchlist(user.id, seriesId);
      return NextResponse.json({ success: true, watchlist: updated });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in DELETE /api/watchlist:', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}
