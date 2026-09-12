import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

  const opensearchXml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/"
                       xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>Play Hentai</ShortName>
  <Description>Search anime series and episodes on Play Hentai</Description>
  <Tags>anime hentai streaming episodes series</Tags>
  <Contact>contact@playhentai.live</Contact>
  <Url type="text/html" template="${baseUrl}/search?q={searchTerms}"/>
  <Image width="16" height="16" type="image/x-icon">${baseUrl}/favicon.ico</Image>
  <Image width="192" height="192" type="image/png">${baseUrl}/icon-192x192.png</Image>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
  <moz:SearchForm>${baseUrl}/search</moz:SearchForm>
</OpenSearchDescription>`;

  return new NextResponse(opensearchXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/opensearchdescription+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
