const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const CATALOG_FILE = path.join(DATA_DIR, 'local_catalog.json');
const METRICS_FILE = path.join(DATA_DIR, 'fake_metrics.json');

const minViews = 10000;
const maxViews = 300000;
const minRate = 7.8;
const maxRate = 9.7;

if (!fs.existsSync(CATALOG_FILE)) {
  console.error('Catalog file not found');
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
const seriesList = catalog.series || [];
const seasonsList = catalog.seasons || [];
const episodesList = catalog.episodes || [];

const seasonToSeries = new Map();
seasonsList.forEach(sn => {
  if (sn.id && sn.series_id) {
    seasonToSeries.set(sn.id, sn.series_id);
  }
});

const seriesEpisodes = new Map();
episodesList.forEach(ep => {
  const sId = seasonToSeries.get(ep.season_id);
  if (sId) {
    if (!seriesEpisodes.has(sId)) {
      seriesEpisodes.set(sId, []);
    }
    seriesEpisodes.get(sId).push(ep);
  }
});

const seriesMap = {};
const episodesMap = {};

let totalViewsSum = 0;
let totalRatingSum = 0;
let ratingCount = 0;

seriesList.forEach(s => {
  const isUpcoming = (s.status || '').toLowerCase() === 'upcoming' || Boolean(s.is_upcoming);
  const eps = (seriesEpisodes.get(s.id) || []).sort(
    (a, b) => (a.episode_number || 0) - (b.episode_number || 0)
  );

  let seriesTotalViews = 0;
  const seriesRatings = [];

  if (!isUpcoming) {
    // Realistic episode 1 views: upper 60% of the 10k-300k range
    const baseEp1Views = minViews + Math.floor(Math.random() * (maxViews - minViews * 1.5)) + minViews;

    eps.forEach((ep, idx) => {
      // Episode decay: Episode 1 is highest, subsequent episodes retain 85%-95%
      const decay = Math.pow(0.88 + Math.random() * 0.08, idx);
      const rawViews = Math.max(minViews, Math.round(baseEp1Views * decay));
      const roundedViews = Math.round(rawViews / 50) * 50;

      const epRating = Math.round((minRate + Math.random() * (maxRate - minRate)) * 10) / 10;

      episodesMap[ep.id] = {
        views: roundedViews,
        rating: epRating
      };

      seriesTotalViews += roundedViews;
      seriesRatings.push(epRating);
      totalViewsSum += roundedViews;
      totalRatingSum += epRating;
      ratingCount++;
    });

    if (eps.length === 0) {
      seriesTotalViews = minViews * 2 + Math.floor(Math.random() * (maxViews - minViews)) * 2;
      seriesTotalViews = Math.round(seriesTotalViews / 100) * 100;
      totalViewsSum += seriesTotalViews;
    }
  } else {
    // Upcoming series have 0 views
    seriesTotalViews = 0;
  }

  const seriesRating = seriesRatings.length > 0
    ? Math.round((seriesRatings.reduce((a, b) => a + b, 0) / seriesRatings.length) * 10) / 10
    : Math.round((minRate + Math.random() * (maxRate - minRate)) * 10) / 10;

  seriesMap[s.id] = {
    views: seriesTotalViews,
    rating: seriesRating
  };
});

const config = {
  enabled: true,
  mode: 'boosted',
  generatedAt: new Date().toISOString(),
  settings: {
    minEpisodeViews: minViews,
    maxEpisodeViews: maxViews,
    minRating: minRate,
    maxRating: maxRate
  },
  series: seriesMap,
  episodes: episodesMap
};

fs.writeFileSync(METRICS_FILE, JSON.stringify(config, null, 2), 'utf-8');
console.log(`Seeded fake metrics successfully!`);
console.log(`Series count: ${Object.keys(seriesMap).length}`);
console.log(`Episodes count: ${Object.keys(episodesMap).length}`);
console.log(`Total views: ${totalViewsSum.toLocaleString()}`);
console.log(`Avg rating: ${(totalRatingSum / ratingCount).toFixed(1)}`);
