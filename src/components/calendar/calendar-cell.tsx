'use client';

import * as React from 'react';
import { clsx } from 'clsx';
import type { PostItem } from '../queue/edit-post-dialog';
import { getStatusBadge, getChannelColor } from '../queue/post-card';

export interface CalendarCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: PostItem[];
  onSelectPost: (post: PostItem) => void;
}

export function CalendarCell({
  date,
  isCurrentMonth,
  isToday,
  posts,
  onSelectPost,
}: CalendarCellProps) {
  const dayNumber = date.getDate();

  return (
    <div
      data-testid={`calendar-cell-${date.toISOString().slice(0, 10)}`}
      className={clsx(
        'min-h-[110px] sm:min-h-[130px] border-b border-r border-border p-1.5 sm:p-2 flex flex-col justify-between transition-colors',
        isCurrentMonth ? 'bg-surface' : 'bg-surface-2/40 text-text-faint',
        isToday && 'ring-1 ring-inset ring-accent bg-accent/[0.02]'
      )}
    >
      {/* Date Header */}
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
            isToday
              ? 'bg-accent text-on-accent font-semibold'
              : isCurrentMonth
              ? 'text-text'
              : 'text-text-muted/60'
          )}
        >
          {dayNumber}
        </span>

        {posts.length > 0 && (
          <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface-2">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </span>
        )}
      </div>

      {/* Posts List for this day */}
      <div className="mt-1 space-y-1 flex-1 overflow-y-auto max-h-[85px] scrollbar-thin">
        {posts.map((post) => {
          const statusBadge = getStatusBadge(post.status);
          const channelColor = getChannelColor(post.channel);
          const timeFormatted = post.scheduledAt
            ? new Date(post.scheduledAt).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';

          return (
            <button
              key={post.id}
              type="button"
              onClick={() => onSelectPost(post)}
              title={`${post.channel.toUpperCase()} (${post.status}): ${post.caption}`}
              className="w-full text-left p-1 rounded border border-border bg-surface-2 hover:border-accent hover:bg-surface transition-all text-[11px] leading-tight flex items-center gap-1 group truncate"
            >
              <span
                className={clsx(
                  'h-1.5 w-1.5 rounded-full shrink-0',
                  post.status === 'published'
                    ? 'bg-success'
                    : post.status === 'scheduled'
                    ? 'bg-accent'
                    : post.status === 'approved'
                    ? 'bg-success/70'
                    : post.status === 'in_review'
                    ? 'bg-warning'
                    : 'bg-text-muted'
                )}
              />
              <span className="font-semibold uppercase text-[9px] tracking-wider text-text-muted">
                {post.channel.slice(0, 2)}
              </span>
              <span className="text-text truncate flex-1 font-normal">
                {post.creativeSpec?.headline || post.caption}
              </span>
              {timeFormatted && (
                <span className="text-[9px] text-text-faint font-mono shrink-0 hidden sm:inline">
                  {timeFormatted}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
