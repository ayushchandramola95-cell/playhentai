'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tv, Shield, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminNav from './AdminNav';
import styles from './admin.module.css';

interface AdminSidebarProps {
  username: string;
}

export default function AdminSidebar({ username }: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logoBrand}>
          <Tv size={24} className={styles.logoIcon} />
          {!isCollapsed && <span className={styles.logoText}>AdminPanel</span>}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className={styles.toggleBtn}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className={styles.adminUser} title={username}>
        <Shield size={16} className={styles.shieldIcon} />
        {!isCollapsed && <span className={styles.username}>{username}</span>}
      </div>

      <AdminNav isCollapsed={isCollapsed} />

      <div className={styles.sidebarFooter}>
        <Link 
          href="/" 
          className={styles.backBtn}
          title={isCollapsed ? "Back to Site" : undefined}
        >
          <ArrowLeft size={16} />
          {!isCollapsed && <span>Back to Site</span>}
        </Link>
      </div>
    </aside>
  );
}
