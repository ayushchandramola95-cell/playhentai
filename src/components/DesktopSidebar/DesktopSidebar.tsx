'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Flame, 
  Layers, 
  ShieldCheck, 
  Box, 
  Film, 
  Tv, 
  Dices, 
  Bookmark, 
  History, 
  Heart, 
  Settings 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './DesktopSidebar.module.css';

const SidebarLogoIcon = () => (
  <div className={styles.logoBadge}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tvIconSvg}>
      <rect x="2" y="7" width="20" height="14" rx="3" ry="3" stroke="#ffffff" strokeWidth="2" fill="none" />
      <path d="M17 2l-5 5-5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="10,11 15,14 10,17" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  </div>
);

export default function DesktopSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const isNavActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/') return pathname === '/';
    if (path === '/categories') {
      return (
        pathname === '/categories' ||
        pathname.startsWith('/tag/') ||
        pathname.startsWith('/genre/') ||
        pathname.startsWith('/status/') ||
        pathname.startsWith('/year/')
      );
    }
    if (path === '/playlists') {
      return pathname.startsWith('/playlists') || pathname.startsWith('/collections');
    }
    if (path === '/studios') {
      return pathname.startsWith('/studios');
    }
    if (path === '/admin') {
      return pathname.startsWith('/admin');
    }
    return pathname === path;
  };

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Trending', href: '/trending', icon: Flame, iconColor: '#f97316' },
    { label: 'Browse', href: '/categories', icon: Layers },
    { label: 'Uncensored', href: '/uncensored', icon: ShieldCheck, iconColor: '#10b981' },
    { label: '3D Animations', href: '/3d', icon: Box, iconColor: '#06b6d4' },
    { label: 'Playlists', href: '/playlists', icon: Film },
    { label: 'Studios', href: '/studios', icon: Tv },
    { label: 'Random', href: '/random', icon: Dices, iconColor: '#a855f7' },
  ];

  const bottomItems = [
    { label: 'Watchlist', href: '/watchlist', icon: Bookmark },
    { label: 'History', href: '/history', icon: History },
    { label: 'Favorites', href: '/favorites', icon: Heart, iconColor: '#ec4899' },
  ];

  return (
    <aside className={styles.sidebar} aria-label="Main Desktop Navigation">
      {/* Top Logo Mark */}
      <div className={styles.logoSection}>
        <Link href="/" className={styles.logoLink} aria-label="Play Hentai Home">
          <SidebarLogoIcon />
          <span className={styles.tooltip}>Play Hentai</span>
        </Link>
      </div>

      {/* Main Navigation Rail */}
      <nav className={styles.navSection}>
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isNavActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.activeItem : ''}`}
              aria-label={item.label}
            >
              <Icon 
                size={21} 
                className={styles.navIcon} 
                style={!active && item.iconColor ? { color: item.iconColor } : undefined} 
              />
              <span className={styles.tooltip}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User / Quick Actions Bottom Section */}
      <div className={styles.bottomSection}>
        {bottomItems.map(item => {
          const Icon = item.icon;
          const active = isNavActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.activeItem : ''}`}
              aria-label={item.label}
            >
              <Icon 
                size={20} 
                className={styles.navIcon} 
                style={!active && item.iconColor ? { color: item.iconColor } : undefined} 
              />
              <span className={styles.tooltip}>{item.label}</span>
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <Link
            href="/admin"
            className={`${styles.navItem} ${isNavActive('/admin') ? styles.activeItem : ''}`}
            aria-label="Admin Panel"
          >
            <Settings size={20} className={styles.navIcon} style={{ color: '#f59e0b' }} />
            <span className={styles.tooltip}>Admin Panel</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
