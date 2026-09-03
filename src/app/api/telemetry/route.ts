import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

interface TelemetrySession {
  sessionId: string;
  firstSeen: number;
  lastSeen: number;
  durationSeconds: number;
  pageViews: number;
  maxScrollDepth: number; // 0, 25, 50, 75, 100
  device: 'desktop' | 'mobile' | 'tablet';
  hasAdBlocker: boolean;
  hasWatchedVideo: boolean;
  visitedRoutes: string[];
}

interface TelemetryStore {
  sessions: Record<string, TelemetrySession>;
  routeVisits: Record<string, number>;
  scrollCounts: {
    depth25: number;
    depth50: number;
    depth75: number;
    depth100: number;
  };
  deviceCounts: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  adBlockCounts: {
    blocked: number;
    notBlocked: number;
  };
  totalWatchEvents: number;
  lastCleaned: number;
}

const STORE_PATH = path.join(process.cwd(), 'src', 'utils', 'telemetry_store.json');

// In-memory runtime cache for high-speed lookup
let memoryStore: TelemetryStore | null = null;

function getEmptyStore(): TelemetryStore {
  return {
    sessions: {},
    routeVisits: {},
    scrollCounts: {
      depth25: 0,
      depth50: 0,
      depth75: 0,
      depth100: 0,
    },
    deviceCounts: {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    },
    adBlockCounts: {
      blocked: 0,
      notBlocked: 0,
    },
    totalWatchEvents: 0,
    lastCleaned: Date.now(),
  };
}

async function getStore(): Promise<TelemetryStore> {
  if (memoryStore) return memoryStore;

  const emptyStore = getEmptyStore();

  // 1. Try to read from local file
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      const loaded: TelemetryStore = { ...emptyStore, ...JSON.parse(data) };
      memoryStore = loaded;
      return loaded;
    }
  } catch (err) {
    console.error('Error reading local telemetry store:', err);
  }

  // 2. Try to read from Supabase site_settings table (Production Persistence)
  try {
    const adminSupabase = createAdminClient();
    const { data } = await adminSupabase
      .from('site_settings')
      .select('value')
      .eq('key', 'site_telemetry_data')
      .single();

    if (data && data.value) {
      const parsed = JSON.parse(data.value);
      const loaded: TelemetryStore = { ...emptyStore, ...parsed };
      memoryStore = loaded;
      return loaded;
    }
  } catch (dbErr) {
    // Supabase fallback
  }

  memoryStore = emptyStore;
  return emptyStore;
}

