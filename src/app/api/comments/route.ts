import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUserFromCookies } from '@/utils/authStore';
import { getLocalCatalog } from '@/utils/localCatalogStore';

export const dynamic = 'force-dynamic';

export interface StoredComment {
  id: string;
  episode_id: string;
  profile_id: string;
  content: string;
  created_at: string;
  status: 'approved' | 'pending';
  profiles?: {
    username: string | null;
    role: string;
  };
  seriesTitle?: string;
  seriesSlug?: string | null;
  episodeTitle?: string;
  posterKey?: string | null;
  likes?: number;
  gif_url?: string | null;
}

interface CommentsStore {
  comments: StoredComment[];
}

const STORE_PATH = path.join(process.cwd(), 'src', 'utils', 'comments_store.json');
let memoryStore: CommentsStore | null = null;

function getStore(): CommentsStore {
  if (memoryStore) return memoryStore;

  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.comments)) {
        memoryStore = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading comments store:', err);
  }

  const fallback: CommentsStore = { comments: [] };
  memoryStore = fallback;
  return fallback;
}

function saveStore(store: CommentsStore) {
  memoryStore = store;
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving comments store:', err);
  }
}

// GET: Returns comments for a specific episode or global list for Admin Moderation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode_id');
    const store = getStore();

    // 1. Episode-Specific Comments (for Public Video Watch Pages)
    if (episodeId) {
      const episodeComments = store.comments.filter(c => c.episode_id === episodeId);
      return NextResponse.json({ comments: episodeComments });
    }

    // 2. Global Moderation Comments (for Admin Intelligence Analytics)
    // Sort latest comments first
    const sortedComments = [...store.comments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ comments: sortedComments });
  } catch (err: any) {
    console.error('Error in GET /api/comments:', err);
    return NextResponse.json({ comments: [] });
  }
}

// POST: Add new comment from Watch Page
export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);

    if (!payload || !payload.episode_id || (!payload.content?.trim() && !payload.gif_url)) {
      return NextResponse.json({ error: 'Missing episode_id or comment content' }, { status: 400 });
    }

    const { episode_id, content, gif_url } = payload;

    // Detect user session if authenticated from EC2 memory / cookie session
    let username = 'Anonymous Visitor';
    let role = 'user';
    let profileId = `guest-${Date.now()}`;

    try {
      const user = await getCurrentUserFromCookies();
      if (user) {
        profileId = user.id;
        username = user.username || user.email?.split('@')[0] || 'User';
        role = user.role || 'user';
      }
    } catch {
      // Guest comment allowed
    }

    // Look up parent episode and series details from in-memory catalog
    let seriesTitle = 'General Discussion';
    let seriesSlug: string | null = null;
    let episodeTitle = 'Episode 1';
    let posterKey: string | null = null;

    try {
      const catalog = await getLocalCatalog();
      const ep = catalog.episodes.find(e => e.id === episode_id);
      if (ep) {
        episodeTitle = ep.title ? `Ep ${ep.episode_number}: ${ep.title}` : `Episode ${ep.episode_number}`;
        const season = catalog.seasons.find(s => s.id === ep.season_id);
        if (season) {
          const series = catalog.series.find(sr => sr.id === season.series_id);
          if (series) {
            seriesTitle = series.title;
            seriesSlug = series.slug;
            posterKey = series.poster_image_key;
          }
        }
      }
    } catch (metaErr) {
      console.warn('Metadata lookup fallback for comment:', metaErr);
    }

    const newComment: StoredComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      episode_id,
      profile_id: profileId,
      content: (content || '').trim() || (gif_url ? 'Sent a GIF' : ''),
      created_at: new Date().toISOString(),
      status: role === 'admin' ? 'approved' : 'pending',
      profiles: {
        username,
        role
      },
      seriesTitle,
      seriesSlug,
      episodeTitle,
      posterKey,
      gif_url: gif_url || null,
      likes: 0
    };

    const store = getStore();
    store.comments.unshift(newComment);
    saveStore(store);

    return NextResponse.json({ success: true, comment: newComment });
  } catch (err: any) {
    console.error('Error posting comment:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit comment' }, { status: 500 });
  }
}

// PATCH: Approve or update comment moderation status
export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json().catch(() => ({}));
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing comment ID or status' }, { status: 400 });
    }

    const store = getStore();
    const commentIndex = store.comments.findIndex(c => c.id === id);
    if (commentIndex === -1) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    store.comments[commentIndex].status = status;
    saveStore(store);

    return NextResponse.json({ success: true, comment: store.comments[commentIndex] });
  } catch (err: any) {
    console.error('Error updating comment:', err);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

// DELETE: Delete single or bulk comments
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');

    if (!id && !ids) {
      return NextResponse.json({ error: 'Missing comment ID or IDs' }, { status: 400 });
    }

    const store = getStore();
    if (ids) {
      const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
      store.comments = store.comments.filter(c => !idList.includes(c.id));
      saveStore(store);
      return NextResponse.json({ success: true, count: idList.length });
    }

    if (id) {
      store.comments = store.comments.filter(c => c.id !== id);
      saveStore(store);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting comment:', err);
    return NextResponse.json({ success: true });
  }
}
