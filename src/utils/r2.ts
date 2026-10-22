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

  // If the key is already a full external URL (e.g. AWS S3, CloudFront, Cloudflare R2, Unsplash, etc.)
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

  // Support both AWS S3 CDN and Cloudflare R2 CDN endpoints
  const baseUrl =
    process.env.NEXT_PUBLIC_S3_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    'https://media.hentaikage.cc';
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
  let text = 'No Image';

  switch (type) {
    case 'cover':
      width = 640;
      height = 360;
      text = 'Cover Placeholder';
      break;
    case 'banner':
      width = 1200;
      height = 400;
      text = 'Banner Placeholder';
      break;
    case 'thumbnail':
      width = 480;
      height = 270;
      text = 'Episode Preview';
      break;
    case 'video':
      return '';
    case 'avatar':
      width = 100;
      height = 100;
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 100 100" fill="%231e293b"><circle cx="50" cy="40" r="20" fill="%2394a3b8"/><path d="M20,80 C20,60 30,55 50,55 C70,55 80,60 80,80 Z" fill="%2394a3b8"/><rect width="100" height="100" fill="none" stroke="%23334155" stroke-width="4"/></svg>`;
  }

  // Create an elegant SVG placeholder representing the missing layout aspect ratios
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="%230f172a" />
    <rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" fill="none" stroke="%231e293b" stroke-width="2" rx="8" />
    <defs>
      <radialGradient id="grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%231e293b" stop-opacity="1" />
        <stop offset="100%" stop-color="%230f172a" stop-opacity="1" />
      </radialGradient>
    </defs>
    <rect x="4" y="4" width="calc(100% - 8px)" height="calc(100% - 8px)" fill="url(%23grad)" rx="6" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="%2364748b">${text}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
