import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';

// Get list of categories
export async function GET() {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return NextResponse.json({ categories: data });
  } catch (err: any) {
    console.error('Error fetching admin categories:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

// Create a new category or batch insert
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
        return NextResponse.json({ error: 'No valid categories provided for batch insertion' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('categories')
        .upsert(validItems, { onConflict: 'slug' })
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, count: data?.length || 0, categories: data });
    }

    const { name, slug } = body;
    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing name or slug fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: name.trim(), slug: slug.trim(), created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, category: data });
  } catch (err: any) {
    console.error('Error creating category:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

// Update a category (with optional series tags rename cascade)
export async function PUT(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { id, name, slug, oldName, cascadeSeries = true } = await request.json();

    if (!id || !name || !slug) {
      return NextResponse.json({ error: 'Missing id, name, or slug' }, { status: 400 });
    }

    // 1. Update the category in database
    const { data: updatedCat, error: catErr } = await adminSupabase
      .from('categories')
      .update({ name: name.trim(), slug: slug.trim() })
      .eq('id', id)
      .select()
      .single();

    if (catErr) throw catErr;

    // 2. Cascade rename across series tags if requested
    let affectedSeriesCount = 0;
    if (cascadeSeries && oldName && oldName.trim() !== name.trim()) {
      const oldNameLower = oldName.trim().toLowerCase();
      const newNameClean = name.trim();

      const { data: seriesList, error: sErr } = await adminSupabase
        .from('series')
        .select('id, tags');

      if (!sErr && seriesList) {
        for (const s of seriesList) {
          const currentTags: string[] = s.tags || [];
          const hasOld = currentTags.some(t => t.trim().toLowerCase() === oldNameLower);
          if (hasOld) {
            const newTags = currentTags.map(t => 
              t.trim().toLowerCase() === oldNameLower ? newNameClean : t
            );
            // Deduplicate
            const uniqueTags = Array.from(new Set(newTags));
            await adminSupabase.from('series').update({ tags: uniqueTags }).eq('id', s.id);
            affectedSeriesCount++;
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      category: updatedCat, 
      affectedSeriesCount 
    });
  } catch (err: any) {
    console.error('Error updating category:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

// Delete one or multiple categories
export async function DELETE(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');

    if (!id && !ids) {
      return NextResponse.json({ error: 'Missing category ID or IDs' }, { status: 400 });
    }

    if (ids) {
      const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
      const { error } = await adminSupabase
        .from('categories')
        .delete()
        .in('id', idList);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedCount: idList.length });
    }

    const { error } = await adminSupabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting category:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
