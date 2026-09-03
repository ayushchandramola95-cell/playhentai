import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';

// Get list of studios
export async function GET() {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('studios')
      .select('*')
      .order('name');

    if (error) throw error;
    return NextResponse.json({ studios: data });
  } catch (err: any) {
    console.error('Error fetching admin studios:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

// Create a new studio or batch insert
export async function POST(request: Request) {
  try {
    const { supabase } = await verifyAdmin();
    const body = await request.json();

    // Check if batch insert
    if (Array.isArray(body.items)) {
      const validItems = body.items
        .filter((item: any) => item.name && item.slug)
        .map((item: any) => ({
          name: item.name.trim(),
          slug: item.slug.trim(),
          created_at: new Date().toISOString()
        }));

      if (validItems.length === 0) {
        return NextResponse.json({ error: 'No valid studios provided for batch insertion' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('studios')
        .upsert(validItems, { onConflict: 'slug' })
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, count: data?.length || 0, studios: data });
    }

    const { name, slug } = body;
    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing name or slug fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('studios')
      .insert({ name: name.trim(), slug: slug.trim(), created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, studio: data });
  } catch (err: any) {
    console.error('Error creating studio:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

// Update a studio (with optional series.studio rename cascade)
export async function PUT(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { id, name, slug, oldName, cascadeSeries = true } = await request.json();

    if (!id || !name || !slug) {
      return NextResponse.json({ error: 'Missing id, name, or slug' }, { status: 400 });
    }

    // 1. Update the studio in database
    const { data: updatedStudio, error: studioErr } = await adminSupabase
      .from('studios')
      .update({ name: name.trim(), slug: slug.trim() })
      .eq('id', id)
      .select()
      .single();

    if (studioErr) throw studioErr;

    // 2. Cascade rename across series.studio if requested
    let affectedSeriesCount = 0;
    if (cascadeSeries && oldName && oldName.trim() !== name.trim()) {
      const oldNameClean = oldName.trim();
      const newNameClean = name.trim();

      const { data: updatedSeries, error: sErr } = await adminSupabase
        .from('series')
        .update({ studio: newNameClean })
        .ilike('studio', oldNameClean)
        .select('id');

      if (!sErr && updatedSeries) {
        affectedSeriesCount = updatedSeries.length;
      }
    }

    return NextResponse.json({ 
      success: true, 
      studio: updatedStudio, 
      affectedSeriesCount 
    });
  } catch (err: any) {
    console.error('Error updating studio:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

// Delete one or multiple studios
export async function DELETE(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');

    if (!id && !ids) {
      return NextResponse.json({ error: 'Missing studio ID or IDs' }, { status: 400 });
    }

    if (ids) {
      const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
      const { error } = await adminSupabase
        .from('studios')
        .delete()
        .in('id', idList);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedCount: idList.length });
    }

    const { error } = await adminSupabase
      .from('studios')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting studio:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
