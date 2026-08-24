import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const getStorePath = () => path.join(process.cwd(), 'src', 'utils', 'playlists_store.json');

function getPlaylistsFromStore(): any[] {
  try {
    const filePath = getStorePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading playlists_store.json:', err);
  }
  return [];
}

function writePlaylistsToStore(playlists: any[]) {
  try {
    const filePath = getStorePath();
    fs.writeFileSync(filePath, JSON.stringify(playlists, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing to playlists_store.json:', err);
    return false;
  }
}

export async function GET() {
  try {
    await verifyAdmin();
    const playlists = getPlaylistsFromStore();
    return NextResponse.json({ playlists });
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const payload = await request.json();
    const { name, slug, description, categoryTag, gradient, seriesSlugs } = payload;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required fields.' }, { status: 400 });
    }

    const playlists = getPlaylistsFromStore();

    // Check if slug is unique
    if (playlists.some((p: any) => p.slug === slug)) {
      return NextResponse.json({ error: 'A playlist with this slug already exists.' }, { status: 400 });
    }

    const newPlaylist = {
      id: `col-${Date.now()}`,
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''),
      description: description || '',
      categoryTag: categoryTag || 'Featured',
      gradient: gradient || 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
      seriesSlugs: Array.isArray(seriesSlugs) ? seriesSlugs : [],
    };

    playlists.push(newPlaylist);
    writePlaylistsToStore(playlists);

    return NextResponse.json({ playlist: newPlaylist });
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    await verifyAdmin();
    const payload = await request.json();
    const { id, name, slug, description, categoryTag, gradient, seriesSlugs } = payload;

    if (!id || !name || !slug) {
      return NextResponse.json({ error: 'ID, name, and slug are required fields.' }, { status: 400 });
    }

    const playlists = getPlaylistsFromStore();
    const index = playlists.findIndex((p: any) => p.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Playlist not found.' }, { status: 404 });
    }

    // Check if new slug is unique among other playlists
    if (playlists.some((p: any) => p.slug === slug && p.id !== id)) {
      return NextResponse.json({ error: 'A playlist with this slug already exists.' }, { status: 400 });
    }

    const updatedPlaylist = {
      ...playlists[index],
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''),
      description: description || '',
      categoryTag: categoryTag || 'Featured',
      gradient: gradient || 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
      seriesSlugs: Array.isArray(seriesSlugs) ? seriesSlugs : [],
    };

    playlists[index] = updatedPlaylist;
    writePlaylistsToStore(playlists);

    return NextResponse.json({ playlist: updatedPlaylist });
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Playlist ID is required.' }, { status: 400 });
    }

    const playlists = getPlaylistsFromStore();
    const filtered = playlists.filter((p: any) => p.id !== id);

    if (playlists.length === filtered.length) {
      return NextResponse.json({ error: 'Playlist not found.' }, { status: 404 });
    }

    writePlaylistsToStore(filtered);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}
