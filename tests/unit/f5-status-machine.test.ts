import { describe, it, expect } from 'vitest';

describe('F5 Approval Queue: Pure Status State Machine Matrix (AC-F5-03)', () => {
  const ALL_STATUSES = [
    'draft',
    'in_review',
    'approved',
    'held',
    'rejected',
    'scheduled',
    'publishing',
    'published',
    'failed',
  ] as const;

  type PostStatus = (typeof ALL_STATUSES)[number];

  // Authoritative allowed transitions from PRD Section 7.1
  const ALLOWED_TRANSITION_MAP: Record<PostStatus, readonly PostStatus[]> = {
    draft: ['in_review'],
    in_review: ['approved', 'held', 'rejected'],
    held: ['in_review'],
    approved: ['scheduled', 'in_review'],
    scheduled: ['publishing', 'approved'],
    publishing: ['published', 'failed'],
    failed: ['scheduled'],
    rejected: ['in_review'],
    published: [], // Terminal state
  };

  describe('AC-F5-03: Full 81-Combination Table Matrix Test (canTransition)', () => {
    for (const fromStatus of ALL_STATUSES) {
      for (const toStatus of ALL_STATUSES) {
        const isExpectedAllowed = ALLOWED_TRANSITION_MAP[fromStatus].includes(toStatus);

        it(`AC-F5-03: transition ${fromStatus} -> ${toStatus} is ${
          isExpectedAllowed ? 'ALLOWED (true)' : 'DISALLOWED (false)'
        }`, async () => {
          const { canTransition } = await import('@/lib/status-machine');

          const actualAllowed = canTransition(fromStatus, toStatus);
          expect(actualAllowed).toBe(isExpectedAllowed);
        });
      }
    }
  });

  describe('AC-F5-03: Mandatory Human Approval Protection Tests', () => {
    it('AC-F5-03: blocks direct transition from draft to published', async () => {
      const { canTransition } = await import('@/lib/status-machine');
      expect(canTransition('draft', 'published')).toBe(false);
    });

    it('AC-F5-03: blocks direct transition from in_review to published', async () => {
      const { canTransition } = await import('@/lib/status-machine');
      expect(canTransition('in_review', 'published')).toBe(false);
    });

    it('AC-F5-03: blocks direct transition from in_review to scheduled without approval', async () => {
      const { canTransition } = await import('@/lib/status-machine');
      expect(canTransition('in_review', 'scheduled')).toBe(false);
    });

    it('AC-F5-03: blocks transition from held to scheduled without review and approval', async () => {
      const { canTransition } = await import('@/lib/status-machine');
      expect(canTransition('held', 'scheduled')).toBe(false);
      expect(canTransition('held', 'published')).toBe(false);
    });

    it('AC-F5-03: blocks transition from rejected to scheduled or published', async () => {
      const { canTransition } = await import('@/lib/status-machine');
      expect(canTransition('rejected', 'scheduled')).toBe(false);
      expect(canTransition('rejected', 'published')).toBe(false);
    });

    it('AC-F5-03: ensures published is a terminal state with 0 outbound transitions', async () => {
      const { canTransition } = await import('@/lib/status-machine');

      for (const targetStatus of ALL_STATUSES) {
        expect(
          canTransition('published', targetStatus),
          `published -> ${targetStatus} must be disallowed`
        ).toBe(false);
      }
    });

    it('AC-F5-03: forbids identity transitions (same status to same status)', async () => {
      const { canTransition } = await import('@/lib/status-machine');

      for (const status of ALL_STATUSES) {
        expect(
          canTransition(status, status),
          `Identity transition ${status} -> ${status} must be false`
        ).toBe(false);
      }
    });
  });

  describe('AC-F5-03: validateTransition Error Throwing Behavior', () => {
    it('AC-F5-03: succeeds silently for allowed transition (e.g. in_review -> approved)', async () => {
      const { validateTransition } = await import('@/lib/status-machine');

      expect(() => validateTransition('in_review', 'approved')).not.toThrow();
      expect(() => validateTransition('approved', 'scheduled')).not.toThrow();
      expect(() => validateTransition('scheduled', 'publishing')).not.toThrow();
      expect(() => validateTransition('publishing', 'published')).not.toThrow();
    });

    it('AC-F5-03: throws Error with code INVALID_TRANSITION for disallowed transition', async () => {
      const { validateTransition } = await import('@/lib/status-machine');

      expect(() => validateTransition('in_review', 'published')).toThrowError();

      try {
        validateTransition('in_review', 'published');
      } catch (err: any) {
        expect(err.code).toBe('INVALID_TRANSITION');
        expect(err.message).toMatch(/cannot transition|invalid transition/i);
      }
    });

    it('AC-F5-03: handles unknown or invalid string inputs safely', async () => {
      const { canTransition, validateTransition } = await import('@/lib/status-machine');

      expect(canTransition('unknown_state' as any, 'approved')).toBe(false);
      expect(canTransition('in_review', 'unknown_state' as any)).toBe(false);

      expect(() => validateTransition('unknown_state' as any, 'approved')).toThrow();
    });
  });
});
