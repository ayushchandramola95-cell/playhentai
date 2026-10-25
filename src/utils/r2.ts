/**
 * Resolves a Cloudflare R2 object key or image URL into a fully qualified, valid RFC 3986 URL.
 */
export function getR2Url(
  key: string | null | undefined,
  fallbackType: 'poster' | 'cover' | 'banner' | 'thumbnail' | 'video' | 'avatar' = 'poster'
): string {
  if (!key || key.trim() === '') {
    return getFallbackUrl(fallbackType);
  }

  let cleanKey = key.trim();

  // If the key is already a full external URL (e.g. AWS S3, CloudFront)
  if (cleanKey.startsWith('http://') || cleanKey.startsWith('https://')) {
    try {
      const parsed = new URL(cleanKey);
      parsed.pathname = parsed.pathname
        .split('/')
        .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
        .join('/');
      return parsed.toString();
    } catch {
      return cleanKey;
    }
  }

  // AWS S3 + CloudFront CDN endpoint
  const baseUrl =
    process.env.NEXT_PUBLIC_S3_PUBLIC_URL ||
    'https://dmfrlqgigpmty.cloudfront.net';

  const sanitizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  if (cleanKey.includes('.r2.dev/')) {
    cleanKey = cleanKey.replace(/^https?:\/\/[^/]+\.r2\.dev\//, '');
  }

  if (cleanKey.startsWith('data:')) {
    return cleanKey;
  }

  const rawKey = cleanKey.startsWith('/') ? cleanKey.slice(1) : cleanKey;
  // Encode every segment so that filenames with spaces or special characters resolve to valid RFC-3986 URIs
  const encodedPath = rawKey
    .split('/')
    .map((seg) => {
      try {
        return encodeURIComponent(decodeURIComponent(seg));
      } catch {
        return encodeURIComponent(seg);
      }
    })
    .join('/');

  return `${sanitizedBase}/${encodedPath}`;
}

/**
 * Returns dynamic placeholder SVGs encoded as Data URLs to prevent layout shifts
 */
function getFallbackUrl(type: string): string {
  let width = 300;
  let height = 450;
  let label = 'POSTER PREVIEW';

  switch (type) {
    case 'cover':
      width = 640;
      height = 360;
      label = 'COVER PREVIEW';
      break;
    case 'banner':
      width = 1200;
      height = 400;
      label = 'BANNER PREVIEW';
      break;
    case 'thumbnail':
      width = 480;
      height = 270;
      label = 'EPISODE PREVIEW';
      break;
    case 'video':
      return '';
    case 'avatar':
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="%231a1a1a"><circle cx="50" cy="40" r="22" fill="%232e2e2e"/><path d="M16,84 C16,62 30,56 50,56 C70,56 84,62 84,84 Z" fill="%232e2e2e"/><rect width="100" height="100" fill="none" stroke="%232e2e2e" stroke-width="2"/></svg>`;
  }

  // Clean, minimalist flat design card (pure matte, no gradients, no glowing effects, no cyberpunk mesh)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <!-- Flat Solid Background -->
    <rect width="100%" height="100%" fill="%23141414" />
    <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="%23242424" stroke-width="2" />

    <!-- Center Icon Box -->
    <g transform="translate(${Math.round(width / 2)}, ${Math.round(height / 2 - 20)})">
      <rect x="-24" y="-24" width="48" height="48" rx="8" fill="%231f1f1f" stroke="%232e2e2e" stroke-width="1.5" />
      <!-- Minimalist TV / Film Play Icon -->
      <rect x="-12" y="-8" width="24" height="17" rx="3" fill="none" stroke="%23888888" stroke-width="1.75" />
      <polygon points="-3,-3 6,0.5 -3,4" fill="%23888888" />
    </g>

    <!-- Clean Flat Typography -->
    <text x="50%" y="${Math.round(height / 2 + 26)}" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="%23d4d4d4">HENTAIKAGE</text>
    <text x="50%" y="${Math.round(height / 2 + 44)}" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" letter-spacing="0.5" fill="%23737373">${label}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
