import { NextResponse } from 'next/server';
import { getLocalCatalog } from '@/utils/localCatalogStore';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get('type') || 'json';

    const catalog = await getLocalCatalog();
    const seriesList = catalog.series || [];
    const seasonsList = catalog.seasons || [];
    const episodesList = catalog.episodes || [];
    const collectionsList = catalog.collections || [];

    // Fetch site settings if Supabase admin client is available
    let settingsList: any[] = [];
    try {
      const supabase = createAdminClient();
      const { data } = await supabase.from('site_settings').select('*');
      if (data) settingsList = data;
    } catch {
      // Use empty array if Supabase table is unreachable
    }

    const timestamp = new Date().toISOString();
    const dateFormatted = timestamp.split('T')[0];

    // Case 1: Lightweight Metadata Stats
    if (exportType === 'stats') {
      const approxSizeBytes = JSON.stringify({ seriesList, seasonsList, episodesList }).length;
      return NextResponse.json({
        success: true,
        timestamp,
        seriesCount: seriesList.length,
        seasonsCount: seasonsList.length,
        episodesCount: episodesList.length,
        collectionsCount: collectionsList.length,
        settingsCount: settingsList.length,
        approxSizeBytes,
        approxSizeFormatted: `${(approxSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
      });
    }

    // Case 2: Episodes CSV Export
    if (exportType === 'episodes_csv') {
      const seriesMap = new Map<string, any>();
      seriesList.forEach((s: any) => seriesMap.set(s.id, s));

      const seasonMap = new Map<string, any>();
      seasonsList.forEach((sn: any) => seasonMap.set(sn.id, sn));

      const headers = [
        'Episode ID', 'Series Title', 'Series Slug', 'Episode Number',
        'Title', 'Video Key / URL', 'Thumbnail Key', 'Duration Seconds',
        'Is Published', 'Created At'
      ];

      const rows = episodesList.map((ep: any) => {
        const season = seasonMap.get(ep.season_id);
        const series = season ? seriesMap.get(season.series_id) : null;
        return [
          ep.id,
          `"${(series?.title || '').replace(/"/g, '""')}"`,
          series?.slug || '',
          ep.episode_number,
          `"${(ep.title || '').replace(/"/g, '""')}"`,
          `"${(ep.video_key || '').replace(/"/g, '""')}"`,
          `"${(ep.thumbnail_key || '').replace(/"/g, '""')}"`,
          ep.duration_seconds || 0,
          ep.is_published !== false ? 'TRUE' : 'FALSE',
          ep.created_at || ''
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="playhentai_episodes_${dateFormatted}.csv"`,
        },
      });
    }

    // Case 3: Series CSV Export
    if (exportType === 'series_csv') {
      const headers = [
        'Series ID', 'Title', 'Slug', 'Studio', 'Status',
        'Release Year', 'Rating', 'Tags', 'Is Published', 'Created At'
      ];

      const rows = seriesList.map((s: any) => [
        s.id,
        `"${(s.title || '').replace(/"/g, '""')}"`,
        s.slug,
        `"${(s.studio || '').replace(/"/g, '""')}"`,
        s.status || '',
        s.release_year || '',
        s.rating || '',
        `"${(s.tags || []).join('; ').replace(/"/g, '""')}"`,
        s.is_published !== false ? 'TRUE' : 'FALSE',
        s.created_at || ''
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="playhentai_series_${dateFormatted}.csv"`,
        },
      });
    }

    // Default Case: Full Complete Database JSON Snapshot
    const backupPayload = {
      version: '2.0',
      backupType: 'full_catalog_and_settings',
      exportedAt: timestamp,
      siteName: 'Play Hentai',
      manifest: {
        seriesCount: seriesList.length,
        seasonsCount: seasonsList.length,
        episodesCount: episodesList.length,
        collectionsCount: collectionsList.length,
        settingsCount: settingsList.length,
      },
      data: {
        series: seriesList,
        seasons: seasonsList,
        episodes: episodesList,
        collections: collectionsList,
        settings: settingsList,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);

    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="playhentai_database_backup_${dateFormatted}.json"`,
      },
    });
  } catch (err: any) {
    console.error('Error exporting database backup:', err);
    return NextResponse.json(
      { success: false, error: 'Database backup export failed', details: err?.message },
      { status: 500 }
    );
  }
}
