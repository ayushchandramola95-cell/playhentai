'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Film, FolderOpen, Video, Tag, BarChart3, Tv, Settings, Sparkles, Radio, Layers } from 'lucide-react';
import styles from './admin.module.css';

interface AdminNavProps {
  isCollapsed?: boolean;
}

export default function AdminNav({ isCollapsed }: AdminNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/featured', label: 'Hero Carousel', icon: Tv },
    { href: '/admin/playlists', label: 'Playlists', icon: Layers },
    { href: '/admin/series', label: 'Series', icon: Film },
    { href: '/admin/seasons', label: 'Seasons', icon: FolderOpen },
    { href: '/admin/episodes', label: 'Episodes', icon: Video },
    { href: '/admin/filters', label: 'Genres & Studios', icon: Tag },
    { href: '/admin/analytics', label: 'Analytics & Mod', icon: BarChart3 },
    { href: '/admin/developer/seo', label: 'Developer SEO', icon: Sparkles },
    { href: '/admin/developer/ads', label: 'Developer Ads', icon: Radio },
    { href: '/admin/settings', label: 'Site Settings', icon: Settings },
  ];

  return (
    <nav className={styles.navMenu}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === '/admin' ? pathname === '/admin' : (pathname ? pathname.startsWith(item.href) : false);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={isCollapsed ? item.label : undefined}
            className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
