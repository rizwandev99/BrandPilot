'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import type { RuleAction, SocialChannel } from '@/lib/automations/types';

interface ActionRowProps {
  action: RuleAction;
  index: number;
  onChange: (updated: RuleAction) => void;
  onRemove: () => void;
}

const CHANNELS: { label: string; value: SocialChannel }[] = [
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'X (Twitter)', value: 'x' },
  { label: 'Facebook', value: 'facebook' },
];

export function ActionRow({ action, index, onChange, onRemove }: ActionRowProps) {
  const isCreateDraft = action.type === 'create_ai_draft';
  const isHoldPost = action.type === 'hold_post';
  const isSetStatus = action.type === 'set_post_status';
  const isSendWebhook = action.type === 'send_webhook';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg border border-border bg-surface-2/60 text-xs text-text transition-colors">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono text-text-faint px-1.5 py-0.5 rounded bg-surface border border-border">
          #{index + 1}
        </span>
        <select
          value={action.type}
          onChange={(e) => {
            const nextType = e.target.value;
            if (nextType === 'create_ai_draft') {
              onChange({ type: 'create_ai_draft', channel: 'linkedin' });
            } else if (nextType === 'hold_post') {
              onChange({ type: 'hold_post', reason: 'Flagged by automation rule' });
            } else if (nextType === 'set_post_status') {
              onChange({ type: 'set_post_status', status: 'approved' });
            } else if (nextType === 'send_webhook') {
              onChange({ type: 'send_webhook', webhookUrl: '' });
            } else {
              onChange({ type: nextType });
            }
          }}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="create_ai_draft">Create AI Draft</option>
          <option value="hold_post">Hold Post</option>
          <option value="set_post_status">Set Post Status</option>
          <option value="send_webhook">Send Webhook</option>
        </select>
      </div>

      <div className="flex-1 w-full">
        {isCreateDraft && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-[11px] shrink-0">Target Channel:</span>
            <select
              value={action.channel || 'linkedin'}
              onChange={(e) => onChange({ ...action, channel: e.target.value as SocialChannel })}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {CHANNELS.map((ch) => (
                <option key={ch.value} value={ch.value}>
                  {ch.label}
                </option>
              ))}
            </select>
            <span className="text-text-faint text-[11px] italic">(Draft will be created in &quot;In Review&quot;)</span>
          </div>
        )}

        {isHoldPost && (
          <input
            type="text"
            value={action.reason || ''}
            placeholder="Hold reason (e.g. Needs manual verification)"
            onChange={(e) => onChange({ ...action, reason: e.target.value })}
            className="w-full rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
          />
        )}

        {isSetStatus && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-[11px] shrink-0">New Status:</span>
            <select
              value={action.status || 'approved'}
              onChange={(e) => onChange({ ...action, status: e.target.value })}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="in_review">in_review</option>
              <option value="approved">approved</option>
              <option value="held">held</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
        )}

        {isSendWebhook && (
          <input
            type="url"
            value={action.webhookUrl || ''}
            placeholder="Destination Webhook URL (https://...)"
            onChange={(e) => onChange({ ...action, webhookUrl: e.target.value })}
            className="w-full rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
          />
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove action"
        className="p-1 rounded text-text-faint hover:text-danger hover:bg-surface transition-colors shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
