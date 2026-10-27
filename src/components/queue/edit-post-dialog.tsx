'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertCircle, Save, Calendar as CalendarIcon, Hash } from 'lucide-react';
import { CharCounter, isOverLimit } from './char-counter';

export interface PostItem {
  id: string;
  workspaceId: string;
  channel: string;
  caption: string;
  hashtags?: string[] | null;
  creativeSpec?: {
    headline: string;
    subline?: string;
    templateId: string;
    colors: Record<string, string>;
  } | null;
  status: string;
  scheduledAt?: string | Date | null;
  approvedAt?: string | Date | null;
  holdReason?: string | null;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface EditPostDialogProps {
  post: PostItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updatedPost: PostItem) => void;
}

export function EditPostDialog({
  post,
  open,
  onOpenChange,
  onSaved,
}: EditPostDialogProps) {
  const [caption, setCaption] = React.useState('');
  const [hashtagsStr, setHashtagsStr] = React.useState('');
  const [headline, setHeadline] = React.useState('');
  const [subline, setSubline] = React.useState('');
  const [scheduledAtStr, setScheduledAtStr] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (post) {
      setCaption(post.caption || '');
      setHashtagsStr((post.hashtags || []).join(', '));
      setHeadline(post.creativeSpec?.headline || '');
      setSubline(post.creativeSpec?.subline || '');
      if (post.scheduledAt) {
        const d = new Date(post.scheduledAt);
        // format for datetime-local input YYYY-MM-DDTHH:mm
        const pad = (n: number) => String(n).padStart(2, '0');
        const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setScheduledAtStr(localIso);
      } else {
        setScheduledAtStr('');
      }
      setError(null);
    }
  }, [post]);

  if (!post) return null;

  const isOverflow = isOverLimit(post.channel, caption);
  const willResetStatus = post.status === 'approved' || post.status === 'scheduled';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverflow) return;

    setSaving(true);
    setError(null);

    try {
      const parsedHashtags = hashtagsStr
        .split(',')
        .map((h) => h.trim().replace(/^#/, ''))
        .filter(Boolean);

      const creativeSpec = {
        headline,
        subline,
        templateId: post.creativeSpec?.templateId || 'minimal',
        colors: post.creativeSpec?.colors || {
          primary: '#5E6AD2',
          secondary: '#2EC486',
          background: '#FFFFFF',
          text: '#1B1B1F',
        },
      };

      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          hashtags: parsedHashtags,
          creativeSpec,
          scheduledAt: scheduledAtStr ? new Date(scheduledAtStr).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.error || 'Failed to save post changes');
      }

      const updated = await res.json();
      onSaved(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          data-testid="edit-post-dialog"
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-xl translate-x-[-50%] translate-y-[-50%] rounded-lg border border-border bg-surface p-6 shadow-2xl duration-200 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface-2 text-text border border-border">
                {post.channel}
              </span>
              <Dialog.Title className="text-base font-semibold text-text">
                Edit Post (v{post.version})
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {willResetStatus && (
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-md bg-warning/10 border border-warning/20 text-xs text-warning">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Re-approval Required:</strong> Saving changes will bump version to v{post.version + 1} and reset status from{' '}
                <span className="font-semibold uppercase">{post.status}</span> back to{' '}
                <span className="font-semibold uppercase">in_review</span>.
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 p-2.5 rounded-md bg-danger/10 border border-danger/20 text-xs text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text">Caption</label>
                <CharCounter channel={post.channel} count={caption.length} />
              </div>
              <textarea
                rows={5}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write post caption..."
                className="w-full text-sm rounded-md border border-border bg-surface-2 p-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-text flex items-center gap-1 mb-1.5">
                <Hash className="h-3.5 w-3.5 text-text-muted" />
                Hashtags (comma-separated)
              </label>
              <input
                type="text"
                value={hashtagsStr}
                onChange={(e) => setHashtagsStr(e.target.value)}
                placeholder="tech, marketing, ai"
                className="w-full text-sm rounded-md border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div>
                <label className="text-xs font-medium text-text mb-1 block">Image Card Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Card headline..."
                  className="w-full text-sm rounded-md border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text mb-1 block">Image Card Subline</label>
                <input
                  type="text"
                  value={subline}
                  onChange={(e) => setSubline(e.target.value)}
                  placeholder="Card subline..."
                  className="w-full text-sm rounded-md border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <label className="text-xs font-medium text-text flex items-center gap-1 mb-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-text-muted" />
                Scheduled Date & Time (Local)
              </label>
              <input
                type="datetime-local"
                value={scheduledAtStr}
                onChange={(e) => setScheduledAtStr(e.target.value)}
                className="w-full text-sm rounded-md border border-border bg-surface-2 px-3 py-2 text-text focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3 py-2 rounded-md border border-border text-xs font-medium text-text hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isOverflow || saving}
                data-testid="save-post-button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
