'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Tv, User, LogOut, Heart, History, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SearchBar from '../SearchBar/SearchBar';
import styles from './Header.module.css';

const LogoIcon = () => (
  <div className={styles.logoBadge}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tvIconSvg}>
      <rect x="2" y="7" width="20" height="14" rx="3" ry="3" stroke="#ffffff" strokeWidth="2" fill="none" />
      <path d="M17 2l-5 5-5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="10,11 15,14 10,17" fill="#eab308" stroke="#eab308" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  </div>
);

export default function Header() {
  const { user, profile, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentGenre, setCurrentGenre] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update current genre client-side to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setCurrentGenre(params.get('genre'));
    }
  }, [pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setDropdownOpen(false);
    router.push('/');
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  if (!mounted) {
    return (
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <LogoIcon />
          <span className={styles.logoText}>
            <span className={styles.logoTextPlay}>PLAY</span>
            <span className={styles.logoTextGold}>HENTAI</span>
          </span>
        </div>
      </header>
    );
  }

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <Link href="/" className={styles.logoContainer}>
          <LogoIcon />
          <span className={styles.logoText}>
            <span className={styles.logoTextPlay}>PLAY</span>
            <span className={styles.logoTextGold}>HENTAI</span>
          </span>
        </Link>

        <nav className={`${styles.nav} ${searchFocused ? styles.navHidden : ''}`}>
          <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.activeLink : ''}`}>
            Home
          </Link>
          <Link href="/categories" className={`${styles.navLink} ${pathname === '/categories' && !currentGenre ? styles.activeLink : ''}`}>
            Series
          </Link>
          <Link href="/categories?genre=uncensored" className={`${styles.navLink} ${pathname === '/categories' && currentGenre === 'uncensored' ? styles.activeLink : ''}`}>
            Uncensored
          </Link>
          <Link href="/collections" className={`${styles.navLink} ${pathname.startsWith('/collections') ? styles.activeLink : ''}`}>
            Playlists
          </Link>
          <Link href="/random" className={`${styles.navLink} ${pathname === '/random' ? styles.activeLink : ''}`}>
            Surprise Me
          </Link>
        </nav>
      </div>

      <div className={`${styles.centerSection} ${searchFocused ? styles.centerSectionFocused : ''}`}>
        <SearchBar onFocusChange={setSearchFocused} />
      </div>
      <div className={styles.rightSection}>
        {/* Watchlist Shortcut */}
        {user && (
          <Link href="/watchlist" className={`${styles.watchlistShortcut} ${pathname === '/watchlist' ? styles.activeLink : ''}`} title="My Watchlist">
            <Heart size={16} className={styles.watchlistShortcutIcon} />
            <span>Watchlist</span>
          </Link>
        )}

        {/* User Account Controls */}
        {loading ? (
          <div className={styles.skeletonUser} />
        ) : user ? (
          <div className={styles.profileContainer} ref={dropdownRef}>
            <button onClick={toggleDropdown} className={styles.profileBtn}>
              <div className={styles.avatar}>
                <User size={16} />
              </div>
              <span className={styles.username}>
                {profile?.username || user.email?.split('@')[0]}
              </span>
              <ChevronDown size={14} className={`${styles.chevron} ${dropdownOpen ? styles.chevronRotate : ''}`} />
            </button>

            {dropdownOpen && (
              <div className={`${styles.dropdownMenu} glass`}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownEmail}>{user.email}</div>
                  {profile?.role === 'admin' && (
                    <span className={styles.adminBadge}>Admin</span>
                  )}
                </div>

                <hr className={styles.divider} />

                <Link 
                  href="/watchlist" 
                  onClick={() => setDropdownOpen(false)} 
                  className={styles.dropdownItem}
                >
                  <Heart size={16} />
                  <span>My Watchlist</span>
                </Link>

                <Link 
                  href="/history" 
                  onClick={() => setDropdownOpen(false)} 
                  className={styles.dropdownItem}
                >
                  <History size={16} />
                  <span>Watch History</span>
                </Link>

                {profile?.role === 'admin' && (
                  <Link 
                    href="/admin" 
                    onClick={() => setDropdownOpen(false)} 
                    className={styles.dropdownItem}
                  >
                    <Settings size={16} />
                    <span>Admin Dashboard</span>
                  </Link>
                )}

                <hr className={styles.divider} />

                <button onClick={handleSignOut} className={`${styles.dropdownItem} ${styles.signOutBtn}`}>
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className={styles.signInBtn}>
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
