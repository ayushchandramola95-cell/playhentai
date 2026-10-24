import { NextRequest, NextResponse } from 'next/server';
import { submitLocalSeriesRating } from '@/utils/localCatalogStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seriesId, rating } = body;

    if (!seriesId || typeof rating !== 'number' || rating < 1 || rating > 10) {
      return NextResponse.json({ error: 'Valid seriesId and rating (1-10) are required' }, { status: 400 });
    }

    const result = await submitLocalSeriesRating(seriesId, Math.round(rating));
    if (!result) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      rating: result.newRating,
      voteCount: result.newVoteCount,
      message: 'Rating recorded successfully'
    });
  } catch (err: any) {
    console.error('Error recording series rating:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
