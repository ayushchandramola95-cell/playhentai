export function getEpisodeWatchUrl(
  episodeId: string,
  episodeNumber?: number,
  seriesSlug?: string
): string {
  if (seriesSlug && episodeNumber !== undefined && episodeNumber !== null && !isNaN(episodeNumber)) {
    return `/watch/${seriesSlug}-episode-${episodeNumber}`;
  }
  return `/watch/${episodeId}`;
}

export function parseEpisodeSlug(slugOrId: string): { seriesSlug?: string; episodeNumber?: number } | null {
  if (!slugOrId) return null;
  
  // Match patterns like "cyberpunk-odyssey-episode-1" or "cyberpunk-odyssey-ep-1"
  const match = slugOrId.match(/^(.*)-(?:episode|ep)-(\d+)$/i);
  if (match) {
    return {
      seriesSlug: match[1],
      episodeNumber: parseInt(match[2], 10)
    };
  }
  return null;
}
