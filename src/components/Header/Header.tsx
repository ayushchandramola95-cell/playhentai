'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Tv, User, LogOut, Heart, History, Settings, ShieldCheck, ChevronDown, Menu, X, Home, Layers, Eye, Film, Dices } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentGenre, setCurrentGenre] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile drawer and reset search focus on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchFocused(false);
  }, [pathname]);

  // Prevent scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

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
      <div className={`${styles.leftSection} ${searchFocused ? styles.leftSectionHidden : ''}`}>
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
      <div className={`${styles.rightSection} ${searchFocused ? styles.rightSectionHidden : ''}`}>
        {/* Watchlist Shortcut - Always Visible */}
        <Link href="/watchlist" className={`${styles.watchlistShortcut} ${pathname === '/watchlist' ? styles.activeLink : ''}`} title="My Watchlist">
          <Heart size={16} className={styles.watchlistShortcutIcon} />
          <span>Watchlist</span>
        </Link>

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
                  href="/favorites" 
                  onClick={() => setDropdownOpen(false)} 
                  className={styles.dropdownItem}
                >
                  <Heart size={16} style={{ color: '#ec4899' }} />
                  <span>My Favorites</span>
                </Link>

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

                <Link 
                  href="/settings" 
                  onClick={() => setDropdownOpen(false)} 
                  className={styles.dropdownItem}
                >
                  <Settings size={16} />
                  <span>Account & Security</span>
                </Link>

                {profile?.role === 'admin' && (
                  <Link 
                    href="/admin" 
                    onClick={() => setDropdownOpen(false)} 
                    className={styles.dropdownItem}
                  >
                    <ShieldCheck size={16} />
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

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className={styles.hamburgerBtn}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawerOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div className={styles.mobileDrawerContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mobileDrawerHeader}>
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className={styles.logoContainer}>
                <LogoIcon />
                <span className={styles.logoText}>
                  <span className={styles.logoTextPlay}>PLAY</span>
                  <span className={styles.logoTextGold}>HENTAI</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className={styles.drawerCloseBtn}
              >
                <X size={22} />
              </button>
            </div>

            <nav className={styles.mobileNavList}>
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className={`${styles.mobileNavLink} ${pathname === '/' ? styles.activeLink : ''}`}>
                <Home size={18} />
                <span>Home</span>
              </Link>

              <Link href="/categories" onClick={() => setMobileMenuOpen(false)} className={`${styles.mobileNavLink} ${pathname === '/categories' && !currentGenre ? styles.activeLink : ''}`}>
                <Layers size={18} />
                <span>Series Library</span>
              </Link>

              <Link href="/categories?genre=uncensored" onClick={() => setMobileMenuOpen(false)} className={`${styles.mobileNavLink} ${pathname === '/categories' && currentGenre === 'uncensored' ? styles.activeLink : ''}`}>
                <Eye size={18} />
                <span>Uncensored</span>
              </Link>

              <Link href="/collections" onClick={() => setMobileMenuOpen(false)} className={`${styles.mobileNavLink} ${pathname.startsWith('/collections') ? styles.activeLink : ''}`}>
                <Film size={18} />
                <span>Playlists</span>
              </Link>

              <Link href="/random" onClick={() => setMobileMenuOpen(false)} className={`${styles.mobileNavLink} ${pathname === '/random' ? styles.activeLink : ''}`}>
                <Dices size={18} />
                <span>Surprise Me</span>
              </Link>

              <hr className={styles.drawerDivider} />

              {user ? (
                <>
                  <Link href="/watchlist" onClick={() => setMobileMenuOpen(false)} className={styles.mobileNavLink}>
                    <Heart size={18} />
                    <span>My Watchlist</span>
                  </Link>

                  <Link href="/history" onClick={() => setMobileMenuOpen(false)} className={styles.mobileNavLink}>
                    <History size={18} />
                    <span>Watch History</span>
                  </Link>

                  {profile?.role === 'admin' && (
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className={styles.mobileNavLink}>
                      <Settings size={18} />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className={`${styles.mobileNavLink} ${styles.mobileSignOut}`}>
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className={styles.mobileSignInBtn}>
                  Sign In / Register
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
