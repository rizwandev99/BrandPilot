export function sanitizeLogMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return '';
  }

  let sanitized = message;

  // Redact Google AI API Keys (AIzaSy...)
  sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]+/g, '[REDACTED]');

  // Redact passwords in connection URIs (e.g., postgres://user:pass@host)
  sanitized = sanitized.replace(
    /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi,
    '$1[REDACTED]$3'
  );

  // Redact Bearer tokens
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]');

  // Redact query parameter keys (e.g. ?key=xyz or &apiKey=xyz)
  sanitized = sanitized.replace(
    /([?&](?:api_?key|token|secret|password)=)[^&\s]+/gi,
    '$1[REDACTED]'
  );

  return sanitized;
}
