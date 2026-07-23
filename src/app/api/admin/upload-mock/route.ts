import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    // Read body as arrayBuffer to simulate file download time
    await request.arrayBuffer();
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error handling mock upload:', err);
    return NextResponse.json({ error: 'Upload Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
