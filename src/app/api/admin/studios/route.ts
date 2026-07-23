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

// Create a new studio
export async function POST(request: Request) {
  try {
    const { supabase } = await verifyAdmin();
    const { name, slug } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing name or slug fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('studios')
      .insert({ name, slug, created_at: new Date().toISOString() })
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

// Delete a studio
export async function DELETE(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing studio ID' }, { status: 400 });
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
