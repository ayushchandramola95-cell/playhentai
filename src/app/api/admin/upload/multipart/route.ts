import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client() {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;

  if (!bucketName || !accessKeyId || !secretAccessKey || !endpoint) {
    return null;
  }

  return {
    bucketName,
    client: new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
  };
}

export async function POST(request: Request) {
  try {
    // 1. Verify admin permissions
    await verifyAdmin();

    const body = await request.json();
    const { action } = body;

    const s3Config = getS3Client();

    // Fallback if R2 credentials are missing in local development
    if (!s3Config) {
      if (action === 'init') {
        const mockKey = `uploads/${Date.now()}-${body.filename || 'file'}`;
        return NextResponse.json({
          uploadId: `mock-upload-${Date.now()}`,
          key: mockKey,
          isMock: true,
        });
      }
      if (action === 'sign-parts') {
        const parts = (body.partNumbers || [1]).map((num: number) => ({
          partNumber: num,
          url: `/api/admin/upload-mock?key=${body.key}&part=${num}`,
        }));
        return NextResponse.json({ parts, isMock: true });
      }
      if (action === 'complete') {
        return NextResponse.json({ success: true, key: body.key, isMock: true });
      }
      if (action === 'abort') {
        return NextResponse.json({ success: true, isMock: true });
      }
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const { client, bucketName } = s3Config;

    // Action 1: INIT - Start Multipart Upload
    if (action === 'init') {
      const { filename, contentType } = body;
      if (!filename) {
        return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
      }

      // Sanitize key name
      const sanitizedName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const key = `uploads/${Date.now()}-${sanitizedName}`;

      const command = new CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType || 'video/mp4',
      });

      const response = await client.send(command);

      return NextResponse.json({
        uploadId: response.UploadId,
        key,
        isMock: false,
      });
    }

    // Action 2: SIGN-PARTS - Generate presigned URLs for part chunks
    if (action === 'sign-parts') {
      const { key, uploadId, partNumbers } = body;
      if (!key || !uploadId || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        return NextResponse.json({ error: 'Missing key, uploadId, or partNumbers array' }, { status: 400 });
      }

      const signedParts = await Promise.all(
        partNumbers.map(async (partNumber: number) => {
          const command = new UploadPartCommand({
            Bucket: bucketName,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
          });
          const url = await getSignedUrl(client, command, { expiresIn: 7200 });
          return {
            partNumber,
            url,
          };
        })
      );

      return NextResponse.json({ parts: signedParts });
    }

    // Action 3: COMPLETE - Stitch and assemble parts into a single intact file
    if (action === 'complete') {
      const { key, uploadId, parts } = body;
      if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
        return NextResponse.json({ error: 'Missing key, uploadId, or parts array' }, { status: 400 });
      }

      // Sort parts numerically ascending as required by S3/R2 specification
      const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

      const command = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sortedParts.map(p => ({
            PartNumber: p.PartNumber,
            ETag: p.ETag,
          })),
        },
      });

      const response = await client.send(command);

      return NextResponse.json({
        success: true,
        key,
        location: response.Location || key,
        eTag: response.ETag,
      });
    }

    // Action 4: ABORT - Cancel and clean up unfinished multipart upload
    if (action === 'abort') {
      const { key, uploadId } = body;
      if (key && uploadId) {
        try {
          const command = new AbortMultipartUploadCommand({
            Bucket: bucketName,
            Key: key,
            UploadId: uploadId,
          });
          await client.send(command);
        } catch (abortErr) {
          console.warn('Failed to abort multipart upload:', abortErr);
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Error in multipart upload API:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
