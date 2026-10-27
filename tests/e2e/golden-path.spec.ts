import { test, expect } from '@playwright/test';

test.describe('BrandPilot E2E: Golden Path & System Workflows', () => {
  test('E2E Golden Path: System Health & Offline Demo Architecture (AC-F10-02)', async ({ request }) => {
    // 1. Health check endpoint responds with valid envelope (AC-F0-03)
    const healthRes = await request.get('/api/health');
    expect([200, 503]).toContain(healthRes.status());
    const healthJson = await healthRes.json();
    expect(healthJson.ok !== undefined || healthJson.db !== undefined).toBe(true);

    // 2. Home page renders successfully with offline demo stepper (AC-F10-01, AC-F10-02)
    const homeRes = await request.get('/');
    expect(homeRes.status()).toBe(200);
    const homeHtml = await homeRes.text();
    expect(homeHtml).toContain('BrandPilot');

    // 3. Workspace pages render with App Shell (AC-F0-06)
    const agentRes = await request.get('/agent');
    expect(agentRes.status()).toBe(200);

    const activityRes = await request.get('/activity');
    expect(activityRes.status()).toBe(200);

    const connectorsRes = await request.get('/connectors');
    expect(connectorsRes.status()).toBe(200);

    const queueRes = await request.get('/queue');
    expect(queueRes.status()).toBe(200);

    const calendarRes = await request.get('/calendar');
    expect(calendarRes.status()).toBe(200);

    const automationsRes = await request.get('/automations');
    expect(automationsRes.status()).toBe(200);

    const webhooksRes = await request.get('/webhooks');
    expect(webhooksRes.status()).toBe(200);
  });
});
