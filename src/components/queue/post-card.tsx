'use client';

import * as React from 'react';
import { clsx } from 'clsx';
import {
  CheckCircle,
  PauseCircle,
  XCircle,
  Edit2,
  Calendar,
  Layers,
  ExternalLink,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { PostItem } from './edit-post-dialog';
import { canTransition, type PostStatus } from '@/lib/status-machine';

export interface PostCardProps {
  post: PostItem;
  isSelected?: boolean;
  onSelect?: () => void;
  onApprove: (post: PostItem) => Promise<void>;
  onHold: (post: PostItem) => void;
  onReject: (post: PostItem) => Promise<void>;
  onEdit: (post: PostItem) => void;
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'in_review':
      return {
        label: 'In Review',
        className: 'bg-warning/10 text-warning border-warning/20',
      };
    case 'approved':
      return {
        label: 'Approved',
        className: 'bg-success/10 text-success border-success/20',
      };
    case 'held':
      return {
        label: 'Held',
        className: 'bg-warning/15 text-warning border-warning/30',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'bg-danger/10 text-danger border-danger/20',
      };
    case 'scheduled':
      return {
        label: 'Scheduled',
        className: 'bg-accent/15 text-accent border-accent/30',
      };
    case 'publishing':
      return {
        label: 'Publishing',
        className: 'bg-info/15 text-info border-info/30 animate-pulse',
      };
    case 'published':
      return {
        label: 'Published',
        className: 'bg-success/15 text-success border-success/30 font-medium',
      };
    case 'failed':
      return {
        label: 'Failed',
        className: 'bg-danger/15 text-danger border-danger/30 font-semibold',
      };
    case 'draft':
    default:
      return {
        label: 'Draft',
        className: 'bg-surface-2 text-text-muted border-border',
      };
  }
}

export function getChannelColor(channel: string) {
  switch (channel?.toLowerCase()) {
    case 'linkedin':
      return 'text-[#0A66C2] bg-[#0A66C2]/10 border-[#0A66C2]/20';
    case 'x':
    case 'twitter':
      return 'text-text bg-surface-2 border-border';
    case 'instagram':
      return 'text-[#E1306C] bg-[#E1306C]/10 border-[#E1306C]/20';
    case 'facebook':
      return 'text-[#1877F2] bg-[#1877F2]/10 border-[#1877F2]/20';
    default:
      return 'text-text-muted bg-surface-2 border-border';
  }
}

export function PostCard({
  post,
  isSelected,
  onSelect,
  onApprove,
  onHold,
  onReject,
  onEdit,
}: PostCardProps) {
  const [imageError, setImageError] = React.useState(false);
  const statusBadge = getStatusBadge(post.status);
  const channelBadgeColor = getChannelColor(post.channel);

  const canApprove = canTransition(post.status, 'approved');
  const canHold = canTransition(post.status, 'held');
  const canReject = canTransition(post.status, 'rejected');

  const scheduledDateFormatted = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      data-testid={`post-card-${post.id}`}
      tabIndex={0}
      onClick={onSelect}
      onFocus={onSelect}
      className={clsx(
        'group relative rounded-lg border bg-surface p-4 transition-all duration-150 cursor-pointer outline-none',
        isSelected
          ? 'border-accent shadow-md ring-2 ring-accent/30'
          : 'border-border hover:border-text-faint/40 hover:shadow-sm'
      )}
    >
      {/* Top Header: Channel, Version, Status */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border',
              channelBadgeColor
            )}
          >
            {post.channel}
          </span>
          <span className="text-xs text-text-muted font-mono font-medium">
            v{post.version}
          </span>
          {scheduledDateFormatted && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded">
              <Calendar className="h-3 w-3" />
              {scheduledDateFormatted}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'px-2 py-0.5 rounded text-xs border font-medium uppercase tracking-wide',
              statusBadge.className
            )}
          >
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Caption & Hashtags Column (2 cols) */}
        <div className="md:col-span-2 space-y-2">
          <p className="text-sm text-text whitespace-pre-wrap leading-relaxed line-clamp-4">
            {post.caption}
          </p>

          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {post.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-accent bg-accent-soft px-1.5 py-0.5 rounded font-medium"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}

          {post.holdReason && (
            <div className="mt-2 p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Hold Note:</span> {post.holdReason}
              </div>
            </div>
          )}
        </div>

        {/* Branded Card Preview Column (1 col) */}
        <div className="rounded-md border border-border bg-surface-2 p-3 flex flex-col justify-between text-xs overflow-hidden relative min-h-[90px]">
          {post.creativeSpec?.headline ? (
            <div>
              <div className="text-[10px] text-text-muted uppercase font-semibold tracking-wider flex items-center gap-1 mb-1">
                <Sparkles className="h-3 w-3 text-accent" />
                Creative Card ({post.creativeSpec.templateId || 'minimal'})
              </div>
              <div className="font-semibold text-text line-clamp-2 text-xs">
                {post.creativeSpec.headline}
              </div>
              {post.creativeSpec.subline && (
                <div className="text-text-muted line-clamp-1 mt-0.5 text-[11px]">
                  {post.creativeSpec.subline}
                </div>
              )}
            </div>
          ) : (
            <div className="text-text-muted italic flex items-center justify-center h-full">
              No creative card
            </div>
          )}

          {/* Color swatches preview */}
          {post.creativeSpec?.colors && (
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
              {Object.entries(post.creativeSpec.colors)
                .slice(0, 4)
                .map(([name, hex]) => (
                  <div
                    key={name}
                    title={`${name}: ${hex}`}
                    className="h-3 w-3 rounded-full border border-border shadow-xs"
                    style={{ backgroundColor: hex }}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls & Quick Actions */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>{post.caption.length} chars</span>
          {scheduledDateFormatted && (
            <span className="sm:hidden flex items-center gap-1">
              • <Clock className="h-3 w-3" /> {scheduledDateFormatted}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onEdit(post)}
            title="Edit post (E)"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-xs text-text hover:bg-surface-2 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {canHold && (
            <button
              type="button"
              onClick={() => onHold(post)}
              title="Hold post (H)"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-xs text-warning hover:bg-warning/10 transition-colors"
            >
              <PauseCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hold</span>
            </button>
          )}

          {canReject && (
            <button
              type="button"
              onClick={() => onReject(post)}
              title="Reject post"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-xs text-danger hover:bg-danger/10 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reject</span>
            </button>
          )}

          {canApprove && (
            <button
              type="button"
              onClick={() => onApprove(post)}
              title="Approve post (A)"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-success text-on-accent text-xs font-medium hover:opacity-90 shadow-xs transition-opacity"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Approve</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
