'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Film,
  FolderOpen,
  Video,
  Tag,
  BarChart3,
  Tv,
  Settings,
  Sparkles,
  Radio,
  Layers,
  AlertTriangle,
  Activity,
  Sliders,
  Users,
  Database,
  Building2,
  MessageSquare,
} from 'lucide-react';
import styles from './admin.module.css';

interface AdminNavProps {
  isCollapsed?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function AdminNav({ isCollapsed }: AdminNavProps) {
  const pathname = usePathname();

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { href: '/admin', label: 'Dashboard', icon: Home, exact: true },
        { href: '/admin/analytics', label: 'Live Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Catalog & Media',
      items: [
        { href: '/admin/series', label: 'Anime Series', icon: Film },
        { href: '/admin/seasons', label: 'Seasons & Arcs', icon: FolderOpen },
        { href: '/admin/episodes', label: 'Episodes Studio', icon: Video },
        { href: '/admin/transcoder', label: 'Video Transcoder', icon: Sliders },
        { href: '/admin/featured', label: 'Hero Carousel', icon: Tv },
        { href: '/admin/playlists', label: 'Playlists', icon: Layers },
      ],
    },
    {
      title: 'Taxonomy',
      items: [
        { href: '/admin/filters', label: 'Genres & Tags', icon: Tag },
        { href: '/admin/studios', label: 'Anime Studios', icon: Building2 },
      ],
    },
    {
      title: 'Community',
      items: [
        { href: '/admin/users', label: 'Users & Roles', icon: Users },
        { href: '/admin/comments', label: 'Comments Mod', icon: MessageSquare },
        { href: '/admin/developer/reports', label: 'Issue Reports', icon: AlertTriangle },
      ],
    },
    {
      title: 'System & Infra',
      items: [
        { href: '/admin/backups', label: 'Database & S3', icon: Database },
        { href: '/admin/developer/diagnostics', label: 'Diagnostics', icon: Activity },
        { href: '/admin/developer/seo', label: 'SEO & Feeds', icon: Sparkles },
        { href: '/admin/developer/ads', label: 'Ad Networks', icon: Radio },
        { href: '/admin/settings', label: 'Site Settings', icon: Settings },
      ],
    },
  ];

  return (
    <nav className={styles.navMenu}>
      {navSections.map((section) => (
        <div key={section.title} className={styles.navSection}>
          {!isCollapsed && (
            <div className={styles.navSectionTitle}>{section.title}</div>
          )}
          {section.items.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname
              ? pathname.startsWith(item.href)
              : false;

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
        </div>
      ))}
    </nav>
  );
}
