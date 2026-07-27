import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { MOCK_SERIES } from '@/utils/mockData';
import RandomizerPortal from './RandomizerPortal';

export const metadata = {
  title: 'Surprise Me - PlayHentai',
  description: 'Let our randomizer engine pick your next anime binge-watch. Filter by genre or roll the dice for instant surprises.',
};

export default async function RandomPage() {
  const supabase = await createClient();
  let seriesList: any[] = [];

  try {
    const { data: dbSeries } = await supabase
      .from('series')
      .select('*')
      .eq('is_published', true);

    if (dbSeries && dbSeries.length > 0) {
      seriesList = dbSeries;
    }
  } catch (err) {
    console.error('Error fetching series for randomizer:', err);
  }

  // Fallback to mock series if DB is empty
  if (seriesList.length === 0) {
    seriesList = MOCK_SERIES;
  }

  return <RandomizerPortal seriesList={seriesList} />;
}
