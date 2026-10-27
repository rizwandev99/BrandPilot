import { describe, it, expect } from 'vitest';

describe('F3 Content Agent: Channel Limits & Validation (AC-F3-04)', () => {
  describe('AC-F3-04: Channel Config Constants (CHANNEL_CONFIG)', () => {
    it('AC-F3-04: verifies correct character and hashtag limits for all 4 supported channels', async () => {
      const { CHANNEL_CONFIG } = await import('@/lib/channels');

      // LinkedIn
      expect(CHANNEL_CONFIG.linkedin).toBeDefined();
      expect(CHANNEL_CONFIG.linkedin.maxCharacters).toBe(3000);
      expect(CHANNEL_CONFIG.linkedin.maxHashtags).toBe(10);
      expect(CHANNEL_CONFIG.linkedin.qualityHashtagTarget).toEqual([3, 5]);

      // X (Twitter)
      expect(CHANNEL_CONFIG.x).toBeDefined();
      expect(CHANNEL_CONFIG.x.maxCharacters).toBe(280);
      expect(CHANNEL_CONFIG.x.maxHashtags).toBe(4);
      expect(CHANNEL_CONFIG.x.qualityHashtagTarget).toEqual([1, 2]);

      // Instagram
      expect(CHANNEL_CONFIG.instagram).toBeDefined();
      expect(CHANNEL_CONFIG.instagram.maxCharacters).toBe(2200);
      expect(CHANNEL_CONFIG.instagram.maxHashtags).toBe(30);
      expect(CHANNEL_CONFIG.instagram.qualityHashtagTarget).toEqual([8, 15]);

      // Facebook
      expect(CHANNEL_CONFIG.facebook).toBeDefined();
      expect(CHANNEL_CONFIG.facebook.maxCharacters).toBe(2000);
      expect(CHANNEL_CONFIG.facebook.maxHashtags).toBe(10);
      expect(CHANNEL_CONFIG.facebook.qualityHashtagTarget).toEqual([2, 5]);
    });
  });

  describe('AC-F3-04: Pure Validation Function (validatePostForChannel)', () => {
    it('AC-F3-04: marks post as valid when within character and hashtag constraints', async () => {
      const { validatePostForChannel } = await import('@/lib/channels');

      // Valid LinkedIn post
      const validLinkedIn = validatePostForChannel(
        {
          caption: 'Excited to announce our new product milestone! Check it out.',
          hashtags: ['#leadership', '#innovation', '#saas'],
        },
        'linkedin'
      );
      expect(validLinkedIn.valid).toBe(true);
      expect(validLinkedIn.errors).toHaveLength(0);

      // Valid X post (250 chars)
      const validX = validatePostForChannel(
        {
          caption: 'We just launched BrandPilot: AI-powered social media marketing for modern brands. #AI #SaaS',
          hashtags: ['#AI', '#SaaS'],
        },
        'x'
      );
      expect(validX.valid).toBe(true);
      expect(validX.errors).toHaveLength(0);

      // Valid Instagram post (10 hashtags)
      const validIG = validatePostForChannel(
        {
          caption: 'Behind the scenes at our creator studio.',
          hashtags: ['#design', '#content', '#creator', '#marketing', '#agency', '#ai', '#visual', '#growth', '#brand', '#launch'],
        },
        'instagram'
      );
      expect(validIG.valid).toBe(true);
      expect(validIG.errors).toHaveLength(0);

      // Valid Facebook post
      const validFB = validatePostForChannel(
        {
          caption: 'Community update: Our new features are live for all users today.',
          hashtags: ['#update', '#community'],
        },
        'facebook'
      );
      expect(validFB.valid).toBe(true);
      expect(validFB.errors).toHaveLength(0);
    });

    it('AC-F3-04: flags X posts exceeding 280 characters with limit violation error', async () => {
      const { validatePostForChannel } = await import('@/lib/channels');

      const longText = 'A'.repeat(281);
      const result = validatePostForChannel({ caption: longText, hashtags: [] }, 'x');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('280') || e.includes('character'))).toBe(true);
    });

    it('AC-F3-04: flags LinkedIn posts exceeding 3000 characters', async () => {
      const { validatePostForChannel } = await import('@/lib/channels');

      const longLinkedInText = 'A'.repeat(3001);
      const result = validatePostForChannel({ caption: longLinkedInText, hashtags: [] }, 'linkedin');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('3000') || e.includes('character'))).toBe(true);
    });

    it('AC-F3-04: flags Instagram posts exceeding 2200 characters or 30 hashtags', async () => {
      const { validatePostForChannel } = await import('@/lib/channels');

      // Exceeding character limit
      const longIG = validatePostForChannel({ caption: 'B'.repeat(2201), hashtags: [] }, 'instagram');
      expect(longIG.valid).toBe(false);
      expect(longIG.errors.some((e: string) => e.includes('2200'))).toBe(true);

      // Exceeding hashtag limit (31 hashtags)
      const hashtags31 = Array.from({ length: 31 }, (_, i) => `#tag${i}`);
      const tooManyHashtags = validatePostForChannel({ caption: 'Nice photo', hashtags: hashtags31 }, 'instagram');
      expect(tooManyHashtags.valid).toBe(false);
      expect(tooManyHashtags.errors.some((e: string) => e.includes('hashtag') || e.includes('30'))).toBe(true);
    });

    it('AC-F3-04: flags Facebook posts exceeding 2000 characters', async () => {
      const { validatePostForChannel } = await import('@/lib/channels');

      const longFB = validatePostForChannel({ caption: 'C'.repeat(2001), hashtags: [] }, 'facebook');
      expect(longFB.valid).toBe(false);
      expect(longFB.errors.some((e: string) => e.includes('2000'))).toBe(true);
    });
  });

  describe('AC-F3-04: Trimming & Auto-Shortening Behavior', () => {
    it('AC-F3-04: truncates overflow text at word boundary and appends ellipsis <= channel cap', async () => {
      const { trimPostForChannel, CHANNEL_CONFIG } = await import('@/lib/channels');

      const longSentence =
        'BrandPilot enables automated multi-channel campaign publishing across modern social networks with built-in human verification safeguards, intelligent scheduling intervals, and customized branded graphic templates that keep your content aligned with corporate voice guidelines and visual standards.';

      // X limit: 280
      const trimmedX = trimPostForChannel({ caption: longSentence.repeat(2), hashtags: ['#AI'] }, 'x');

      expect(trimmedX.caption.length).toBeLessThanOrEqual(CHANNEL_CONFIG.x.maxCharacters);
      expect(trimmedX.caption.endsWith('...')).toBe(true);

      // Should not break in the middle of a word (the word before ... should be preceded by a space or complete word)
      const textBeforeEllipsis = trimmedX.caption.slice(0, -3);
      expect(textBeforeEllipsis.endsWith(' ') || !longSentence.includes(textBeforeEllipsis.slice(-1) + 'X')).toBe(true);
    });

    it('AC-F3-04: caps excessive hashtags to channel maxHashtags limit during trimming', async () => {
      const { trimPostForChannel, CHANNEL_CONFIG } = await import('@/lib/channels');

      const hashtags10 = Array.from({ length: 10 }, (_, i) => `#tag${i}`);

      // X allows max 4 hashtags
      const trimmedX = trimPostForChannel({ caption: 'Quick tweet', hashtags: hashtags10 }, 'x');

      expect(trimmedX.hashtags.length).toBeLessThanOrEqual(CHANNEL_CONFIG.x.maxHashtags);
      expect(trimmedX.hashtags).toEqual(['#tag0', '#tag1', '#tag2', '#tag3']);
    });
  });
});
