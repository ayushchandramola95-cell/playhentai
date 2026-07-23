import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: Request) {
  try {
    // 1. Verify admin role
    await verifyAdmin();

    const { key } = await request.json();
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Ignore mock paths (e.g. Unsplash placeholders or mock keys)
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return NextResponse.json({ success: true, message: 'External URL bypassed' });
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;

    // Check if R2 is configured
    if (!bucketName || !accessKeyId || !secretAccessKey || !endpoint) {
      console.log(`Mock R2 mode: bypassed deletion for key "${key}"`);
      return NextResponse.json({ success: true, message: 'Simulated deletion successful' });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3.send(command);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting R2 object:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