async function saveStore(store: TelemetryStore) {
  memoryStore = store;

  // 1. Save to local file
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local telemetry store:', err);
  }

  // 2. Persist to Supabase in background for production live domain
  try {
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from('site_settings')
      .upsert({
        key: 'site_telemetry_data',
        value: JSON.stringify(store),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
  } catch (dbErr) {
    // Graceful fallback
  }
}

// GET: Returns 100% genuine calculated telemetry metrics for Admin Analytics
export async function GET(request: Request) {
  try {
    const store = await getStore();
    const now = Date.now();
    const threeMinutesAgo = now - 3 * 60 * 1000; // 3-minute active window

    // 1. Calculate Active Live Visitors (sessions with heartbeat in last 3 minutes)
    const allSessions = Object.values(store.sessions);
    const activeSessions = allSessions.filter(
      (s) => s.lastSeen >= threeMinutesAgo
    );
    const activeVisitorsCount = activeSessions.length;

    // 2. Average Session Duration
    let totalDuration = 0;
    let countedSessions = 0;
    allSessions.forEach((s) => {
      if (s.durationSeconds > 0) {
        totalDuration += s.durationSeconds;
        countedSessions++;
      }
    });

    const avgDurationSeconds = countedSessions > 0 
      ? Math.round(totalDuration / countedSessions) 
      : 0;

    const avgMinutes = Math.floor(avgDurationSeconds / 60);
    const avgSecs = avgDurationSeconds % 60;
    const avgDurationFormatted = countedSessions > 0 
      ? (avgMinutes > 0 ? `${avgMinutes}m ${avgSecs}s` : `${avgSecs}s`)
      : '0s';

    // 3. Pages per session
    let totalPagesCount = 0;
    allSessions.forEach((s) => {
      totalPagesCount += Math.max(s.pageViews || 1, 1);
    });
    const avgPagesPerSession = allSessions.length > 0 
      ? (totalPagesCount / allSessions.length).toFixed(1) 
      : '1.0';

    // 4. Device Breakdown Percentages
    const totalDevices = (store.deviceCounts.desktop + store.deviceCounts.mobile + store.deviceCounts.tablet) || 0;
    const desktopPercent = totalDevices > 0 ? Math.round((store.deviceCounts.desktop / totalDevices) * 100) : 0;
    const mobilePercent = totalDevices > 0 ? Math.round((store.deviceCounts.mobile / totalDevices) * 100) : 0;
    const tabletPercent = totalDevices > 0 ? Math.max(100 - desktopPercent - mobilePercent, 0) : 0;

    // 5. AdBlocker Usage Rate
    const totalAdChecks = (store.adBlockCounts.blocked + store.adBlockCounts.notBlocked) || 0;
    const adBlockPercent = totalAdChecks > 0 ? Math.round((store.adBlockCounts.blocked / totalAdChecks) * 100) : 0;

    // 6. Scroll Funnel Percentages
    const depth25Count = store.scrollCounts.depth25;
    const scrollFunnel = {
      depth25: depth25Count > 0 ? 100 : 0,
      depth50: depth25Count > 0 ? Math.round((store.scrollCounts.depth50 / depth25Count) * 100) : 0,
      depth75: depth25Count > 0 ? Math.round((store.scrollCounts.depth75 / depth25Count) * 100) : 0,
      depth100: depth25Count > 0 ? Math.round((store.scrollCounts.depth100 / depth25Count) * 100) : 0,
    };

    // 7. Watch Video Conversion Rate (% of sessions that triggered playback)
    const totalSessionsRecorded = allSessions.length;
    const sessionsThatWatched = allSessions.filter(s => s.hasWatchedVideo).length;
    const watchConversionRate = totalSessionsRecorded > 0 
      ? Math.round((sessionsThatWatched / totalSessionsRecorded) * 100) 
      : 0;

    // 8. Top Visited Routes List
    const topRoutes = Object.entries(store.routeVisits)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return NextResponse.json({
      totalSessionsCount: allSessions.length,
      activeVisitorsCount,
      avgDurationSeconds,
      avgDurationFormatted,
      avgPagesPerSession,
      deviceBreakdown: {
        desktop: desktopPercent,
        mobile: mobilePercent,
        tablet: tabletPercent,
      },
      adBlockRate: adBlockPercent,
      scrollFunnel,
      watchConversionRate,
      totalWatchEvents: store.totalWatchEvents,
      topRoutes,
    });
  } catch (err) {
    console.error('Error fetching telemetry data:', err);
    return NextResponse.json({ error: 'Failed to retrieve telemetry' }, { status: 500 });
  }
}

// POST: Ingests real-time visitor beacons from public website
export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload || !payload.sessionId) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const {
      sessionId,
      route,
      durationSeconds = 0,
      scrollDepth = 0,
      device = 'desktop',
      hasAdBlocker = false,
      hasWatchedVideo = false,
      event = 'heartbeat',
    } = payload;

    const store = await getStore();
    const now = Date.now();

    // 1. Initialize or update session
    if (!store.sessions[sessionId]) {
      store.sessions[sessionId] = {
        sessionId,
        firstSeen: now,
        lastSeen: now,
        durationSeconds: Number(durationSeconds) || 0,
        pageViews: 1,
        maxScrollDepth: Number(scrollDepth) || 0,
        device: device as any,
        hasAdBlocker: Boolean(hasAdBlocker),
        hasWatchedVideo: Boolean(hasWatchedVideo),
        visitedRoutes: [route || '/'],
      };

      // Device tally
      if (device === 'mobile') store.deviceCounts.mobile++;
      else if (device === 'tablet') store.deviceCounts.tablet++;
      else store.deviceCounts.desktop++;

      // AdBlock tally
      if (hasAdBlocker) store.adBlockCounts.blocked++;
      else store.adBlockCounts.notBlocked++;
    } else {
      const s = store.sessions[sessionId];
      s.lastSeen = now;
      if (durationSeconds > s.durationSeconds) {
        s.durationSeconds = Number(durationSeconds);
      }
      if (scrollDepth > s.maxScrollDepth) {
        s.maxScrollDepth = Number(scrollDepth);
      }
      if (route && !s.visitedRoutes.includes(route)) {
        s.visitedRoutes.push(route);
        s.pageViews++;
      }
      if (hasWatchedVideo && !s.hasWatchedVideo) {
        s.hasWatchedVideo = true;
        store.totalWatchEvents++;
      }
    }

    // 2. Track Route Visits
    if (route) {
      const baseRoute = route.split('?')[0];
      store.routeVisits[baseRoute] = (store.routeVisits[baseRoute] || 0) + 1;
    }

    // 3. Track Scroll Depth Milestones
    if (scrollDepth >= 25) store.scrollCounts.depth25++;
    if (scrollDepth >= 50) store.scrollCounts.depth50++;
    if (scrollDepth >= 75) store.scrollCounts.depth75++;
    if (scrollDepth >= 100) store.scrollCounts.depth100++;

    if (hasWatchedVideo && event === 'video_play') {
      store.totalWatchEvents++;
    }

    // Cleanup stale sessions older than 48 hours to prevent unbounded memory growth
    if (now - store.lastCleaned > 6 * 60 * 60 * 1000) {
      const cutoff = now - 48 * 60 * 60 * 1000;
      Object.keys(store.sessions).forEach((id) => {
        if (store.sessions[id].lastSeen < cutoff) {
          delete store.sessions[id];
        }
      });
      store.lastCleaned = now;
    }

    await saveStore(store);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error logging telemetry beacon:', err);
    return NextResponse.json({ success: false });
  }
}
