import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/utils/supabase/admin';

const STORE_PATH = path.join(process.cwd(), 'src', 'utils', 'reports_store.json');

export interface IssueReport {
  id: string;
  series_title: string;
  series_slug: string;
  episode_id: string;
  episode_number: number;
  reason: string;
  notes?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  user_agent?: string;
}

function loadLocalReports(): IssueReport[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading reports_store.json:', err);
  }
  return [];
}

function saveLocalReports(reports: IssueReport[]) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(reports, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing reports_store.json:', err);
  }
}

// POST: Submit a new playback issue report
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { episode_id, episode_number, series_title, series_slug, reason, notes } = body;

    if (!reason || !episode_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newReport: IssueReport = {
      id: reportId,
      series_title: series_title || 'Unknown Series',
      series_slug: series_slug || '',
      episode_id: String(episode_id),
      episode_number: Number(episode_number) || 1,
      reason: String(reason),
      notes: notes ? String(notes).trim() : undefined,
      status: 'pending',
      created_at: new Date().toISOString(),
      user_agent: req.headers.get('user-agent') || undefined,
    };

    // 1. Save to local fallback store
    const localList = loadLocalReports();
    localList.unshift(newReport);
    saveLocalReports(localList);

    // 2. Attempt saving to Supabase issue_reports table if configured
    try {
      const supabase = createAdminClient();
      await supabase.from('issue_reports').insert([newReport]);
    } catch (_) {
      // Gracefully handled by local store fallback
    }

    return NextResponse.json({ success: true, report: newReport });
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json({ error: 'Failed to process report' }, { status: 500 });
  }
}

// GET: Retrieve all issue reports
export async function GET() {
  try {
    let reports = loadLocalReports();

    // Optionally merge with Supabase if table exists
    try {
      const supabase = createAdminClient();
      const { data } = await supabase.from('issue_reports').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        // Merge without duplicates
        const map = new Map<string, IssueReport>();
        data.forEach((r: any) => map.set(r.id, r));
        reports.forEach((r) => {
          if (!map.has(r.id)) map.set(r.id, r);
        });
        reports = Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    } catch (_) {}

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ reports: loadLocalReports() });
  }
}

// PATCH: Update report status (e.g. resolve, dismiss)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing report id or status' }, { status: 400 });
    }

    const reports = loadLocalReports();
    const target = reports.find((r) => r.id === id);
    if (target) {
      target.status = status;
      saveLocalReports(reports);
    }

    try {
      const supabase = createAdminClient();
      await supabase.from('issue_reports').update({ status }).eq('id', id);
    } catch (_) {}

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    console.error('Error updating report status:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

// DELETE: Delete report
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing report id' }, { status: 400 });
    }

    let reports = loadLocalReports();
    reports = reports.filter((r) => r.id !== id);
    saveLocalReports(reports);

    try {
      const supabase = createAdminClient();
      await supabase.from('issue_reports').delete().eq('id', id);
    } catch (_) {}

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}
