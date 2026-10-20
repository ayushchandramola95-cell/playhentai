import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getStorageClient } from '@/utils/s3Storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await verifyAdmin();

    const { filename, contentType } = await request.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    const { s3, bucket } = getStorageClient();

    const sanitizedName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `uploads/${Date.now()}-${sanitizedName}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return NextResponse.json({ url, key, isMock: false });
  } catch (err: any) {
    console.error('Error generating presigned storage URL:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
