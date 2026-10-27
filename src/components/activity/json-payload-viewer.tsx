'use client';

import * as React from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Code } from 'lucide-react';

interface JsonPayloadViewerProps {
  payload: unknown;
  initiallyExpanded?: boolean;
}

export function JsonPayloadViewer({
  payload,
  initiallyExpanded = false,
}: JsonPayloadViewerProps) {
  const [expanded, setExpanded] = React.useState(initiallyExpanded);
  const [copied, setCopied] = React.useState(false);

  const formattedJson = React.useMemo(() => {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  }, [payload]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left bg-surface-2/60 hover:bg-surface-2 transition-colors text-xs"
      >
        <div className="flex items-center gap-2 text-text font-medium">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
          )}
          <Code className="h-3.5 w-3.5 text-accent" />
          <span>Payload Data</span>
          <span className="text-[11px] font-normal text-text-muted">
            ({typeof payload === 'object' && payload !== null ? Object.keys(payload).length : 0} keys)
          </span>
        </div>

        {expanded && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-surface text-[11px] font-medium text-text hover:bg-surface-2 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-success" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-text-muted" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        )}
      </button>

      {expanded && (
        <div className="p-3 bg-[#0d1117] text-[#c9d1d9] font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72">
          <pre>{formattedJson}</pre>
        </div>
      )}
    </div>
  );
}
