'use client';

import * as React from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  CheckCheck,
  CalendarCheck,
  Search,
  Filter,
  HelpCircle,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { PostCard } from './post-card';
import { EditPostDialog, type PostItem } from './edit-post-dialog';
import { HoldPostDialog } from './hold-post-dialog';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';

export interface QueueTableProps {
  initialPosts?: PostItem[];
}

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'in_review', label: 'In Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'held', label: 'Held' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
  { id: 'rejected', label: 'Rejected' },
] as const;

const CHANNELS = [
  { id: 'all', label: 'All Channels' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X (Twitter)' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
] as const;

export function QueueTable({ initialPosts = [] }: QueueTableProps) {
  const [posts, setPosts] = React.useState<PostItem[]>(initialPosts);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>('in_review');
  const [selectedChannel, setSelectedChannel] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);

  // Dialogs state
  const [editingPost, setEditingPost] = React.useState<PostItem | null>(null);
  const [holdingPost, setHoldingPost] = React.useState<PostItem | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  // Bulk actions status
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null);

  // Fetch posts from API
  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Failed to load posts');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.posts || [];
      setPosts(list);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error loading posts');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialPosts.length === 0) {
      fetchPosts();
    }
  }, [fetchPosts, initialPosts.length]);

  // Filtered post items
  const filteredPosts = React.useMemo(() => {
    return posts.filter((post) => {
      // Tab status filter
      if (activeTab !== 'all' && post.status !== activeTab) {
        return false;
      }
      // Channel filter
      if (selectedChannel !== 'all' && post.channel.toLowerCase() !== selectedChannel.toLowerCase()) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const captionMatch = post.caption?.toLowerCase().includes(q);
        const headlineMatch = post.creativeSpec?.headline?.toLowerCase().includes(q);
        const tagMatch = post.hashtags?.some((h) => h.toLowerCase().includes(q));
        if (!captionMatch && !headlineMatch && !tagMatch) return false;
      }
      return true;
    });
  }, [posts, activeTab, selectedChannel, searchQuery]);

  // Counts
  const inReviewCount = React.useMemo(
    () => posts.filter((p) => p.status === 'in_review').length,
    [posts]
  );
  const approvedCount = React.useMemo(
    () => posts.filter((p) => p.status === 'approved').length,
    [posts]
  );

  // Optimistic transition helper with rollback (AC-F5-10)
  const executeOptimisticTransition = React.useCallback(
    async (
      postId: string,
      targetStatus: string,
      payload?: { reason?: string }
    ) => {
      // 1. Snapshot previous state
      const previousPosts = [...posts];
      const targetPost = posts.find((p) => p.id === postId);
      if (!targetPost) return;

      // 2. Apply optimistic local update
      const now = new Date();
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          return {
            ...p,
            status: targetStatus,
            approvedAt: targetStatus === 'approved' ? now : p.approvedAt,
            holdReason: targetStatus === 'held' ? payload?.reason ?? null : p.holdReason,
            updatedAt: now,
          };
        })
      );
      setErrorMessage(null);

      // 3. Perform network call
      try {
        const res = await fetch(`/api/posts/${postId}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: targetStatus, reason: payload?.reason }),
        });

        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(
            errorJson.error?.message ||
              errorJson.error ||
              `Failed to transition post to ${targetStatus}`
          );
        }

        const serverPost = await res.json();
        // Synchronize with server record
        setPosts((prev) => prev.map((p) => (p.id === postId ? serverPost : p)));
      } catch (err: unknown) {
        // 4. Rollback on failure
        setPosts(previousPosts);
        const msg = err instanceof Error ? err.message : 'Transition failed';
        setErrorMessage(`Action failed: ${msg}. Changes rolled back.`);
      }
    },
    [posts]
  );

  const handleApprove = React.useCallback(
    async (post: PostItem) => {
      await executeOptimisticTransition(post.id, 'approved');
    },
    [executeOptimisticTransition]
  );

  const handleReject = async (post: PostItem) => {
    await executeOptimisticTransition(post.id, 'rejected');
  };

  const handleConfirmHold = async (postId: string, reason?: string) => {
    await executeOptimisticTransition(postId, 'held', { reason });
  };

  // Bulk Approve All In Review (AC-F5-06)
  const handleBulkApprove = async () => {
    if (inReviewCount === 0) return;
    setBulkLoading(true);
    setErrorMessage(null);
    setSuccessBanner(null);

    // Optimistic bulk update
    const previousPosts = [...posts];
    const now = new Date();
    setPosts((prev) =>
      prev.map((p) => (p.status === 'in_review' ? { ...p, status: 'approved', approvedAt: now } : p))
    );

    try {
      const res = await fetch('/api/posts/bulk-approve', { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Bulk approve failed');
      }
      const data = await res.json();
      setSuccessBanner(`Successfully approved ${data.approvedCount ?? inReviewCount} posts.`);
      // Refresh list
      fetchPosts();
    } catch (err: unknown) {
      setPosts(previousPosts);
      setErrorMessage(err instanceof Error ? err.message : 'Bulk approval failed. Rolled back.');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk Schedule Approved (AC-F5-06)
  const handleScheduleApproved = async () => {
    if (approvedCount === 0) return;
    setBulkLoading(true);
    setErrorMessage(null);
    setSuccessBanner(null);

    try {
      const res = await fetch('/api/posts/schedule-approved', { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to schedule approved posts');
      }
      const data = await res.json();
      const count = data.scheduledCount ?? 0;
      const skippedCount = data.skippedCount ?? 0;
      let msg = `Scheduled ${count} approved posts.`;
      if (skippedCount > 0) {
        msg += ` (${skippedCount} posts skipped: no active connector)`;
      }
      setSuccessBanner(msg);
      fetchPosts();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to schedule approved posts');
    } finally {
      setBulkLoading(false);
    }
  };

  // Post saved callback
  const handlePostSaved = (updatedPost: PostItem) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    setSuccessBanner(`Post updated (v${updatedPost.version}).`);
  };

  // AC-F5-08: Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts if user is typing in form controls
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      // ? key -> Open shortcuts dialog
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      if (filteredPosts.length === 0) return;

      // ArrowUp or K -> Previous
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredPosts.length - 1));
        return;
      }

      // ArrowDown or J -> Next
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredPosts.length - 1 ? prev + 1 : 0));
        return;
      }

      const currentSelectedPost = filteredPosts[selectedIndex];
      if (!currentSelectedPost) return;

      // A -> Approve
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (currentSelectedPost.status === 'in_review') {
          handleApprove(currentSelectedPost);
        }
        return;
      }

      // H -> Hold
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setHoldingPost(currentSelectedPost);
        return;
      }

      // E -> Edit
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setEditingPost(currentSelectedPost);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredPosts, selectedIndex, handleApprove]);

  return (
    <div data-testid="queue-view" className="space-y-6">
      {/* Top Controls: Search, Channel Selector, Actions, Shortcuts */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter queue by caption or hashtag..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-md border border-border bg-surface text-text placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-md border border-border bg-surface text-text focus:border-accent focus:outline-none transition-colors"
          >
            {CHANNELS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPosts}
            disabled={loading}
            title="Refresh queue"
            className="p-2 rounded-md border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>

          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border border-border text-xs text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Shortcuts</span>
            <kbd className="hidden lg:inline font-mono text-[10px] bg-surface-2 px-1 rounded border border-border">?</kbd>
          </button>

          {inReviewCount > 0 && (
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              data-testid="bulk-approve-button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-success text-on-accent text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xs"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Approve all in review ({inReviewCount})</span>
            </button>
          )}

          {approvedCount > 0 && (
            <button
              type="button"
              onClick={handleScheduleApproved}
              disabled={bulkLoading}
              data-testid="schedule-approved-button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-xs"
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Schedule approved ({approvedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Error & Success Feedback Banners */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-danger/10 border border-danger/20 text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successBanner && (
        <div className="flex items-center justify-between p-3 rounded-md bg-success/10 border border-success/20 text-xs text-success">
          <span>{successBanner}</span>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-xs hover:underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-1 text-xs">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.id === 'all'
              ? posts.length
              : posts.filter((p) => p.status === tab.id).length;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedIndex(0);
              }}
              className={clsx(
                'px-3 py-2 rounded-t-md font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5',
                activeTab === tab.id
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-text-muted hover:text-text hover:bg-surface-2'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={clsx(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                  activeTab === tab.id ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-text-muted'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Post List */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-3">
          {filteredPosts.map((post, idx) => (
            <PostCard
              key={post.id}
              post={post}
              isSelected={idx === selectedIndex}
              onSelect={() => setSelectedIndex(idx)}
              onApprove={handleApprove}
              onHold={(p) => setHoldingPost(p)}
              onReject={handleReject}
              onEdit={(p) => setEditingPost(p)}
            />
          ))}
        </div>
      ) : (
        /* Empty State (AC-F5-09) */
        <div
          data-testid="queue-empty-state"
          className="rounded-lg border border-dashed border-border bg-surface p-12 text-center flex flex-col items-center justify-center space-y-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-text-muted">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-text">No posts in queue</h3>
          <p className="text-xs text-text-muted max-w-sm">
            {posts.length === 0
              ? 'Run the autonomous content agent to generate brand ideas, channel captions, and branded image cards.'
              : 'No posts match your current filter criteria.'}
          </p>
          <div className="pt-2">
            <Link
              href="/agent"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover transition-colors shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Run the agent</span>
            </Link>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <EditPostDialog
        post={editingPost}
        open={Boolean(editingPost)}
        onOpenChange={(open) => !open && setEditingPost(null)}
        onSaved={handlePostSaved}
      />

      <HoldPostDialog
        post={holdingPost}
        open={Boolean(holdingPost)}
        onOpenChange={(open) => !open && setHoldingPost(null)}
        onConfirm={handleConfirmHold}
      />

      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}
