'use client';

import * as React from 'react';
import { Copy, Check, Eye, EyeOff, RefreshCw, Send, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export interface IncomingEndpointData {
  id: string;
  publicToken: string;
  url: string;
  secret: string;
  secretMasked: string;
  createdAt: string | Date;
}

interface IncomingEndpointCardProps {
  endpoint: IncomingEndpointData;
  onRotateSecret: () => Promise<void>;
  onSendTestEvent: () => Promise<{ ok: boolean; eventId?: string; error?: string }>;
}

export function IncomingEndpointCard({
  endpoint,
  onRotateSecret,
  onSendTestEvent,
}: IncomingEndpointCardProps) {
  const [showSecret, setShowSecret] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [copiedSecret, setCopiedSecret] = React.useState(false);
  const [rotating, setRotating] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; eventId?: string; error?: string } | null>(null);

  const copyToClipboard = async (text: string, type: 'url' | 'secret') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  const handleRotate = async () => {
    if (!confirm('Are you sure you want to rotate this secret? All requests signed with the previous secret will be rejected immediately.')) {
      return;
    }
    setRotating(true);
    try {
      await onRotateSecret();
    } finally {
      setRotating(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onSendTestEvent();
      setTestResult(res);
    } catch (err: unknown) {
      const error = err as Error;
      setTestResult({ ok: false, error: error?.message || 'Failed to trigger test' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text">Incoming Webhook Ingestion</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-soft text-accent">
              <ShieldCheck className="h-3 w-3" />
              HMAC-SHA256
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Publish events into BrandPilot with timing-safe HMAC authentication and 300s replay protection.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-on-accent hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0 shadow-sm"
        >
          <Send className={`h-3.5 w-3.5 ${testing ? 'animate-pulse' : ''}`} />
          <span>{testing ? 'Sending...' : 'Send test event'}</span>
        </button>
      </div>

      {testResult && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
            testResult.ok
              ? 'bg-success/10 border border-success/30 text-success'
              : 'bg-danger/10 border border-danger/30 text-danger'
          }`}
        >
          {testResult.ok ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Test event delivered successfully! Event ID: <code className="font-mono font-semibold">{testResult.eventId}</code></span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Test event delivery failed: {testResult.error}</span>
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Webhook Endpoint URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">Public Webhook URL</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 truncate font-mono text-xs px-3 py-2 rounded-lg border border-border bg-surface-2 text-text">
              {endpoint.url}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(endpoint.url, 'url')}
              aria-label="Copy URL"
              className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-2 text-text transition-colors"
            >
              {copiedUrl ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-text-muted" />}
            </button>
          </div>
        </div>

        {/* Signing Secret */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-muted">Signing Secret</label>
            <button
              type="button"
              onClick={handleRotate}
              disabled={rotating}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${rotating ? 'animate-spin' : ''}`} />
              <span>Rotate secret</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 truncate font-mono text-xs px-3 py-2 rounded-lg border border-border bg-surface-2 text-text">
              {showSecret ? endpoint.secret : endpoint.secretMasked}
            </div>
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              aria-label={showSecret ? 'Hide secret' : 'Reveal secret'}
              className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-2 text-text transition-colors"
            >
              {showSecret ? <EyeOff className="h-4 w-4 text-text-muted" /> : <Eye className="h-4 w-4 text-text-muted" />}
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(endpoint.secret, 'secret')}
              aria-label="Copy secret"
              className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-2 text-text transition-colors"
            >
              {copiedSecret ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-text-muted" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
