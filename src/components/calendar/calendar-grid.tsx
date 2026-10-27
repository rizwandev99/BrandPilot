'use client';

import * as React from 'react';
import { clsx } from 'clsx';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
  Filter,
  Sparkles,
} from 'lucide-react';
import { CalendarCell } from './calendar-cell';
import { EditPostDialog, type PostItem } from '../queue/edit-post-dialog';

export interface CalendarGridProps {
  initialPosts?: PostItem[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function CalendarGrid({ initialPosts = [] }: CalendarGridProps) {
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());
  const [posts, setPosts] = React.useState<PostItem[]>(initialPosts);
  const [loading, setLoading] = React.useState(false);
  const [selectedChannel, setSelectedChannel] = React.useState<string>('all');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [activePost, setActivePost] = React.useState<PostItem | null>(null);

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Failed to load posts');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.posts || [];
      setPosts(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialPosts.length === 0) {
      fetchPosts();
    }
  }, [fetchPosts, initialPosts.length]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build grid calendar days
  const calendarDays = React.useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean }> = [];
    const today = new Date();
    const isSameDate = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    // 1. Fill trailing days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDate(date, today),
      });
    }

    // 2. Fill days of current month
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDate(date, today),
      });
    }

    // 3. Fill leading days from next month to make 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDate(date, today),
      });
    }

    return days;
  }, [year, month]);

  // Filter posts
  const filteredPosts = React.useMemo(() => {
    return posts.filter((p) => {
      if (selectedChannel !== 'all' && p.channel.toLowerCase() !== selectedChannel.toLowerCase()) {
        return false;
      }
      if (selectedStatus !== 'all' && p.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [posts, selectedChannel, selectedStatus]);

  // Group filtered posts by local date string YYYY-MM-DD
  const postsByDateString = React.useMemo(() => {
    const map = new Map<string, PostItem[]>();

    for (const post of filteredPosts) {
      const targetDate = post.scheduledAt
        ? new Date(post.scheduledAt)
        : new Date(post.createdAt);

      const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(post);
    }

    return map;
  }, [filteredPosts]);

  const monthName = currentDate.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const handlePostSaved = (updated: PostItem) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div data-testid="calendar-view" className="space-y-4">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-border">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous month"
              className="p-1.5 rounded-md border border-border text-text hover:bg-surface-2 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next month"
              className="p-1.5 rounded-md border border-border text-text hover:bg-surface-2 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-base font-semibold text-text ml-1 min-w-[160px]">
            {monthName}
          </h2>

          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-medium rounded-md border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Filters & Refresh */}
        <div className="flex items-center gap-2">
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface text-text focus:border-accent focus:outline-none transition-colors"
          >
            <option value="all">All Channels</option>
            <option value="linkedin">LinkedIn</option>
            <option value="x">X (Twitter)</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface text-text focus:border-accent focus:outline-none transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="held">Held</option>
          </select>

          <button
            type="button"
            onClick={fetchPosts}
            disabled={loading}
            title="Refresh calendar"
            className="p-1.5 rounded-md border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-xs">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-border bg-surface-2/60 text-center text-xs font-semibold text-text-muted py-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 border-l border-t border-border">
          {calendarDays.map(({ date, isCurrentMonth, isToday }) => {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const dayPosts = postsByDateString.get(key) || [];

            return (
              <CalendarCell
                key={key}
                date={date}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                posts={dayPosts}
                onSelectPost={(post) => setActivePost(post)}
              />
            );
          })}
        </div>
      </div>

      {/* Edit / Detail modal */}
      <EditPostDialog
        post={activePost}
        open={Boolean(activePost)}
        onOpenChange={(open) => !open && setActivePost(null)}
        onSaved={handlePostSaved}
      />
    </div>
  );
}
