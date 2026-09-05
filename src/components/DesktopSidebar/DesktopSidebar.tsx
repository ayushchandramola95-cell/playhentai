'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
  Settings,
  Menu,
  User,
  LogIn,
  UserPlus,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import styles from './DesktopSidebar.module.css';

const SidebarLogoIcon = () => (
  <div className={styles.logoBadge}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tvIconSvg}>
      <rect x="2" y="7" width="20" height="14" rx="3" ry="3" stroke="#ffffff" strokeWidth="2" fill="none" />
      <path d="M17 2l-5 5-5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="10,11 15,14 10,17" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  </div>
);

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { isExpanded, toggleSidebar } = useSidebar();

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

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Trending', href: '/trending', icon: Flame, iconColor: '#f97316' },
    { label: 'Browse Hentai', href: '/categories', icon: Layers },
    { label: 'Uncensored', href: '/uncensored', icon: ShieldCheck, iconColor: '#10b981' },
    { label: '3D Animations', href: '/3d', icon: Box, iconColor: '#06b6d4' },
    { label: 'Playlists', href: '/playlists', icon: Film },
    { label: 'Studios', href: '/studios', icon: Tv },
    { label: 'Random', href: '/random', icon: Dices, iconColor: '#a855f7' },
  ];

  const libraryItems = [
    { label: 'My Watchlist', href: '/watchlist', icon: Bookmark },
    { label: 'Watch History', href: '/history', icon: History },
    { label: 'Favorites', href: '/favorites', icon: Heart, iconColor: '#ec4899' },
  ];

  return (
    <aside 
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`} 
      aria-label="Main Desktop Navigation"
    >
      {/* Top Header Section with Hamburger Toggle & Logo */}
      <div className={styles.sidebarHeader}>
        <button 
          type="button"
          onClick={toggleSidebar} 
          className={styles.toggleBtn} 
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          title={isExpanded ? 'Collapse menu' : 'Expand menu'}
        >
          <Menu size={22} />
        </button>

        <Link href="/" className={styles.logoLink} aria-label="Play Hentai Home">
          <SidebarLogoIcon />
          <span className={styles.logoText}>
            <span className={styles.logoTextPlay}>PLAY</span>
            <span className={styles.logoTextGold}>HENTAI</span>
          </span>
        </Link>
      </div>

      {/* Scrollable Sidebar Body */}
      <div className={styles.sidebarBody}>
        {/* Main Navigation Section */}
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
                  size={20} 
                  className={styles.navIcon} 
                  style={!active && item.iconColor ? { color: item.iconColor } : undefined} 
                />
                <span className={styles.navLabel}>{item.label}</span>
                {!isExpanded && <span className={styles.tooltip}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Library Section */}
        <div className={styles.sectionDivider} />
        {isExpanded && <div className={styles.sectionHeading}>LIBRARY</div>}
        
        <div className={styles.navSection}>
          {libraryItems.map(item => {
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
                <span className={styles.navLabel}>{item.label}</span>
                {!isExpanded && <span className={styles.tooltip}>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Account / Admin Section */}
        <div className={styles.sectionDivider} />
        {isExpanded && <div className={styles.sectionHeading}>ACCOUNT</div>}

        <div className={styles.navSection}>
          {user ? (
            <>
              {profile?.role === 'admin' && (
                <Link
                  href="/admin"
                  className={`${styles.navItem} ${isNavActive('/admin') ? styles.activeItem : ''}`}
                  aria-label="Admin Dashboard"
                >
                  <Settings size={20} className={styles.navIcon} style={{ color: '#f59e0b' }} />
                  <span className={styles.navLabel}>Admin Console</span>
                  {!isExpanded && <span className={styles.tooltip}>Admin Console</span>}
                </Link>
              )}

              <button 
                type="button"
                onClick={handleSignOut}
                className={`${styles.navItem} ${styles.signOutBtn}`}
                aria-label="Sign Out"
              >
                <LogOut size={20} className={styles.navIcon} />
                <span className={styles.navLabel}>Sign Out</span>
                {!isExpanded && <span className={styles.tooltip}>Sign Out</span>}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={styles.navItem}
                aria-label="Sign In"
              >
                <LogIn size={20} className={styles.navIcon} />
                <span className={styles.navLabel}>Sign In</span>
                {!isExpanded && <span className={styles.tooltip}>Sign In</span>}
              </Link>

              <Link
                href="/login"
                className={styles.navItem}
                aria-label="Create Account"
              >
                <UserPlus size={20} className={styles.navIcon} />
                <span className={styles.navLabel}>Create Account</span>
                {!isExpanded && <span className={styles.tooltip}>Create Account</span>}
              </Link>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
