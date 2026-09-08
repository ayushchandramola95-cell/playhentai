'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Tv, 
  User, 
  LogOut, 
  Heart, 
  Bookmark, 
  History, 
  Settings, 
  ShieldCheck, 
  ChevronDown, 
  Menu, 
  X, 
  Home, 
  Flame,
  Sparkles,
  Layers, 
  Film, 
  Dices, 
  Box,
  HelpCircle,
  FileText,
  Shield,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import SearchBar from '../SearchBar/SearchBar';
import styles from './Header.module.css';

const LogoIcon = () => (
  <div className={styles.logoBadge}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tvIconSvg}>
      <rect x="2" y="7" width="20" height="14" rx="3" ry="3" stroke="#ffffff" strokeWidth="2" fill="none" />
      <path d="M17 2l-5 5-5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="10,11 15,14 10,17" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  </div>
);

export default function Header() {
  const { user, profile, loading, signOut } = useAuth();
  const { isExpanded, toggleSidebar } = useSidebar();
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

  // Close mobile drawer, reset search focus, and scroll to top on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchFocused(false);
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
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
    setMobileMenuOpen(false);
    router.push('/');
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

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
    if (path === '/genres') return pathname.startsWith('/genres');
    if (path === '/playlists') return pathname.startsWith('/playlists') || pathname.startsWith('/collections');
    if (path === '/studios') return pathname.startsWith('/studios');
    if (path === '/admin') return pathname.startsWith('/admin');
    return pathname === path || pathname.startsWith(path + '/');
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
      {/* Left Section: [ Hamburger Menu (Desktop / Mobile) ] + [ PlayHentai Logo ] */}
      <div className={`${styles.leftSection} ${searchFocused ? styles.leftSectionHidden : ''}`}>
        {/* Desktop Sidebar Toggle Button (Visible >= 901px) */}
        <button
          type="button"
          onClick={toggleSidebar}
          className={styles.desktopHamburgerBtn}
          aria-label={isExpanded ? 'Collapse sidebar menu' : 'Expand sidebar menu'}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu size={22} />
        </button>

        {/* Mobile Hamburger Toggle Button (First item on mobile <= 900px) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className={styles.mobileHamburgerBtn}
          aria-label="Open navigation menu"
          title="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* PlayHentai Logo */}
        <Link href="/" className={styles.logoContainer} aria-label="PlayHentai Home">
          <LogoIcon />
          <span className={styles.logoText}>
            <span className={styles.logoTextPlay}>PLAY</span>
            <span className={styles.logoTextGold}>HENTAI</span>
          </span>
        </Link>
      </div>

      {/* Center Section: [ Expanded Search Box ] */}
      <div className={`${styles.centerSection} ${searchFocused ? styles.centerSectionFocused : ''}`}>
        <SearchBar onFocusChange={setSearchFocused} />
      </div>

      {/* Right Section: Desktop Watchlist Shortcut & User Dropdown */}
      <div className={styles.rightSection}>
        {/* Watchlist Shortcut */}
        <Link href="/watchlist" className={`${styles.watchlistShortcut} ${pathname === '/watchlist' ? styles.activeLink : ''}`} title="My Watchlist">
          <Bookmark size={16} className={styles.watchlistShortcutIcon} />
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
                  href="/history" 
                  onClick={() => setDropdownOpen(false)} 
                  className={styles.dropdownItem}
                >
                  <History size={16} style={{ color: '#8b5cf6' }} />
                  <span>Watch History</span>
                </Link>

                {profile?.role === 'admin' && (
                  <Link 
                    href="/admin" 
                    onClick={() => setDropdownOpen(false)} 
                    className={styles.dropdownItem}
                  >
                    <Settings size={16} style={{ color: '#f59e0b' }} />
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

      {/* Smart Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawerOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div className={styles.mobileDrawerContent} onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className={styles.mobileDrawerHeader}>
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className={styles.drawerLogo}>
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
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* User Profile Card / Guest CTA Banner */}
            <div className={styles.drawerUserSection}>
              {user ? (
                <div className={styles.drawerUserCard}>
                  <div className={styles.drawerUserAvatar}>
                    <User size={18} />
                  </div>
                  <div className={styles.drawerUserInfo}>
                    <div className={styles.drawerUserName}>
                      {profile?.username || user.email?.split('@')[0]}
                    </div>
                    <div className={styles.drawerUserEmail}>{user.email}</div>
                  </div>
                  {profile?.role === 'admin' ? (
                    <span className={styles.drawerAdminBadge}>Admin</span>
                  ) : (
                    <span className={styles.drawerMemberBadge}>VIP</span>
                  )}
                </div>
              ) : (
                <div className={styles.drawerGuestCard}>
                  <div className={styles.guestText}>
                    <div className={styles.guestTitle}>Welcome to PlayHentai</div>
                    <div className={styles.guestSubtitle}>Sign in to save favorites, sync history & watchlist</div>
                  </div>
                  <div className={styles.guestActionRow}>
                    <Link 
                      href="/login" 
                      onClick={() => setMobileMenuOpen(false)} 
                      className={styles.guestSignInBtn}
                    >
                      <LogIn size={15} />
                      <span>Sign In</span>
                    </Link>
                    <Link 
                      href="/login" 
                      onClick={() => setMobileMenuOpen(false)} 
                      className={styles.guestSignUpBtn}
                    >
                      <UserPlus size={15} />
                      <span>Register</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Navigation List */}
            <div className={styles.drawerNavBody}>
              {/* Section 1: DISCOVER & TRENDING */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>DISCOVER</div>
                <div className={styles.drawerNavGroup}>
                  <Link 
                    href="/" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${pathname === '/' ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#3b82f6' }}>
                      <Home size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Home</span>
                  </Link>

                  <Link 
                    href="/trending" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${isNavActive('/trending') ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#f97316' }}>
                      <Flame size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Trending</span>
                    <span className={`${styles.navBadge} ${styles.badgeHot}`}>HOT</span>
                  </Link>

                  <Link 
                    href="/uncensored" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${isNavActive('/uncensored') ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#10b981' }}>
                      <ShieldCheck size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Uncensored</span>
                    <span className={`${styles.navBadge} ${styles.badgeUncensored}`}>18+</span>
                  </Link>

                  <Link 
                    href="/3d" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${isNavActive('/3d') ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#06b6d4' }}>
                      <Box size={18} />
                    </div>
                    <span className={styles.drawerNavText}>3D Animations</span>
                    <span className={`${styles.navBadge} ${styles.badge3D}`}>HD</span>
                  </Link>
                </div>
              </div>

              {/* Section 2: BROWSE & EXPLORE */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>BROWSE & EXPLORE</div>
                <div className={styles.drawerNavGroup}>
                  <Link 
                    href="/categories" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${pathname === '/categories' ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#6366f1' }}>
                      <Layers size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Browse Catalog</span>
                  </Link>

                  <Link 
                    href="/genres" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${isNavActive('/genres') ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#ec4899' }}>
                      <Sparkles size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Genres Directory</span>
                  </Link>

                  <Link 
                    href="/playlists" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${isNavActive('/playlists') ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#eab308' }}>
                      <Film size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Playlists</span>
                  </Link>

                  <Link 
                    href="/studios" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${isNavActive('/studios') ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#38bdf8' }}>
                      <Tv size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Studios</span>
                  </Link>

                  <Link 
                    href="/random" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${isNavActive('/random') ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#c084fc' }}>
                      <Dices size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Randomizer</span>
                  </Link>
                </div>
              </div>

              {/* Section 3: MY LIBRARY */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>MY LIBRARY</div>
                <div className={styles.drawerNavGroup}>
                  <Link 
                    href="/watchlist" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${pathname === '/watchlist' ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#3b82f6' }}>
                      <Bookmark size={18} />
                    </div>
                    <span className={styles.drawerNavText}>My Watchlist</span>
                  </Link>

                  <Link 
                    href="/favorites" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${pathname === '/favorites' ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#ec4899' }}>
                      <Heart size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Favorites</span>
                  </Link>

                  <Link 
                    href="/history" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${pathname === '/history' ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#8b5cf6' }}>
                      <History size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Watch History</span>
                  </Link>
                </div>
              </div>

              {/* Section 4: MORE & COMMUNITY */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>PLATFORM & SUPPORT</div>
                <div className={styles.drawerNavGroup}>
                  <Link 
                    href="/faq" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${pathname === '/faq' ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#94a3b8' }}>
                      <HelpCircle size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Help & FAQ</span>
                  </Link>

                  <Link 
                    href="/terms" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${pathname === '/terms' ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#64748b' }}>
                      <FileText size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Terms of Service</span>
                  </Link>

                  <Link 
                    href="/privacy" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={`${styles.drawerNavLink} ${pathname === '/privacy' ? styles.drawerActiveLink : ''}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#64748b' }}>
                      <Shield size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Privacy Policy</span>
                  </Link>

                  {profile?.role === 'admin' && (
                    <Link 
                      href="/admin" 
                      onClick={() => setMobileMenuOpen(false)} 
                      className={`${styles.drawerNavLink} ${isNavActive('/admin') ? styles.drawerActiveLink : ''}`}
                    >
                      <div className={styles.drawerIconBox} style={{ color: '#f59e0b' }}>
                        <Settings size={18} />
                      </div>
                      <span className={styles.drawerNavText}>Admin Dashboard</span>
                      <span className={`${styles.navBadge} ${styles.badgeAdmin}`}>ADMIN</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Sign Out Button for Logged in Users */}
              {user && (
                <div className={styles.drawerSection}>
                  <button 
                    type="button" 
                    onClick={handleSignOut} 
                    className={`${styles.drawerNavLink} ${styles.drawerSignOutBtn}`}
                  >
                    <div className={styles.drawerIconBox} style={{ color: '#ef4444' }}>
                      <LogOut size={18} />
                    </div>
                    <span className={styles.drawerNavText}>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className={styles.drawerFooter}>
              <div className={styles.drawerFooterText}>PlayHentai © 2026 • Free HD Streaming</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
