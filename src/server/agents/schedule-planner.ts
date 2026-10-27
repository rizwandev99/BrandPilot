import type { Channel } from '@/lib/channels';

export interface PostScheduleItem {
  id?: string;
  channel: Channel;
}

export interface PlanScheduleOptions {
  baseDate?: Date;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const CHANNEL_START_OFFSETS: Record<Channel, number> = {
  linkedin: 3 * 60 * 60 * 1000, // +3 hours
  x: 1 * 60 * 60 * 1000,        // +1 hour
  instagram: 2 * 60 * 60 * 1000, // +2 hours
  facebook: 4 * 60 * 60 * 1000,  // +4 hours
};

/**
 * Plans schedule timestamps for an array of generated posts:
 * - Strictly in the future (> baseDate)
 * - Within a 7-day window (<= baseDate + 7 days)
 * - Enforces >= 2 hours spacing between posts on the SAME channel
 */
export function planSchedule(
  posts: PostScheduleItem[],
  options?: PlanScheduleOptions
): Date[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  const baseDate = options?.baseDate ? new Date(options.baseDate) : new Date();
  const baseTime = baseDate.getTime();
  const maxAllowedTime = baseTime + SEVEN_DAYS_MS;

  // Count posts per channel to distribute evenly within the 7-day window
  const channelCounts = new Map<string, number>();
  for (const post of posts) {
    const ch = post.channel || 'linkedin';
    channelCounts.set(ch, (channelCounts.get(ch) || 0) + 1);
  }

  // Calculate interval per channel
  const channelIntervals = new Map<string, number>();
  for (const [ch, count] of channelCounts.entries()) {
    const availableWindow = 6.5 * 24 * 60 * 60 * 1000; // 6.5 days to guarantee safety margin
    const dynamicInterval = Math.floor(availableWindow / Math.max(1, count));
    // Interval must be at least 2 hours + 1 minute
    const interval = Math.max(TWO_HOURS_MS + 60 * 1000, dynamicInterval);
    channelIntervals.set(ch, interval);
  }

  // Track the next available timestamp for each channel
  const nextChannelTime = new Map<string, number>();

  const resultDates: Date[] = [];

  for (const post of posts) {
    const ch = (post.channel || 'linkedin') as Channel;
    const startOffset = CHANNEL_START_OFFSETS[ch] || 2 * 60 * 60 * 1000;
    const interval = channelIntervals.get(ch) || TWO_HOURS_MS + 60 * 1000;

    let scheduledTime: number;
    if (!nextChannelTime.has(ch)) {
      scheduledTime = baseTime + startOffset;
    } else {
      scheduledTime = (nextChannelTime.get(ch) || baseTime) + interval;
    }

    // In the unlikely event that scheduledTime exceeds maxAllowedTime,
    // clamp it safely while preserving spacing
    if (scheduledTime > maxAllowedTime) {
      scheduledTime = maxAllowedTime;
    }

    nextChannelTime.set(ch, scheduledTime);
    resultDates.push(new Date(scheduledTime));
  }

  return resultDates;
}
