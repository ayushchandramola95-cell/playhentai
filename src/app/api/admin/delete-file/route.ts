import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import { deleteStorageObject, deleteStorageObjects, deleteStoragePrefix } from '@/utils/s3Storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await verifyAdmin();

    const body = await request.json().catch(() => ({}));
    const { key, keys, prefix } = body;

    if (!key && (!keys || keys.length === 0) && !prefix) {
      return NextResponse.json({ error: 'Missing key, keys, or prefix parameter.' }, { status: 400 });
    }

    // 1. Prefix deletion (e.g. all files in a folder like "videos/ep-123/")
    if (prefix) {
      const deletedCount = await deleteStoragePrefix(prefix);
      return NextResponse.json({ success: true, count: deletedCount, prefix });
    }

    // 2. Batch deletion (array of keys)
    if (Array.isArray(keys) && keys.length > 0) {
      const deletedCount = await deleteStorageObjects(keys);
      return NextResponse.json({ success: true, count: deletedCount, keys });
    }

    // 3. Single key deletion
    if (key) {
      const ok = await deleteStorageObject(key);
      return NextResponse.json({ success: ok, key });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DeleteFileAPI] Error deleting storage object(s):', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
