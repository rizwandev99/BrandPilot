'use client';

import * as React from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CurlExampleProps {
  url: string;
  secret: string;
}

export function CurlExample({ url, secret }: CurlExampleProps) {
  const [copied, setCopied] = React.useState(false);

  const displaySecret = secret || 'YOUR_SIGNING_SECRET';
  const displayUrl = url || 'https://your-domain.com/api/hooks/in/YOUR_TOKEN';

  const curlSnippet = `# 1. Define secret, endpoint URL, timestamp, and payload
SECRET="${displaySecret}"
URL="${displayUrl}"
TIMESTAMP=$(date +%s)
BODY='{"event":"product.launched","event_id":"evt_'$(date +%s)'","data":{"title":"BrandPilot v1 Launch"}}'

# 2. Compute timing-safe HMAC-SHA256 signature over raw payload body
SIGNATURE="sha256=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

# 3. Post to endpoint with signature and timestamp headers
curl -X POST "$URL" \\
  -H "Content-Type: application/json" \\
  -H "X-PostPilot-Timestamp: $TIMESTAMP" \\
  -H "X-PostPilot-Signature: $SIGNATURE" \\
  -d "$BODY"`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(curlSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold text-text">cURL Signature Example</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-surface hover:bg-surface-2 text-text transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-text-muted" />
              <span>Copy snippet</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 bg-[#0d1117] text-[#c9d1d9] font-mono text-xs overflow-x-auto leading-relaxed">
        <pre>{curlSnippet}</pre>
      </div>
    </div>
  );
}
