'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Play, RotateCcw } from 'lucide-react';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import styles from './DynamicWatchCTA.module.css';

interface EpisodeItem {
  id: string;
  episode_number: number;
  duration_seconds?: number;
  is_published?: boolean;
}

interface SeasonItem {
  id: string;
  season_number: number;
  episodes: EpisodeItem[];
}

interface DynamicWatchCTAProps {
  seasons: SeasonItem[];
  seriesSlug: string;
  defaultEpisodeId?: string | null;
  defaultEpisodeNumber?: number;
}

export default function DynamicWatchCTA({
  seasons,
  seriesSlug,
  defaultEpisodeId,
  defaultEpisodeNumber = 1,
}: DynamicWatchCTAProps) {
  // Flatten and sort all episodes sequentially (Season 1 Ep 1 -> Season 2 Ep 1...)
  const allEpisodes = useMemo(() => {
    const list: EpisodeItem[] = [];
    (seasons || [])
      .slice()
      .sort((a, b) => a.season_number - b.season_number)
      .forEach((season) => {
        if (season.episodes && Array.isArray(season.episodes)) {
          season.episodes
            .filter((ep) => ep.is_published !== false)
            .sort((a, b) => a.episode_number - b.episode_number)
            .forEach((ep) => list.push(ep));
        }
      });
    return list;
  }, [seasons]);

  const firstEp = allEpisodes[0] || {
    id: defaultEpisodeId || `ep-${seriesSlug}-1`,
    episode_number: defaultEpisodeNumber || 1,
    duration_seconds: 1440,
  };

  // State for Dynamic CTA
  const [ctaState, setCtaState] = useState<{
    type: 'start' | 'resume' | 'next' | 'rewatch';
    targetEp: EpisodeItem;
    mainText: string;
    subText: string;
    isResume: boolean;
  }>({
    type: 'start',
    targetEp: firstEp,
    mainText: `Watch Episode ${firstEp.episode_number || 1}`,
    subText: '1080p Full HD • Free Stream',
    isResume: false,
  });

  useEffect(() => {
    const evaluateWatchStatus = async () => {
      try {
        let historyList: any[] = [];

        // 1. Fetch from backend API
        const res = await fetch('/api/watch-history');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.history)) {
            historyList = data.history;
          }
        }

        // 2. Fallback to localStorage guest history
        if (historyList.length === 0) {
          try {
            const localHist = JSON.parse(
              localStorage.getItem('playhentai_guest_history') ||
                localStorage.getItem('user_history') ||
                '[]'
            );
            if (Array.isArray(localHist)) {
              historyList = localHist.map((h) => ({
                episode_id: h.episode_id || h.episodeId || h.id,
                last_position_seconds: h.last_position_seconds || h.position || 0,
                duration_seconds: h.duration_seconds || h.duration || 1440,
                watched_percentage: h.watched_percentage || h.percentage || 0,
                completed: h.completed || (h.percentage && h.percentage >= 90) || false,
              }));
            }
          } catch {
            // ignore
          }
        }

        if (allEpisodes.length === 0 || historyList.length === 0) {
          return;
        }

        // Build history map by episode ID
        const historyMap = new Map<string, any>();
        historyList.forEach((item) => {
          if (item.episode_id) {
            historyMap.set(String(item.episode_id), item);
          }
        });

        // Check if any episode is in-progress (highest priority to resume)
        for (const ep of allEpisodes) {
          const record = historyMap.get(String(ep.id));
          if (record) {
            const lastPos = record.last_position_seconds || 0;
            const dur = record.duration_seconds || ep.duration_seconds || 1440;
            const pct = record.watched_percentage || Math.round((lastPos / dur) * 100) || 0;
            const isFinished = record.completed || pct >= 90;

            if (lastPos >= 5 && !isFinished) {
              const currentMin = Math.floor(lastPos / 60);
              const totalMin = Math.ceil(dur / 60);
              setCtaState({
                type: 'resume',
                targetEp: ep,
                mainText: `Resume Episode ${ep.episode_number}`,
                subText: `${currentMin}m / ${totalMin}m • ${pct}%`,
                isResume: true,
              });
              return;
            }
          }
        }

        // If not resuming, check completed episodes to find next unwatched episode
        let firstUnwatchedEp: EpisodeItem | null = null;
        let anyCompleted = false;

        for (const ep of allEpisodes) {
          const record = historyMap.get(String(ep.id));
          const isCompleted = record && (record.completed || (record.watched_percentage && record.watched_percentage >= 90));

          if (isCompleted) {
            anyCompleted = true;
          } else if (!firstUnwatchedEp) {
            firstUnwatchedEp = ep;
          }
        }

        if (anyCompleted) {
          if (firstUnwatchedEp) {
            // Watch Next Episode
            setCtaState({
              type: 'next',
              targetEp: firstUnwatchedEp,
              mainText: `Watch Episode ${firstUnwatchedEp.episode_number}`,
              subText: '1080p Full HD • Up Next',
              isResume: false,
            });
          } else {
            // All episodes finished!
            setCtaState({
              type: 'rewatch',
              targetEp: firstEp,
              mainText: 'Watch Again',
              subText: 'All Episodes Completed • Rewatch from Ep 1',
              isResume: false,
            });
          }
        }
      } catch (err) {
        console.error('Error evaluating dynamic watch CTA:', err);
      }
    };

    evaluateWatchStatus();
  }, [allEpisodes, firstEp, seriesSlug]);

  const targetWatchUrl = getEpisodeWatchUrl(
    ctaState.targetEp.id,
    ctaState.targetEp.episode_number,
    seriesSlug
  );

  return (
    <div className={styles.ctaWrapper}>
      <Link href={targetWatchUrl} className={styles.watchNowCtaBtn}>
        <div className={styles.ctaPlayCircle}>
          {ctaState.type === 'rewatch' ? (
            <RotateCcw size={18} className={styles.ctaIcon} />
          ) : (
            <Play size={18} fill="currentColor" className={styles.ctaPlayIcon} />
          )}
        </div>
        <div className={styles.ctaTextGroup}>
          <span className={styles.ctaMainText}>{ctaState.mainText}</span>
          <span className={`${styles.ctaSubText} ${ctaState.isResume ? styles.resumeSubText : ''}`}>
            {ctaState.subText}
          </span>
        </div>
      </Link>
    </div>
  );
}
