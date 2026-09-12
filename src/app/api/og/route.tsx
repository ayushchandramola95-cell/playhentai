import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get('title') || 'Play Hentai';
    const subtitle = searchParams.get('subtitle') || 'Watch Anime Online Free in HD';
    const badge = searchParams.get('badge') || 'HD STREAM';
    const rating = searchParams.get('rating') || '9.5';
    const episodes = searchParams.get('episodes') || '';
    const imageUrl = searchParams.get('image') || '';

    // Truncate title if extremely long for clean 1200x630 rendering
    const displayTitle = title.length > 55 ? `${title.slice(0, 52)}...` : title;
    const displaySubtitle = subtitle.length > 70 ? `${subtitle.slice(0, 67)}...` : subtitle;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#080808',
            backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(124, 58, 237, 0.45) 0%, transparent 50%), radial-gradient(circle at 10% 90%, rgba(245, 158, 11, 0.22) 0%, transparent 45%)',
            padding: '50px 60px',
            fontFamily: 'sans-serif',
            position: 'relative',
          }}
        >
          {/* Subtle Outer Glowing Frame */}
          <div
            style={{
              position: 'absolute',
              inset: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              display: 'flex',
              pointerEvents: 'none',
            }}
          />

          {/* Left Column: Content Metadata */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              maxWidth: imageUrl ? '680px' : '1000px',
              zIndex: 2,
            }}
          >
            {/* Top: Brand Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '22px',
                  fontWeight: 900,
                  boxShadow: '0 4px 16px rgba(124, 58, 237, 0.5)',
                }}
              >
                ▶
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 900,
                    letterSpacing: '-0.5px',
                    color: '#ffffff',
                  }}
                >
                  PLAY HENTAI
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    color: '#a855f7',
                    textTransform: 'uppercase',
                  }}
                >
                  playhentai.live
                </span>
              </div>
            </div>

            {/* Middle: Badges + Title + Subtitle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Badges Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(124, 58, 237, 0.3)',
                    border: '1px solid rgba(168, 85, 247, 0.6)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    color: '#e9d5ff',
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                  }}
                >
                  {badge}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: '#f1f5f9',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                >
                  HD 1080p
                </div>
                {episodes && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#cbd5e1',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {episodes}
                  </div>
                )}
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: displayTitle.length > 35 ? '44px' : '52px',
                  fontWeight: 900,
                  color: '#ffffff',
                  lineHeight: 1.15,
                  letterSpacing: '-1px',
                  textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                }}
              >
                {displayTitle}
              </div>

              {/* Subtitle / Alternate Title */}
              {subtitle && (
                <div
                  style={{
                    fontSize: '19px',
                    fontWeight: 500,
                    color: '#94a3b8',
                    lineHeight: 1.4,
                  }}
                >
                  {displaySubtitle}
                </div>
              )}
            </div>

            {/* Bottom: Rating & Features */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '22px', color: '#f59e0b' }}>★</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
                  {rating}
                </span>
                <span style={{ fontSize: '15px', color: '#64748b' }}>/ 10</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '15px', color: '#cbd5e1', fontWeight: 600 }}>
                  English Subtitles
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7' }} />
                <span style={{ fontSize: '15px', color: '#cbd5e1', fontWeight: 600 }}>
                  Free Streaming
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Poster Image Preview */}
          {imageUrl && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '360px',
                height: '490px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(124, 58, 237, 0.35)',
                position: 'relative',
                backgroundColor: '#111827',
              }}
            >
              <img
                src={imageUrl}
                alt={title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
        },
      }
    );
  } catch (err: any) {
    console.error('Error generating OG image:', err);
    return new Response('Failed to generate image', { status: 500 });
  }
}
