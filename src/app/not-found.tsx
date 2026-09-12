import React from 'react';
import Link from 'next/link';
import { Search, Home, Compass, Flame, Film, List } from 'lucide-react';
import PublicLayout from './(public)/layout';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <PublicLayout>
      <div className={styles.container}>
        <title>Page Not Found | Play Hentai</title>
        <meta name="robots" content="noindex, follow" />

        <div className={styles.card}>
          <div className={styles.codeBadge}>404</div>
          <h1 className={styles.title}>Page or Episode Not Found</h1>
          <p className={styles.subtitle}>
            The title or video you are looking for may have been moved, renamed, or is temporarily unavailable. Try searching below or explore popular sections.
          </p>

          <form action="/search" method="get" className={styles.searchForm}>
            <input
              type="text"
              name="q"
              placeholder="Search anime titles, genres, studios..."
              className={styles.searchInput}
              autoComplete="off"
            />
            <button type="submit" className={styles.searchBtn} aria-label="Search">
              <Search size={16} />
              <span>Search</span>
            </button>
          </form>

          <div className={styles.quickLinksSection}>
            <div className={styles.quickLinksHeading}>Popular Destinations</div>
            <div className={styles.chipsGrid}>
              <Link href="/trending" className={styles.chip}>
                <Flame size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                Trending Series
              </Link>
              <Link href="/genres" className={styles.chip}>
                <Compass size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                Genres Directory
              </Link>
              <Link href="/recent/episodes" className={styles.chip}>
                <Film size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                Recent Episodes
              </Link>
              <Link href="/playlists" className={styles.chip}>
                <List size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                Curated Playlists
              </Link>
            </div>
          </div>

          <Link href="/" className={styles.homeBtn}>
            <Home size={16} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
