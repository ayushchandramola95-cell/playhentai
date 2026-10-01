'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Home, 
  LayoutGrid, 
  TrendingUp, 
  Crown,
  Shuffle, 
  Heart, 
  Clock, 
  Bookmark,
  Film, 
  BadgeCheck, 
  Grid3X3,
  Settings, 
  LogIn, 
  UserPlus, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import styles from './DesktopSidebar.module.css';

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { isExpanded } = useSidebar();

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
    if (path === '/genres') {
      return pathname.startsWith('/genres');
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

  const watchItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Browse', href: '/categories', icon: LayoutGrid },
    { label: 'Trending', href: '/trending', icon: TrendingUp },
    { label: 'Top rated', href: '/playlists', icon: Crown },
    { label: 'Random', href: '/random', icon: Shuffle },
  ];

  const libraryItems = [
    { label: 'Favorites', href: '/favorites', icon: Heart },
    { label: 'History', href: '/history', icon: Clock },
    { label: 'Watchlist', href: '/watchlist', icon: Bookmark },
  ];

  const exploreItems = [
    { label: 'Series', href: '/recent/series', icon: Film },
    { label: 'Studios', href: '/studios', icon: BadgeCheck },
    { label: 'Tags', href: '/genres', icon: Grid3X3 },
  ];

  const allItems = [...watchItems, ...libraryItems, ...exploreItems];

  return (
    <aside 
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`} 
      aria-label="Main Desktop Navigation"
    >
      <div className={styles.sidebarBody}>
        {/* Expanded Top Auth Buttons (Like Hanime) */}
        {isExpanded && !user && (
          <div className={styles.expandedAuthBox}>
            <Link href="/login" className={styles.expandedLoginBtn}>
              <LogIn size={15} />
              <span>Log in</span>
            </Link>
            <Link href="/login" className={styles.expandedJoinBtn}>
              <UserPlus size={15} />
              <span>Join</span>
            </Link>
          </div>
        )}

        {isExpanded && user && (
          <div className={styles.expandedUserCard}>
            <div className={styles.userAvatar}>
              {(profile?.username || user.email || 'U')[0].toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{profile?.username || 'User'}</span>
              <span className={styles.userRole}>{profile?.role === 'admin' ? 'Admin' : 'Member'}</span>
            </div>
          </div>
        )}

        {/* Collapsed Mode: Single clean icon+label column (Hanime style) */}
        {!isExpanded ? (
          <nav className={styles.collapsedNav}>
            {allItems.map(item => {
              const Icon = item.icon;
              const active = isNavActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.collapsedItem} ${active ? styles.collapsedActiveItem : ''}`}
                  aria-label={item.label}
                >
                  <div className={styles.collapsedIconWrapper}>
                    <Icon size={20} className={styles.collapsedIcon} />
                  </div>
                  <span className={styles.collapsedLabel}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : (
          /* Expanded Mode: Categorized Sections with Headings (Hanime drawer style) */
          <div className={styles.expandedSectionsWrap}>
            <div className={styles.groupHeading}>WATCH</div>
            <nav className={styles.expandedNav}>
              {watchItems.map(item => {
                const Icon = item.icon;
                const active = isNavActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.expandedItem} ${active ? styles.expandedActiveItem : ''}`}
                  >
                    <Icon size={18} className={styles.expandedIcon} />
                    <span className={styles.expandedLabel}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className={styles.sectionDivider} />
            <div className={styles.groupHeading}>LIBRARY</div>
            <nav className={styles.expandedNav}>
              {libraryItems.map(item => {
                const Icon = item.icon;
                const active = isNavActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.expandedItem} ${active ? styles.expandedActiveItem : ''}`}
                  >
                    <Icon size={18} className={styles.expandedIcon} />
                    <span className={styles.expandedLabel}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className={styles.sectionDivider} />
            <div className={styles.groupHeading}>EXPLORE</div>
            <nav className={styles.expandedNav}>
              {exploreItems.map(item => {
                const Icon = item.icon;
                const active = isNavActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.expandedItem} ${active ? styles.expandedActiveItem : ''}`}
                  >
                    <Icon size={18} className={styles.expandedIcon} />
                    <span className={styles.expandedLabel}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Account / Admin section */}
            {user && (
              <>
                <div className={styles.sectionDivider} />
                <div className={styles.groupHeading}>ACCOUNT</div>
                <nav className={styles.expandedNav}>
                  {profile?.role === 'admin' && (
                    <Link
                      href="/admin"
                      className={`${styles.expandedItem} ${isNavActive('/admin') ? styles.expandedActiveItem : ''}`}
                    >
                      <Settings size={18} className={styles.expandedIcon} />
                      <span className={styles.expandedLabel}>Admin Console</span>
                    </Link>
                  )}
                  <button 
                    type="button"
                    onClick={handleSignOut}
                    className={`${styles.expandedItem} ${styles.signOutBtn}`}
                  >
                    <LogOut size={18} className={styles.expandedIcon} />
                    <span className={styles.expandedLabel}>Sign Out</span>
                  </button>
                </nav>
              </>
            )}

            {/* Expanded Footer Links */}
            <div className={styles.expandedFooterLinks}>
              <Link href="/terms">Terms</Link>
              <span className={styles.footerDot}>•</span>
              <Link href="/privacy">Privacy</Link>
              <span className={styles.footerDot}>•</span>
              <Link href="/dmca">DMCA</Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
