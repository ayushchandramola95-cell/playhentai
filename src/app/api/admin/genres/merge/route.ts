import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    
    const { sourceSlugs, destinationSlug } = await request.json();

    if (!Array.isArray(sourceSlugs) || sourceSlugs.length === 0 || !destinationSlug) {
      return NextResponse.json(
        { error: 'Missing source slugs list or destination slug' },
        { status: 400 }
      );
    }

    // 1. Fetch destination genre metadata
    const { data: destGenre, error: destErr } = await adminSupabase
      .from('categories')
      .select('*')
      .eq('slug', destinationSlug)
      .single();

    if (destErr || !destGenre) {
      return NextResponse.json(
        { error: `Destination genre "${destinationSlug}" not found in database.` },
        { status: 404 }
      );
    }

    // 2. Fetch source genres metadata
    const { data: sourceGenres, error: sourceErr } = await adminSupabase
      .from('categories')
      .select('*')
      .in('slug', sourceSlugs);

    if (sourceErr || !sourceGenres || sourceGenres.length === 0) {
      return NextResponse.json(
        { error: 'No valid source genres found matching the provided slugs.' },
        { status: 404 }
      );
    }

    const sourceNames = sourceGenres.map((g: any) => g.name);
    const sourceNamesLower = sourceNames.map((n: string) => n.toLowerCase().trim());
    const destName = destGenre.name;

    // 3. Fetch all published/unpublished series rows
    const { data: seriesList, error: seriesErr } = await adminSupabase
      .from('series')
      .select('id, title, tags');

    if (seriesErr) throw seriesErr;

    let affectedCount = 0;

    // 4. Clean and merge tags arrays for each series
    if (seriesList && seriesList.length > 0) {
      for (const series of seriesList) {
        const currentTags = series.tags || [];
        
        // Check if this series has any of the source tags
        const hasSourceTag = currentTags.some((tag: string) => 
          sourceNamesLower.includes(tag.toLowerCase().trim())
        );

        if (hasSourceTag) {
          // Remove source tags
          let cleanedTags = currentTags.filter((tag: string) => 
            !sourceNamesLower.includes(tag.toLowerCase().trim())
          );

          // Add destination tag if not present
          const hasDestTag = cleanedTags.some((tag: string) => 
            tag.toLowerCase().trim() === destName.toLowerCase().trim()
          );

          if (!hasDestTag) {
            cleanedTags.push(destName);
          }

          // Save the clean tag list
          const { error: updateErr } = await adminSupabase
            .from('series')
            .update({ tags: cleanedTags })
            .eq('id', series.id);

          if (updateErr) {
            console.error(`Failed to update tags for series id ${series.id}:`, updateErr);
          } else {
            affectedCount++;
          }
        }
      }
    }

    // 5. Delete source genre records from the categories table
    const { error: deleteErr } = await adminSupabase
      .from('categories')
      .delete()
      .in('slug', sourceSlugs);

    if (deleteErr) {
      console.error('Failed to delete merged source genre records:', deleteErr);
    }

    return NextResponse.json({
      success: true,
      affectedCount,
      deletedCount: sourceGenres.length,
      mergedInto: destName
    });

  } catch (err: any) {
    console.error('Error merging genres:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
