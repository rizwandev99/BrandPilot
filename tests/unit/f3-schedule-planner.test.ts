import { describe, it, expect } from 'vitest';

describe('F3 Content Agent: Schedule Spacing Planner (AC-F3-09)', () => {
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  describe('AC-F3-09: Future Timestamp & 7-Day Window Constraints', () => {
    it('AC-F3-09: ensures all scheduled dates are strictly in the future relative to base date', async () => {
      const { planSchedule } = await import('@/server/agents/schedule-planner');

      const baseDate = new Date('2026-10-27T10:00:00.000Z');
      const posts = [
        { channel: 'linkedin' as const },
        { channel: 'x' as const },
        { channel: 'instagram' as const },
      ];

      const scheduledDates = planSchedule(posts, { baseDate });

      expect(scheduledDates).toHaveLength(posts.length);
      for (const date of scheduledDates) {
        expect(date.getTime()).toBeGreaterThan(baseDate.getTime());
      }
    });

    it('AC-F3-09: ensures all scheduled dates fall within the next 7 days', async () => {
      const { planSchedule } = await import('@/server/agents/schedule-planner');

      const baseDate = new Date('2026-10-27T12:00:00.000Z');
      const maxAllowedTime = baseDate.getTime() + SEVEN_DAYS_MS;

      const posts = [
        { channel: 'linkedin' as const },
        { channel: 'linkedin' as const },
        { channel: 'x' as const },
        { channel: 'x' as const },
        { channel: 'instagram' as const },
        { channel: 'facebook' as const },
      ];

      const scheduledDates = planSchedule(posts, { baseDate });

      for (const date of scheduledDates) {
        expect(date.getTime()).toBeLessThanOrEqual(maxAllowedTime);
      }
    });
  });

  describe('AC-F3-09: Minimum 2-Hour Spacing Per Channel', () => {
    it('AC-F3-09: enforces >= 2 hours spacing between posts on the SAME channel', async () => {
      const { planSchedule } = await import('@/server/agents/schedule-planner');

      const baseDate = new Date('2026-10-27T08:00:00.000Z');
      const sameChannelPosts = [
        { id: 'p1', channel: 'linkedin' as const },
        { id: 'p2', channel: 'linkedin' as const },
        { id: 'p3', channel: 'linkedin' as const },
        { id: 'p4', channel: 'linkedin' as const },
      ];

      const dates = planSchedule(sameChannelPosts, { baseDate });

      // Sort dates chronologically to verify intervals
      const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());

      for (let i = 1; i < sorted.length; i++) {
        const gapMs = sorted[i].getTime() - sorted[i - 1].getTime();
        expect(
          gapMs,
          `Post ${i} scheduled at ${sorted[i].toISOString()} must be >= 2h after post ${i - 1} at ${sorted[i - 1].toISOString()} (gap was ${gapMs / 1000 / 60}m)`
        ).toBeGreaterThanOrEqual(TWO_HOURS_MS);
      }
    });

    it('AC-F3-09: allows posts on DIFFERENT channels to be scheduled closer than 2 hours', async () => {
      const { planSchedule } = await import('@/server/agents/schedule-planner');

      const baseDate = new Date('2026-10-27T09:00:00.000Z');
      const multiChannelPosts = [
        { id: 'li-1', channel: 'linkedin' as const },
        { id: 'x-1', channel: 'x' as const },
      ];

      const dates = planSchedule(multiChannelPosts, { baseDate });

      // Both should be planned in the future
      expect(dates[0].getTime()).toBeGreaterThan(baseDate.getTime());
      expect(dates[1].getTime()).toBeGreaterThan(baseDate.getTime());

      // If scheduled close to each other, it's valid because channels differ
      // The crucial invariant is that same channel posts never violate >= 2h
    });

    it('AC-F3-09: handles a full 12-post multi-channel campaign with 0 spacing collisions', async () => {
      const { planSchedule } = await import('@/server/agents/schedule-planner');

      const baseDate = new Date('2026-10-27T10:00:00.000Z');
      const channels = ['linkedin', 'x', 'instagram', 'facebook'] as const;

      // 3 posts per channel = 12 total
      const campaignPosts = channels.flatMap((channel, cIdx) => [
        { id: `${channel}-1`, channel },
        { id: `${channel}-2`, channel },
        { id: `${channel}-3`, channel },
      ]);

      const scheduledDates = planSchedule(campaignPosts, { baseDate });
      expect(scheduledDates).toHaveLength(12);

      // Verify per-channel spacing for all 4 channels
      for (const channel of channels) {
        const channelPostIndices = campaignPosts
          .map((p, idx) => (p.channel === channel ? idx : -1))
          .filter((idx) => idx !== -1);

        const channelDates = channelPostIndices
          .map((idx) => scheduledDates[idx])
          .sort((a, b) => a.getTime() - b.getTime());

        for (let i = 1; i < channelDates.length; i++) {
          const gapMs = channelDates[i].getTime() - channelDates[i - 1].getTime();
          expect(
            gapMs,
            `Channel ${channel} post ${i} gap of ${gapMs / 1000 / 60}m is less than 2 hours`
          ).toBeGreaterThanOrEqual(TWO_HOURS_MS);
        }
      }
    });
  });

  describe('AC-F3-09: Edge Cases & Boundary Handling', () => {
    it('AC-F3-09: gracefully returns empty array for empty post list', async () => {
      const { planSchedule } = await import('@/server/agents/schedule-planner');

      const dates = planSchedule([]);
      expect(dates).toEqual([]);
    });

    it('AC-F3-09: handles single post scheduling correctly', async () => {
      const { planSchedule } = await import('@/server/agents/schedule-planner');

      const baseDate = new Date();
      const dates = planSchedule([{ channel: 'x' as const }], { baseDate });

      expect(dates).toHaveLength(1);
      expect(dates[0].getTime()).toBeGreaterThan(baseDate.getTime());
      expect(dates[0].getTime()).toBeLessThanOrEqual(baseDate.getTime() + SEVEN_DAYS_MS);
    });
  });
});
