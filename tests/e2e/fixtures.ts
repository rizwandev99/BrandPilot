import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ testWorkspaceId: string }>({
  testWorkspaceId: [
    async ({ request, context, baseURL }, use) => {
      const url = baseURL || 'http://localhost:3000';
      // Create a genuine isolated workspace in the running server
      const resetRes = await request.post(`${url}/api/workspace/reset`);
      let wsId: string;
      if (resetRes.ok()) {
        const body = (await resetRes.json()) as { workspaceId: string };
        wsId = body.workspaceId;
      } else {
        wsId = 'a1111111-1111-4111-8111-111111111111';
      }

      // Attach workspace cookie to browser context for seamless cross-page consistency
      await context.addCookies([
        {
          name: 'brandpilot_workspace_id',
          value: wsId,
          url,
        },
      ]);
      await use(wsId);
    },
    { auto: true },
  ],
});

export { expect };
