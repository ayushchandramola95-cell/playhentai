'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Search,
  Plus,
  CloudUpload,
  CloudDownload,
  Key,
  Trash2,
  Ban,
  CheckCircle,
  X,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import styles from './users.module.css';

interface UserData {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user' | 'moderator';
  banned: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

interface StatsData {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  bannedUsers: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    adminUsers: 0,
    regularUsers: 0,
    bannedUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', username: '', password: '', role: 'user' });

  const [showPasswordModal, setShowPasswordModal] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        if (data.stats) setStats(data.stats);
      } else {
        showToast(data.error || 'Failed to fetch users', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, roleFilter, statusFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          email: createForm.email,
          username: createForm.username,
          password: createForm.password,
          role: createForm.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('User created successfully');
        setShowCreateModal(false);
        setCreateForm({ email: '', username: '', password: '', role: 'user' });
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to create user', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Creation error', 'error');
    }
  };

  const handleToggleRole = async (user: UserData) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to change ${user.username}'s role to ${nextRole.toUpperCase()}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', id: user.id, role: nextRole }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Role updated to ${nextRole}`);
        fetchUsers();
      } else {
        showToast(data.error || 'Role update failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleBan = async (user: UserData) => {
    const actionText = user.banned ? 'lift suspension for' : 'suspend';
    if (!confirm(`Are you sure you want to ${actionText} ${user.username}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_ban', id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        fetchUsers();
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal || !newPassword) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          id: showPasswordModal.id,
          newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Password updated for ${showPasswordModal.username}`);
        setShowPasswordModal(null);
        setNewPassword('');
      } else {
        showToast(data.error || 'Password reset failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    if (!confirm(`DANGER: Permanently delete account for ${user.username} (${user.email})? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('User deleted successfully');
        fetchUsers();
      } else {
        showToast(data.error || 'Delete failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleS3BackupNow = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup_now' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Backed up users to AWS S3 Sydney!');
      } else {
        showToast(data.error || 'S3 Backup failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'S3 sync error', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleS3Restore = async () => {
    if (!confirm('Restore users database from AWS S3 Sydney backup? This will sync all records from S3.')) {
      return;
    }

    try {
      setIsSyncing(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore_from_s3' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'User database restored from S3!');
        fetchUsers();
      } else {
        showToast(data.error || 'S3 Restore failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>User Management & Access Studio</h1>
          <p>Self-hosted EC2 authentication engine backed by encrypted AWS S3 Sydney storage</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleS3BackupNow}
            disabled={isSyncing}
            title="Upload snapshot of user database to AWS S3 Sydney"
          >
            <CloudUpload size={16} />
            {isSyncing ? 'Syncing...' : 'S3 Backup Now'}
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleS3Restore}
            disabled={isSyncing}
            title="Cold-boot restore user database from AWS S3 Sydney"
          >
            <CloudDownload size={16} />
            Restore from S3
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            Create User
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Users size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Users</span>
            <span className={styles.metricValue}>{stats.totalUsers}</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)' }}>
            <Shield size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Administrators</span>
            <span className={styles.metricValue}>{stats.adminUsers}</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.15)' }}>
            <UserCheck size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Active Members</span>
            <span className={styles.metricValue}>{stats.regularUsers}</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)' }}>
            <UserX size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Suspended</span>
            <span className={styles.metricValue}>{stats.bannedUsers}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search users by email or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className={styles.filterSelect}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="admin">Administrators</option>
          <option value="user">Regular Users</option>
          <option value="moderator">Moderators</option>
        </select>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="banned">Suspended Only</option>
        </select>

        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={fetchUsers}
          title="Refresh User List"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Users Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    {loading ? 'Loading user database...' : 'No users match the search criteria.'}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const initial = (u.username || u.email || 'U')[0].toUpperCase();
                  const isSuspended = u.banned;
                  const joinedDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
                  const lastActive = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}>{initial}</div>
                          <div className={styles.userMeta}>
                            <span className={styles.username}>{u.username}</span>
                            <span className={styles.email}>{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`${styles.badge} ${
                            u.role === 'admin'
                              ? styles.badgeAdmin
                              : u.role === 'moderator'
                              ? styles.badgeMod
                              : styles.badgeUser
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`${styles.badge} ${
                            isSuspended ? styles.badgeBanned : styles.badgeActive
                          }`}
                        >
                          {isSuspended ? '● Suspended' : '● Active'}
                        </span>
                      </td>

                      <td>{joinedDate}</td>
                      <td>{lastActive}</td>

                      <td>
                        <div className={styles.actionGroup} style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => handleToggleRole(u)}
                            title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                          >
                            <Shield size={14} color={u.role === 'admin' ? '#818cf8' : '#94a3b8'} />
                          </button>

                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => {
                              setShowPasswordModal(u);
                              setNewPassword('');
                            }}
                            title="Reset Password"
                          >
                            <Key size={14} />
                          </button>

                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => handleToggleBan(u)}
                            title={isSuspended ? 'Lift Suspension' : 'Suspend Account'}
                          >
                            <Ban size={14} color={isSuspended ? '#ef4444' : '#94a3b8'} />
                          </button>

                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Create New User Account</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  className={styles.formInput}
                  placeholder="user@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Username</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="e.g. AnimeFan42"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className={styles.formInput}
                  placeholder="At least 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Account Role</label>
                <select
                  className={styles.formInput}
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                >
                  <option value="user">User (Standard)</option>
                  <option value="admin">Administrator</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {showPasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Reset Password for {showPasswordModal.username}</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowPasswordModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className={styles.formGroup}>
                <label>New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className={styles.formInput}
                  placeholder="Enter new secure password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setShowPasswordModal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'error' ? styles.toastError : styles.toastSuccess
          }`}
        >
          {toast.type === 'error' ? (
            <X size={16} color="#ef4444" />
          ) : (
            <CheckCircle size={16} color="#10b981" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
