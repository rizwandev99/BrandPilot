'use client';

import * as React from 'react';
import { X, Sparkles } from 'lucide-react';

interface AddWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { url: string; secret?: string; active: boolean }) => Promise<void>;
}

export function AddWebhookModal({ isOpen, onClose, onSubmit }: AddWebhookModalProps) {
  const [url, setUrl] = React.useState('');
  const [secret, setSecret] = React.useState('');
  const [active, setActive] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseSandbox = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    setUrl(`${origin}/api/sandbox/receiver/demo`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Destination URL is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({ url: url.trim(), secret: secret.trim() || undefined, active });
      setUrl('');
      setSecret('');
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj?.message || 'Failed to create webhook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Add Outgoing Webhook</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-lg bg-danger/10 border border-danger/30 text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-muted">Destination URL</label>
              <button
                type="button"
                onClick={handleUseSandbox}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                <span>Use Sandbox Receiver</span>
              </button>
            </div>
            <input
              type="url"
              required
              placeholder="https://your-service.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface-2 text-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              Signing Secret <span className="text-text-muted/60">(optional, auto-generated if blank)</span>
            </label>
            <input
              type="text"
              placeholder="whsec_..."
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface-2 text-text font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-border text-accent focus:ring-accent"
            />
            <label htmlFor="active" className="text-xs text-text select-none">
              Enabled (send events immediately)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-2 text-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-accent text-on-accent hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
