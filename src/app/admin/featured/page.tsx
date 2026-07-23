'use client';

import React, { useState, useEffect } from 'react';
import { Tv, Search, Plus, Trash2, ArrowUp, ArrowDown, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './featured.module.css';

interface Series {
  id: string;
  title: string;
  slug: string;
  poster_image_key: string;
  tags: string[];
  is_published: boolean;
}

export default function AdminFeaturedPage() {
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchFeaturedConfig();
  }, []);

  const fetchFeaturedConfig = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/featured');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load configuration');
      
      setAllSeries(data.series || []);
      setFeaturedIds(data.featured || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesIds: featuredIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration');
      
      setMessage({ type: 'success', text: 'Hero Carousel configuration saved successfully!' });
      // Fetch fresh data
      fetchFeaturedConfig();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = (id: string) => {
    if (!featuredIds.includes(id)) {
      setFeaturedIds([...featuredIds, id]);
    }
  };

  const handleRemove = (id: string) => {
    setFeaturedIds(featuredIds.filter((fid) => fid !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...featuredIds];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    setFeaturedIds(newList);
  };

  const handleMoveDown = (index: number) => {
    if (index === featuredIds.length - 1) return;
    const newList = [...featuredIds];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    setFeaturedIds(newList);
  };

  // Get active featured series details in order
  const featuredSeries = featuredIds
    .map((fid) => allSeries.find((s) => s.id === fid))
    .filter((s): s is Series => !!s);

  // Filter available series based on search query
  const filteredAvailable = allSeries.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      s.is_published // Only allow published series to be featured
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconBox}>
            <Tv size={24} />
          </div>
          <div>
            <h2>Featured Hero Carousel</h2>
            <p>Manage show titles highlighted in the Home page Hero slideshow and arrange their display order.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={styles.saveBtn}
        >
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {message && (
        <div className={`${styles.alert} ${message.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className={styles.loaderWrapper}>
          <div className={styles.loadingSpinner} />
        </div>
      ) : (
        <div className={styles.grid}>
          {/* Left Column: Catalog Selection */}
          <div className={`${styles.columnCard} glass`}>
            <div className={styles.cardHeader}>
              <h3>Select Show Titles</h3>
              <span className={styles.badgeCount}>{filteredAvailable.length} Published</span>
            </div>
            
            <div className={styles.searchRow}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search published series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.seriesList}>
              {filteredAvailable.length > 0 ? (
                filteredAvailable.map((s) => {
                  const isAdded = featuredIds.includes(s.id);
                  return (
                    <div key={s.id} className={styles.seriesRow}>
                      <div className={styles.seriesPoster}>
                        <img src={getR2Url(s.poster_image_key, 'poster')} alt={s.title} />
                      </div>
                      <div className={styles.seriesInfo}>
                        <span className={styles.seriesTitle}>{s.title}</span>
                        <span className={styles.seriesSlug}>/{s.slug}</span>
                      </div>
                      <button
                        onClick={() => handleAdd(s.id)}
                        disabled={isAdded}
                        className={`${styles.actionBtn} ${isAdded ? styles.addedBtn : styles.addBtn}`}
                      >
                        {isAdded ? (
                          <span>Featured</span>
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>No published series match search.</div>
              )}
            </div>
          </div>

          {/* Right Column: Featured Order & Display */}
          <div className={`${styles.columnCard} glass`}>
            <div className={styles.cardHeader}>
              <h3>Carousel Slideshow Order</h3>
              <span className={styles.badgeCount}>{featuredSeries.length} Active</span>
            </div>

            <div className={styles.seriesList}>
              {featuredSeries.length > 0 ? (
                featuredSeries.map((s, index) => (
                  <div key={s.id} className={`${styles.seriesRow} ${styles.featuredRow}`}>
                    <div className={styles.orderNumber}>{index + 1}</div>
                    <div className={styles.seriesPoster}>
                      <img src={getR2Url(s.poster_image_key, 'poster')} alt={s.title} />
                    </div>
                    <div className={styles.seriesInfo}>
                      <span className={styles.seriesTitle}>{s.title}</span>
                      <span className={styles.seriesSlug}>/{s.slug}</span>
                    </div>
                    
                    <div className={styles.orderActions}>
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className={styles.iconBtn}
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === featuredSeries.length - 1}
                        className={styles.iconBtn}
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => handleRemove(s.id)}
                        className={`${styles.iconBtn} ${styles.removeBtn}`}
                        title="Remove from Carousel"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  No series added to Hero Carousel. Select items from the catalog on the left to feature them.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
