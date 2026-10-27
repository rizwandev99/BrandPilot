'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { IncomingEndpointCard, type IncomingEndpointData } from '@/components/webhooks/incoming-endpoint-card';
import { CurlExample } from '@/components/webhooks/curl-example';
import { OutgoingWebhooksList, type OutgoingWebhookItem } from '@/components/webhooks/outgoing-webhooks-list';
import { AddWebhookModal } from '@/components/webhooks/add-webhook-modal';
import { RefreshCw, Webhook } from 'lucide-react';

export default function WebhooksPage() {
  const [incomingEndpoint, setIncomingEndpoint] = React.useState<IncomingEndpointData | null>(null);
  const [outgoingWebhooks, setOutgoingWebhooks] = React.useState<OutgoingWebhookItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch incoming endpoint
      const incRes = await fetch('/api/hooks');
      if (!incRes.ok) throw new Error('Failed to load incoming webhook endpoint');
      const incJson = await incRes.json();
      setIncomingEndpoint(incJson.endpoint);

      // 2. Fetch outgoing webhooks
      const outRes = await fetch('/api/outgoing-webhooks');
      if (!outRes.ok) throw new Error('Failed to load outgoing webhooks');
      const outJson = await outRes.json();
      setOutgoingWebhooks(outJson.webhooks || []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj?.message || 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRotateSecret = async () => {
    if (!incomingEndpoint) return;
    try {
      const res = await fetch(`/api/hooks/${incomingEndpoint.id}/rotate-secret`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Secret rotation failed');
      const json = await res.json();
      setIncomingEndpoint((prev) =>
        prev
          ? {
              ...prev,
              secret: json.newSecret,
              secretMasked: json.newSecretMasked,
            }
          : null
      );
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Secret rotation error: ${errorObj?.message || 'Failed'}`);
    }
  };

  const handleSendTestEvent = async () => {
    if (!incomingEndpoint) return { ok: false, error: 'Endpoint not loaded' };
    const res = await fetch(`/api/hooks/${incomingEndpoint.id}/test`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error || 'Test delivery failed' };
    }
    return { ok: true, eventId: json.eventId };
  };

  const handleAddOutgoing = async (data: { url: string; secret?: string; active: boolean }) => {
    const res = await fetch('/api/outgoing-webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error?.message || json.error || 'Failed to create outgoing webhook');
    }
    await fetchData();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/outgoing-webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        setOutgoingWebhooks((prev) =>
          prev.map((h) => (h.id === id ? { ...h, active } : h))
        );
      }
    } catch (err) {
      console.error('Failed to toggle webhook active state:', err);
    }
  };

  const handleDeleteOutgoing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this outgoing webhook?')) return;
    try {
      const res = await fetch(`/api/outgoing-webhooks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setOutgoingWebhooks((prev) => prev.filter((h) => h.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete outgoing webhook:', err);
    }
  };

  const handleTestOutgoing = async (_id: string, url: string) => {
    try {
      // In sandbox mode or live, test delivery to destination URL
      const isSandbox = url.includes('/api/sandbox/receiver/');
      if (isSandbox) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'test.outgoing_ping',
            timestamp: Date.now(),
            source: 'BrandPilot Webhooks UI',
          }),
        });
        return { ok: res.ok, status: res.status };
      }

      // External webhook test
      const res = await fetch('/api/sandbox/receiver/test_ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, event: 'test.outgoing_ping' }),
      });
      return { ok: res.ok, status: res.status };
    } catch (err: unknown) {
      const errorObj = err as Error;
      return { ok: false, error: errorObj?.message || 'Delivery request failed' };
    }
  };

  return (
    <AppShell
      title="Webhooks"
      breadcrumbs={[{ label: 'Workspace', href: '/' }, { label: 'Webhooks' }]}
      currentPath="/webhooks"
      actions={
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-2 text-text transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-6 pb-12">
        {error && (
          <div className="p-3.5 text-xs rounded-xl bg-danger/10 border border-danger/30 text-danger flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchData}
              className="text-xs font-semibold underline ml-3"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !incomingEndpoint ? (
          <div className="flex items-center justify-center py-20 text-text-muted text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mr-2 text-accent" />
            Loading webhook configuration...
          </div>
        ) : (
          <>
            {incomingEndpoint && (
              <IncomingEndpointCard
                endpoint={incomingEndpoint}
                onRotateSecret={handleRotateSecret}
                onSendTestEvent={handleSendTestEvent}
              />
            )}

            {incomingEndpoint && (
              <CurlExample
                url={incomingEndpoint.url}
                secret={incomingEndpoint.secret}
              />
            )}

            <OutgoingWebhooksList
              webhooks={outgoingWebhooks}
              onAddClick={() => setIsAddModalOpen(true)}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteOutgoing}
              onTestDelivery={handleTestOutgoing}
            />

            <AddWebhookModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              onSubmit={handleAddOutgoing}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
