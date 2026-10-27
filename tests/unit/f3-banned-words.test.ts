import { describe, it, expect } from 'vitest';

describe('F3 Content Agent: Banned Words Filtering from Brand Kit "donts" (AC-F3-05)', () => {
  const brandDonts = [
    'cheap',
    'guarantee',
    'rock bottom prices',
    'spam',
    'miracle',
    'unbelievable',
  ];

  describe('AC-F3-05: Detection of Banned Words (containsBannedWords / findBannedWords)', () => {
    it('AC-F3-05: detects banned words in caption case-insensitively', async () => {
      const { containsBannedWords, findBannedWords } = await import('@/lib/banned-words');

      const textWithBanned = 'Get our CHEAP marketing software with an unbelievable GUARANTEE today!';
      expect(containsBannedWords(textWithBanned, brandDonts)).toBe(true);

      const found = findBannedWords(textWithBanned, brandDonts);
      expect(found.map((w: string) => w.toLowerCase())).toContain('cheap');
      expect(found.map((w: string) => w.toLowerCase())).toContain('unbelievable');
      expect(found.map((w: string) => w.toLowerCase())).toContain('guarantee');
    });

    it('AC-F3-05: detects multi-word phrases from donts list', async () => {
      const { containsBannedWords, findBannedWords } = await import('@/lib/banned-words');

      const phraseText = 'We provide enterprise solutions with rock bottom prices for every business.';
      expect(containsBannedWords(phraseText, brandDonts)).toBe(true);

      const found = findBannedWords(phraseText, brandDonts);
      expect(found.map((w: string) => w.toLowerCase())).toContain('rock bottom prices');
    });

    it('AC-F3-05: respects word boundaries and does not falsely flag legitimate substrings', async () => {
      const { containsBannedWords } = await import('@/lib/banned-words');

      // "cheaper" contains "cheap" as substring, but is a distinct word
      const textSubstrings = 'Our team created a cheaper and faster algorithm.';
      expect(containsBannedWords(textSubstrings, ['cheap'])).toBe(false);

      // "spam" shouldn't trigger on "spastic" or "span"
      expect(containsBannedWords('Spanning across multiple regions.', ['spam'])).toBe(false);
    });

    it('AC-F3-05: returns false and empty list when no banned words exist in text', async () => {
      const { containsBannedWords, findBannedWords } = await import('@/lib/banned-words');

      const cleanText = 'Empowering growth teams with high-velocity marketing workflows and reliable analytics.';
      expect(containsBannedWords(cleanText, brandDonts)).toBe(false);
      expect(findBannedWords(cleanText, brandDonts)).toEqual([]);
    });

    it('AC-F3-05: safely handles empty donts array or empty caption', async () => {
      const { containsBannedWords, findBannedWords } = await import('@/lib/banned-words');

      expect(containsBannedWords('Hello world', [])).toBe(false);
      expect(containsBannedWords('', brandDonts)).toBe(false);
      expect(findBannedWords('', brandDonts)).toEqual([]);
    });
  });

  describe('AC-F3-05: Cleaning and Filtering (filterBannedWords / cleanPostDonts)', () => {
    it('AC-F3-05: removes or scrubs banned words from caption while preserving surrounding grammar', async () => {
      const { filterBannedWords } = await import('@/lib/banned-words');

      const dirtyCaption = 'Why buy cheap products when you can get quality engineering? No spam ever.';
      const result = filterBannedWords(dirtyCaption, brandDonts);

      expect(result.hasBannedWords).toBe(true);
      expect(result.removed.map((w: string) => w.toLowerCase())).toContain('cheap');
      expect(result.removed.map((w: string) => w.toLowerCase())).toContain('spam');

      // Cleaned text must no longer contain the banned words
      expect(result.cleaned.toLowerCase()).not.toContain('cheap');
      expect(result.cleaned.toLowerCase()).not.toContain('spam');
    });

    it('AC-F3-05: removes banned hashtags matching donts keywords', async () => {
      const { cleanPostDonts } = await import('@/lib/banned-words');

      const post = {
        caption: 'Building great software for marketing teams.',
        hashtags: ['#marketing', '#cheap', '#SaaS', '#SPAM', '#growth'],
      };

      const cleaned = cleanPostDonts(post, brandDonts);

      expect(cleaned.modified).toBe(true);
      expect(cleaned.hashtags).toEqual(['#marketing', '#SaaS', '#growth']);
      expect(cleaned.hashtags).not.toContain('#cheap');
      expect(cleaned.hashtags).not.toContain('#SPAM');
    });

    it('AC-F3-05: leaves clean post completely untouched', async () => {
      const { cleanPostDonts } = await import('@/lib/banned-words');

      const pristinePost = {
        caption: 'Enterprise security standards for automated posting pipelines.',
        hashtags: ['#security', '#automation', '#devops'],
      };

      const cleaned = cleanPostDonts(pristinePost, brandDonts);

      expect(cleaned.modified).toBe(false);
      expect(cleaned.caption).toBe(pristinePost.caption);
      expect(cleaned.hashtags).toEqual(pristinePost.hashtags);
    });

    it('AC-F3-05: handles punctuation attached to banned words (e.g. "cheap!", "(spam)")', async () => {
      const { filterBannedWords } = await import('@/lib/banned-words');

      const punctuated = 'Check our offer (it is not cheap!), and zero spam.';
      const result = filterBannedWords(punctuated, brandDonts);

      expect(result.hasBannedWords).toBe(true);
      expect(result.cleaned.toLowerCase()).not.toContain('cheap');
      expect(result.cleaned.toLowerCase()).not.toContain('spam');
    });
  });
});
