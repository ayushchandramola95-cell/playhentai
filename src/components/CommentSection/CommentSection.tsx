'use client';

import React, { useState, useEffect } from 'react';
import { Send, Trash2, MessageSquare, AlertCircle, RotateCw, Image as ImageIcon, ChevronDown, Smile } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './CommentSection.module.css';

interface Comment {
  id: string;
  episode_id: string;
  profile_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string | null;
    role: string;
  };
  likes?: number;
  gif_url?: string | null;
}

interface CommentSectionProps {
  episodeId: string;
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
];

const PRESET_GIFS = [
  { label: '🔥 Hype', url: 'https://media.giphy.com/media/3o7TKsjN42gScuzs9a/giphy.gif' },
  { label: '😮 Shock', url: 'https://media.giphy.com/media/51uZ7322F26zN362iO/giphy.gif' },
  { label: '❤️ Blush', url: 'https://media.giphy.com/media/l41K3tokK36s4wOcg/giphy.gif' },
  { label: '😂 Laugh', url: 'https://media.giphy.com/media/10t57cXgowAY5w/giphy.gif' },
  { label: '👍 Wow', url: 'https://media.giphy.com/media/26ufD3JmR0s1h3S6s/giphy.gif' }
];

export default function CommentSection({ episodeId }: CommentSectionProps) {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [customGifInput, setCustomGifInput] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  
  // Emotes tracking per comment
  const [commentReactions, setCommentReactions] = useState<{ [commentId: string]: { [emote: string]: number } }>({});
  const [userActiveEmotes, setUserActiveEmotes] = useState<{ [commentId: string]: Set<string> }>({});

  useEffect(() => {
    fetchComments();
  }, [episodeId]);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments?episode_id=${episodeId}`);
      if (res.ok) {
        const data = await res.json();
        const list: Comment[] = data.comments || [];
        setComments(list);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedGif && !customGifInput.trim()) return;

    const finalGif = selectedGif || (customGifInput.trim() ? customGifInput.trim() : null);

    setPosting(true);
    setError(null);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: episodeId,
          content: content.trim() || (finalGif ? 'Sent a GIF' : ''),
          gif_url: finalGif
        })
      });

      const data = await res.json();
      if (!res.ok && data.error && !data.comment) throw new Error(data.error);

      const newCmt: Comment = data.comment || {
        id: `local-cmt-${Date.now()}`,
        episode_id: episodeId,
        profile_id: user?.id || 'guest',
        content: content.trim() || (finalGif ? 'Sent a GIF' : ''),
        created_at: new Date().toISOString(),
        gif_url: finalGif,
        profiles: {
          username: profile?.username || user?.email?.split('@')[0] || 'User',
          role: profile?.role || 'user'
        }
      };

      setComments(prev => [newCmt, ...prev]);
      setContent('');
      setSelectedGif(null);
      setCustomGifInput('');
      setShowGifPicker(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok && data.error) throw new Error(data.error);

      setComments(comments.filter(c => c.id !== commentId));
    } catch (err: any) {
      setComments(comments.filter(c => c.id !== commentId));
    }
  };

  const handleToggleEmote = (commentId: string, emote: string) => {
    setUserActiveEmotes(prev => {
      const currentSet = new Set(prev[commentId] || []);
      if (currentSet.has(emote)) {
        currentSet.delete(emote);
      } else {
        currentSet.add(emote);
      }
      return { ...prev, [commentId]: currentSet };
    });

    setCommentReactions(prev => {
      const cmtEmotes = { ...(prev[commentId] || {}) };
      const hasEmote = userActiveEmotes[commentId]?.has(emote);
      cmtEmotes[emote] = (cmtEmotes[emote] || Math.floor(Math.random() * 4 + 1)) + (hasEmote ? -1 : 1);
      return { ...prev, [commentId]: cmtEmotes };
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);

      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)}d ago`;

      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'Recently';
    }
  };

  const getAvatarGradient = (username: string) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[idx];
  };

  const getAvatarChar = (c: Comment) => {
    const name = c.profiles?.username || 'Guest';
    return name.charAt(0).toUpperCase();
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const availableEmotes = ['❤️', '🔥', '😮', '😂', '👍'];

  return (
    <div className={styles.container}>
      {/* Header Toolbar (Title + Count + Sort + Refresh) */}
      <div className={styles.headerToolbar}>
        <div className={styles.titleRow}>
          <MessageSquare size={20} style={{ color: '#a855f7' }} />
          <h3>Discussion</h3>
          <span className={styles.commentsCount}>{comments.length}</span>
        </div>

        <div className={styles.controlsGroup}>
          <div className={styles.selectWrapper}>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className={styles.sortSelect}
              aria-label="Sort comments"
            >
              <option value="newest">newest</option>
              <option value="oldest">oldest</option>
            </select>
            <ChevronDown size={14} className={styles.selectArrow} />
          </div>

          <button 
            type="button"
            onClick={fetchComments} 
            className={styles.refreshBtn} 
            title="Refresh comments"
            disabled={loading}
          >
            <RotateCw size={15} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Write Comment Box */}
      {user ? (
        <form onSubmit={handlePost} className={styles.form}>
          <div className={styles.textareaWrapper}>
            <textarea
              maxLength={500}
              className={styles.textarea}
              placeholder="Share your thoughts about this episode... Add text or attach a GIF!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <span className={styles.charCount}>{content.length} / 500</span>
          </div>

          {/* Attached GIF Preview */}
          {(selectedGif || customGifInput.trim()) && (
            <div className={styles.gifPreviewBox}>
              <img src={selectedGif || customGifInput.trim()} alt="GIF Attachment" className={styles.attachedGifImage} />
              <button type="button" onClick={() => { setSelectedGif(null); setCustomGifInput(''); }} className={styles.removeGifBtn}>
                ✕ Remove GIF
              </button>
            </div>
          )}

          {/* GIF Picker Dropdown Toggle */}
          {showGifPicker && (
            <div className={`${styles.gifPickerContainer} glass`}>
              <span className={styles.pickerTitle}>Select an Anime Reaction GIF:</span>
              <div className={styles.presetGifGrid}>
                {PRESET_GIFS.map((g) => (
                  <button
                    key={g.url}
                    type="button"
                    onClick={() => { setSelectedGif(g.url); setShowGifPicker(false); }}
                    className={styles.presetGifBtn}
                  >
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>

              <div className={styles.customGifInputRow}>
                <input
                  type="url"
                  placeholder="Or paste custom GIF URL (https://...gif)"
                  value={customGifInput}
                  onChange={(e) => setCustomGifInput(e.target.value)}
                  className={styles.gifUrlInput}
                />
              </div>
            </div>
          )}

          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.formFooter}>
            <button
              type="button"
              onClick={() => setShowGifPicker(!showGifPicker)}
              className={`${styles.attachGifBtn} ${showGifPicker ? styles.activeAttachBtn : ''}`}
            >
              <ImageIcon size={15} />
              <span>GIF / Meme</span>
            </button>

            <button 
              type="submit" 
              disabled={posting || (!content.trim() && !selectedGif && !customGifInput.trim())} 
              className={styles.submitBtn}
            >
              {posting ? (
                <div className={styles.loadingSpinner} />
              ) : (
                <>
                  <span>Comment</span>
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className={`${styles.form} glass`} style={{ padding: '1.5rem', borderRadius: '14px', textAlign: 'center', marginBottom: '2rem' }}>
          <p className={styles.signInPrompt}>
            You must be <Link href={`/login?redirectTo=${encodeURIComponent(pathname)}`} className={styles.signInLink}>signed in</Link> to join the discussion.
          </p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div className={styles.loadingSpinner} style={{ border: '2px solid rgba(168, 85, 247, 0.3)', borderTopColor: '#a855f7', width: '26px', height: '26px', display: 'inline-block' }} />
        </div>
      ) : sortedComments.length > 0 ? (
        <div className={styles.commentList}>
          {sortedComments.map((c) => {
            const authorName = c.profiles?.username || 'User';
            const isAdmin = c.profiles?.role === 'admin';
            const canDelete = user && (c.profile_id === user.id || profile?.role === 'admin');

            return (
              <div key={c.id} className={`${styles.commentItem} glass`}>
                <div 
                  className={styles.avatar}
                  style={{ background: getAvatarGradient(authorName) }}
                >
                  {getAvatarChar(c)}
                </div>
                <div className={styles.commentBody}>
                  <div className={styles.metaRow}>
                    <span className={styles.username}>{authorName}</span>
                    {isAdmin && <span className={styles.adminBadge}>Admin</span>}
                    <span className={styles.date}>{formatRelativeTime(c.created_at)}</span>
                  </div>
                  
                  {c.content && <p className={styles.content}>{c.content}</p>}

                  {/* Inline GIF Attachment */}
                  {c.gif_url && (
                    <div className={styles.commentGifContainer}>
                      <img src={c.gif_url} alt="User Reaction GIF" className={styles.commentGifImage} />
                    </div>
                  )}

                  {/* Interactive Reaction Emotes Bar */}
                  <div className={styles.emotesBar}>
                    {availableEmotes.map((emote) => {
                      const isActive = userActiveEmotes[c.id]?.has(emote);
                      const baseCount = (commentReactions[c.id]?.[emote] !== undefined)
                        ? commentReactions[c.id][emote]
                        : 2;

                      return (
                        <button
                          key={emote}
                          type="button"
                          onClick={() => handleToggleEmote(c.id, emote)}
                          className={`${styles.emoteBtn} ${isActive ? styles.activeEmoteBtn : ''}`}
                        >
                          <span>{emote}</span>
                          <span className={styles.emoteCount}>{baseCount}</span>
                        </button>
                      );
                    })}

                    {canDelete && (
                      <button 
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className={styles.deleteBtn}
                        title="Delete Comment"
                        style={{ marginLeft: 'auto' }}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          No comments yet. Be the first to start the discussion!
        </div>
      )}
    </div>
  );
}
