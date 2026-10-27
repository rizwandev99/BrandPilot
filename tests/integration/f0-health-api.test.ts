import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F0 Foundation: Health Check API (AC-F0-03)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('AC-F0-03: returns 200 with { ok: true, db: true } when DB is healthy', async () => {
    // Mock db to simulate healthy connectivity
    vi.doMock('@/server/db', () => ({
      db: {
        execute: vi.fn().mockResolvedValue([{ 1: 1 }]),
      },
    }));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        ok: true,
        db: true,
      })
    );
  });

  it('AC-F0-03: returns 503 with db: false when DB connection fails', async () => {
    // Mock db to simulate connection failure / timeout
    vi.doMock('@/server/db', () => ({
      db: {
        execute: vi.fn().mockRejectedValue(new Error('Connection timeout: database unreachable')),
      },
    }));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        ok: false,
        db: false,
      })
    );
  });

  it('AC-F0-03: does not leak sensitive database credentials in 503 error response', async () => {
    const sensitiveConnString = 'postgres://admin:super_secret_pw@ep-cool-db.us-east-2.aws.neon.tech/main';
    vi.doMock('@/server/db', () => ({
      db: {
        execute: vi.fn().mockRejectedValue(new Error(`Failed to connect to ${sensitiveConnString}`)),
      },
    }));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain('super_secret_pw');
    expect(text).not.toContain('postgres://');
  });
});
