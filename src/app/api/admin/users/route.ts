import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import {
  getLocalUsers,
  createLocalUser,
  updateLocalUser,
  deleteLocalUser,
  resetUserPassword,
  findUserById,
} from '@/utils/authStore';
import { backupUsersToS3, restoreUsersFromS3 } from '@/utils/s3DatabaseBackup';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await verifyAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const roleFilter = searchParams.get('role') || 'all';
    const statusFilter = searchParams.get('status') || 'all';

    const users = await getLocalUsers();

    let filtered = users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      banned: Boolean(u.banned),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLoginAt: u.lastLoginAt || null,
    }));

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.username.toLowerCase().includes(search)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (statusFilter === 'banned') {
      filtered = filtered.filter((u) => u.banned);
    } else if (statusFilter === 'active') {
      filtered = filtered.filter((u) => !u.banned);
    }

    const stats = {
      totalUsers: users.length,
      adminUsers: users.filter((u) => u.role === 'admin').length,
      regularUsers: users.filter((u) => u.role === 'user').length,
      bannedUsers: users.filter((u) => u.banned).length,
    };

    return NextResponse.json({
      success: true,
      users: filtered,
      stats,
    });
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { user: currentAdmin } = await verifyAdmin();
    const body = await request.json();
    const { action } = body;

    // Action 1: Create New User
    if (action === 'create') {
      const { email, username, password, role } = body;
      if (!email || !password || !username) {
        return NextResponse.json({ error: 'Missing required user fields' }, { status: 400 });
      }

      const newUser = await createLocalUser({
        email,
        username,
        password,
        role: role || 'user',
      });

      return NextResponse.json({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          role: newUser.role,
        },
      });
    }

    // Action 2: Update User Role
    if (action === 'update_role') {
      const { id, role } = body;
      if (!id || !role || !['admin', 'user', 'moderator'].includes(role)) {
        return NextResponse.json({ error: 'Invalid user ID or role' }, { status: 400 });
      }

      if (id === currentAdmin.id && role !== 'admin') {
        return NextResponse.json({ error: 'You cannot demote yourself from admin status.' }, { status: 400 });
      }

      const updated = await updateLocalUser(id, { role });
      if (!updated) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: `Role updated to ${role}` });
    }

    // Action 3: Toggle Ban Status
    if (action === 'toggle_ban') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

      if (id === currentAdmin.id) {
        return NextResponse.json({ error: 'You cannot ban your own administrator account.' }, { status: 400 });
      }

      const target = await findUserById(id);
      if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const newBannedState = !target.banned;
      await updateLocalUser(id, { banned: newBannedState });

      return NextResponse.json({
        success: true,
        message: newBannedState ? 'User suspended successfully' : 'User suspension lifted',
        banned: newBannedState,
      });
    }

    // Action 4: Reset User Password
    if (action === 'reset_password') {
      const { id, newPassword } = body;
      if (!id || !newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const ok = await resetUserPassword(id, newPassword);
      if (!ok) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      return NextResponse.json({ success: true, message: 'Password reset successfully' });
    }

    // Action 5: Backup Users Database to S3 Sydney
    if (action === 'backup_now') {
      const res = await backupUsersToS3();
      return NextResponse.json({
        success: true,
        message: `Backed up ${res.count} users to AWS S3 Sydney`,
        count: res.count,
      });
    }

    // Action 6: Cold-boot Restore Users from S3 Sydney
    if (action === 'restore_from_s3') {
      const res = await restoreUsersFromS3();
      if (!res) {
        return NextResponse.json({ error: 'No user database backup found in S3 Sydney.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'User database restored from S3 Sydney!' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user: currentAdmin } = await verifyAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    if (id === currentAdmin.id) {
      return NextResponse.json({ error: 'You cannot delete your own administrator account.' }, { status: 400 });
    }

    const ok = await deleteLocalUser(id);
    if (!ok) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Delete operation failed' }, { status });
  }
}
