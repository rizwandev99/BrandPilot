import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F9 Automations: Pure Rule Engine, Path Resolution, Loop Protection & Action Validation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  const sampleEvent = {
    id: 'evt-100',
    type: 'webhook.received',
    source: 'incoming',
    depth: 0,
    payload: {
      eventName: 'product.launched',
      product: {
        id: 'prod-42',
        title: 'BrandPilot Enterprise Edition',
        pricing: {
          amount: 299,
          currency: 'USD',
        },
        tags: ['saas', 'enterprise', 'launch'],
        active: true,
      },
    },
  };

  describe('AC-F9-01: Deep Dot-Notation Path Resolution (getNestedProperty)', () => {
    it('AC-F9-01: retrieves top-level, nested, and deeply nested values using dot notation', async () => {
      const { getNestedProperty } = await import('@/lib/automations/path-resolver');

      expect(getNestedProperty(sampleEvent, 'type')).toBe('webhook.received');
      expect(getNestedProperty(sampleEvent, 'payload.eventName')).toBe('product.launched');
      expect(getNestedProperty(sampleEvent, 'payload.product.pricing.amount')).toBe(299);
      expect(getNestedProperty(sampleEvent, 'payload.product.active')).toBe(true);
    });

    it('AC-F9-01: safely returns undefined for non-existent paths without throwing runtime error', async () => {
      const { getNestedProperty } = await import('@/lib/automations/path-resolver');

      expect(getNestedProperty(sampleEvent, 'payload.non_existent')).toBeUndefined();
      expect(getNestedProperty(sampleEvent, 'payload.product.missing.deep.property')).toBeUndefined();
      expect(getNestedProperty(null, 'any.path')).toBeUndefined();
      expect(getNestedProperty(undefined, 'any.path')).toBeUndefined();
      expect(getNestedProperty({}, 'missing')).toBeUndefined();
    });
  });

  describe('AC-F9-01: Condition Operators Truth Table', () => {
    it('AC-F9-01: evaluates operator "eq" correctly across strings, numbers, and booleans', async () => {
      const { evaluateCondition } = await import('@/lib/automations/engine');

      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.eventName', operator: 'eq', value: 'product.launched' }, sampleEvent)).toBe(true);
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.eventName', operator: 'eq', value: 'other.event' }, sampleEvent)).toBe(false);
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.pricing.amount', operator: 'eq', value: 299 }, sampleEvent)).toBe(true);
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.active', operator: 'eq', value: true }, sampleEvent)).toBe(true);
    });

    it('AC-F9-01: evaluates operator "neq" correctly', async () => {
      const { evaluateCondition } = await import('@/lib/automations/engine');

      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.eventName', operator: 'neq', value: 'product.retired' }, sampleEvent)).toBe(true);
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.eventName', operator: 'neq', value: 'product.launched' }, sampleEvent)).toBe(false);
    });

    it('AC-F9-01: evaluates operator "contains" for substring (case-insensitive) and array inclusion', async () => {
      const { evaluateCondition } = await import('@/lib/automations/engine');

      // Substring match
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.title', operator: 'contains', value: 'BrandPilot' }, sampleEvent)).toBe(true);
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.title', operator: 'contains', value: 'brandpilot' }, sampleEvent)).toBe(true); // case-insensitive
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.title', operator: 'contains', value: 'NotFound' }, sampleEvent)).toBe(false);

      // Array inclusion
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.tags', operator: 'contains', value: 'enterprise' }, sampleEvent)).toBe(true);
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.tags', operator: 'contains', value: 'consumer' }, sampleEvent)).toBe(false);
    });

    it('AC-F9-01: evaluates operator "gt" and "lt" for numeric comparisons', async () => {
      const { evaluateCondition } = await import('@/lib/automations/engine');

      // gt
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.pricing.amount', operator: 'gt', value: 100 }, sampleEvent)).toBe(true);
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.pricing.amount', operator: 'gt', value: 500 }, sampleEvent)).toBe(false);

      // lt
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.pricing.amount', operator: 'lt', value: 500 }, sampleEvent)).toBe(true);
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.pricing.amount', operator: 'lt', value: 100 }, sampleEvent)).toBe(false);
    });

    it('AC-F9-01: evaluates operator "exists" for property presence', async () => {
      const { evaluateCondition } = await import('@/lib/automations/engine');

      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.pricing.amount', operator: 'exists' }, sampleEvent)).toBe(true);
      expect(evaluateCondition({ type: 'path_comparison', path: 'payload.product.nonExistentField', operator: 'exists' }, sampleEvent)).toBe(false);
    });

    it('AC-F9-01: enforces strict AND conjunction logic across multiple conditions', async () => {
      const { evaluateRule } = await import('@/lib/automations/engine');

      const automationWithMultipleConditions = {
        id: 'auto-1',
        trigger: { type: 'webhook.received' },
        conditions: [
          { type: 'path_comparison' as const, path: 'payload.eventName', operator: 'eq' as const, value: 'product.launched' },
          { type: 'path_comparison' as const, path: 'payload.product.pricing.amount', operator: 'gt' as const, value: 200 },
          { type: 'path_comparison' as const, path: 'payload.product.active', operator: 'eq' as const, value: true },
        ],
        actions: [{ type: 'create_ai_draft' as const, channel: 'linkedin' as const }],
      };

      // All 3 pass -> matches
      const matchResult = await evaluateRule(automationWithMultipleConditions, sampleEvent);
      expect(matchResult.matched).toBe(true);
      expect(matchResult.actionsToRun.length).toBe(1);

      // One condition fails -> rule fails (AND logic)
      const automationWithFailingRow = {
        ...automationWithMultipleConditions,
        conditions: [
          ...automationWithMultipleConditions.conditions,
          { type: 'path_comparison' as const, path: 'payload.product.pricing.amount', operator: 'lt' as const, value: 50 }, // Fails
        ],
      };

      const failResult = await evaluateRule(automationWithFailingRow, sampleEvent);
      expect(failResult.matched).toBe(false);
      expect(failResult.actionsToRun.length).toBe(0);
    });
  });

  describe('AC-F9-03: Recursion Loop Protection (Depth Limit 3)', () => {
    it('AC-F9-03: allows execution cascades for depths 0, 1, and 2', async () => {
      const { executeAutomationCascade } = await import('@/lib/automations/action-dispatcher');

      for (let depth = 0; depth <= 2; depth++) {
        const eventAtDepth = { ...sampleEvent, depth };
        const result = await executeAutomationCascade(eventAtDepth);
        expect(result.abortedDueToLoop, `Depth ${depth} must not trigger loop detection`).toBeFalsy();
      }
    });

    it('AC-F9-03: halts execution cascade when depth reaches or exceeds 3 with LOOP_DETECTED', async () => {
      const { executeAutomationCascade } = await import('@/lib/automations/action-dispatcher');

      const eventAtDepth3 = { ...sampleEvent, depth: 3 };
      const result = await executeAutomationCascade(eventAtDepth3);

      expect(result.abortedDueToLoop).toBe(true);
      expect(result.errorCode ?? result.reason).toMatch(/LOOP_DETECTED|max depth exceeded/i);

      // Depth 4 must also be blocked
      const eventAtDepth4 = { ...sampleEvent, depth: 4 };
      const result4 = await executeAutomationCascade(eventAtDepth4);
      expect(result4.abortedDueToLoop).toBe(true);
    });

    it('AC-F9-03: increments depth by 1 when an automation action triggers a child event', async () => {
      const { createChildEvent } = await import('@/lib/automations/action-dispatcher');

      const parentEvent = { id: 'evt-parent', depth: 1, type: 'post.approved', payload: {} };
      const childEvent = createChildEvent(parentEvent, 'set_post_status', { postId: 'p-2', status: 'approved' });

      expect(childEvent.depth).toBe(2);
    });
  });

  describe('AC-F9-04: Status Machine Validation in Actions', () => {
    it('AC-F9-04: permits legal post status transitions in automation actions', async () => {
      const { executeStatusAction } = await import('@/lib/automations/action-dispatcher');

      // in_review -> approved is legal
      const legalResult = await executeStatusAction({
        action: { type: 'set_post_status', status: 'approved' },
        currentPostStatus: 'in_review',
        postId: 'post-test-1',
      });

      expect(legalResult.success).toBe(true);
      expect(legalResult.newStatus).toBe('approved');
    });

    it('AC-F9-04: rejects illegal transitions (e.g. draft -> published), logs INVALID_TRANSITION, and does not force status', async () => {
      const { executeStatusAction } = await import('@/lib/automations/action-dispatcher');

      // draft -> published is illegal (requires human review and scheduling)
      const illegalResult = await executeStatusAction({
        action: { type: 'set_post_status', status: 'published' },
        currentPostStatus: 'draft',
        postId: 'post-test-2',
      });

      expect(illegalResult.success).toBe(false);
      expect(illegalResult.error).toMatch(/INVALID_TRANSITION/i);
      expect(illegalResult.newStatus).toBeUndefined();
    });

    it('AC-F9-04: hold_post action transitions approved or in_review post to "held"', async () => {
      const { executeStatusAction } = await import('@/lib/automations/action-dispatcher');

      const holdResult = await executeStatusAction({
        action: { type: 'hold_post', reason: 'Flagged by automated brand check' },
        currentPostStatus: 'in_review',
        postId: 'post-test-3',
      });

      expect(holdResult.success).toBe(true);
      expect(holdResult.newStatus).toBe('held');
    });
  });
});
