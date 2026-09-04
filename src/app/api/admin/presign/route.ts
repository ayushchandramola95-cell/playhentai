import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request: Request) {
  try {
    // 1. Verify admin role
    await verifyAdmin();

    const { filename, contentType } = await request.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;

    // Check if R2 is configured
    if (!bucketName || !accessKeyId || !secretAccessKey || !endpoint) {
      console.error('Cloudflare R2 environment variables are missing on this server.');
      return NextResponse.json({
        error: 'Cloudflare R2 environment variables are not configured on this server. Please add CLOUDFLARE_R2_BUCKET_NAME, CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY to your hosting settings.',
      }, { status: 500 });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const sanitizedName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `uploads/${Date.now()}-${sanitizedName}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return NextResponse.json({ url, key, isMock: false });
  } catch (err: any) {
    console.error('Error generating presigned R2 URL:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
