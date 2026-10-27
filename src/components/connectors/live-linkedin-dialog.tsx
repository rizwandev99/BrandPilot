'use client';

import * as React from 'react';
import { X, ShieldAlert, ExternalLink, Lock, Check, AlertTriangle, Loader2 } from 'lucide-react';

export interface LiveLinkedInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLive: () => Promise<{ authUrl?: string; error?: string }>;
}

export function LiveLinkedInDialog({
  isOpen,
  onClose,
  onConfirmLive,
}: LiveLinkedInDialogProps) {
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setAcknowledged(false);
      setConnecting(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Handle Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleConnect = async () => {
    if (!acknowledged) return;
    setConnecting(true);
    setErrorMessage(null);

    try {
      const result = await onConfirmLive();
      if (result.error) {
        setErrorMessage(result.error);
        setConnecting(false);
      } else if (result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setErrorMessage(errorObj?.message || 'Failed to initiate live LinkedIn connection');
      setConnecting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <span className="font-mono text-xs font-bold">[LI]</span>
            </div>
            <div>
              <h2 id="live-dialog-title" className="text-base font-semibold text-text">
                Connect Live LinkedIn Account
              </h2>
              <p className="text-xs text-text-muted">
                OAuth 2.0 Integration via LinkedIn Posts API
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">Live Mode Notice</p>
                <p className="mt-0.5">{errorMessage}</p>
                {errorMessage.includes('disabled') && (
                  <p className="mt-1 text-[11px] text-text-muted">
                    To enable live publishing, set <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">ENABLE_LIVE_LINKEDIN=true</code> in your environment along with LinkedIn client credentials.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 font-medium text-text">
              <Lock className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>Security & Scopes</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-text-muted">
              <li>
                Requests permission for <strong className="text-text">w_member_social</strong> to publish approved content on your personal profile.
              </li>
              <li>
                Tokens are secured with <strong className="text-text">AES-256-GCM encryption</strong> at rest and scoped strictly to your session.
              </li>
              <li>
                Zero automated publishing occurs without passing the strict human approval gate.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-text">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <span className="font-medium">Live Publishing Warning:</span> Any posts published through this connector in Live mode will be immediately publicly visible on your live LinkedIn feed.
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className="text-xs text-text select-none">
              I understand that posts scheduled or published through this live connector will be broadcast to my real LinkedIn network.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={connecting}
              className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!acknowledged || connecting}
              onClick={handleConnect}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0A66C2] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#004182] transition-colors disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Authorize with LinkedIn</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
