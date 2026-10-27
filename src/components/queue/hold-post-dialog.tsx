'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, PauseCircle } from 'lucide-react';
import type { PostItem } from './edit-post-dialog';

export interface HoldPostDialogProps {
  post: PostItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (postId: string, reason?: string) => Promise<void>;
}

export function HoldPostDialog({
  post,
  open,
  onOpenChange,
  onConfirm,
}: HoldPostDialogProps) {
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  if (!post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm(post.id, reason.trim() || undefined);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          data-testid="hold-post-dialog"
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border border-border bg-surface p-6 shadow-2xl duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-warning/10 text-warning">
                <PauseCircle className="h-4 w-4" />
              </div>
              <Dialog.Title className="text-base font-semibold text-text">
                Hold Post
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

          <Dialog.Description className="text-xs text-text-muted mt-2 mb-4">
            Pausing this post will keep it in the queue without publishing. You can specify a reason for team visibility.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-text mb-1.5 block">
                Hold Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Waiting for legal review on trademark..."
                className="w-full text-sm rounded-md border border-border bg-surface-2 p-3 text-text placeholder:text-text-muted focus:border-warning focus:outline-none transition-colors"
              />
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3 py-2 rounded-md border border-border text-xs font-medium text-text hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-md bg-warning text-on-accent text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Holding...' : 'Hold Post'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
