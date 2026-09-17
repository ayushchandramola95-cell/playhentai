import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static resources:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - SEO & Feeds (robots.txt, sitemaps, feeds, manifests)
     * - Images / vector resources (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap.*\\.xml|feed\\.xml|rss\\.xml|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
