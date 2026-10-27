export interface FilterBannedWordsResult {
  hasBannedWords: boolean;
  removed: string[];
  cleaned: string;
}

export interface PostWithHashtags {
  caption: string;
  hashtags: string[];
}

export interface CleanPostResult {
  modified: boolean;
  caption: string;
  hashtags: string[];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a regex that matches the phrase on word boundaries.
 */
function createBoundaryRegex(phrase: string): RegExp {
  const trimmed = phrase.trim();
  const escaped = escapeRegex(trimmed).replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

/**
 * Checks if the given text contains any words or phrases from the donts list.
 */
export function containsBannedWords(text: string, donts: string[]): boolean {
  if (!text || !donts || donts.length === 0) {
    return false;
  }

  for (const phrase of donts) {
    if (!phrase || !phrase.trim()) continue;
    const regex = createBoundaryRegex(phrase);
    if (regex.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Finds all banned words from the donts list present in the text.
 */
export function findBannedWords(text: string, donts: string[]): string[] {
  if (!text || !donts || donts.length === 0) {
    return [];
  }

  const found: string[] = [];
  for (const phrase of donts) {
    if (!phrase || !phrase.trim()) continue;
    const regex = createBoundaryRegex(phrase);
    if (regex.test(text)) {
      found.push(phrase.trim());
    }
  }

  return found;
}

/**
 * Filters and removes banned words from caption while preserving surrounding grammar.
 */
export function filterBannedWords(text: string, donts: string[]): FilterBannedWordsResult {
  if (!text || !donts || donts.length === 0) {
    return {
      hasBannedWords: false,
      removed: [],
      cleaned: text || '',
    };
  }

  const removed: string[] = [];
  let cleaned = text;

  for (const phrase of donts) {
    if (!phrase || !phrase.trim()) continue;
    const trimmed = phrase.trim();
    const regex = createBoundaryRegex(trimmed);

    if (regex.test(cleaned)) {
      removed.push(trimmed);
      // Remove word and any immediately attached punctuation if appropriate
      const removalRegex = new RegExp(`\\b${escapeRegex(trimmed)}\\b[!?,.:;]*`, 'gi');
      cleaned = cleaned.replace(removalRegex, '');
    }
  }

  if (removed.length > 0) {
    // Tidy up extra whitespace and stranded punctuation
    cleaned = cleaned
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.!?:;])/g, '$1')
      .replace(/\(\s*\)/g, '')
      .replace(/\[\s*\]/g, '')
      .trim();
  }

  return {
    hasBannedWords: removed.length > 0,
    removed,
    cleaned,
  };
}

/**
 * Cleans both the caption and hashtags of a post against brand kit donts.
 */
export function cleanPostDonts(post: PostWithHashtags, donts: string[]): CleanPostResult {
  if (!donts || donts.length === 0) {
    return {
      modified: false,
      caption: post.caption,
      hashtags: post.hashtags,
    };
  }

  const filterResult = filterBannedWords(post.caption, donts);
  let modified = filterResult.hasBannedWords;
  const newCaption = filterResult.cleaned;

  const normalizedDonts = new Set(
    donts
      .filter((d) => d && d.trim())
      .map((d) => d.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );

  const newHashtags = post.hashtags.filter((tag) => {
    const tagClean = tag.toLowerCase().replace(/^#+/, '').replace(/[^a-z0-9]/g, '');
    if (normalizedDonts.has(tagClean)) {
      modified = true;
      return false;
    }
    // Also check if any dont phrase matches
    for (const d of donts) {
      const dClean = d.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (dClean && tagClean === dClean) {
        modified = true;
        return false;
      }
    }
    return true;
  });

  return {
    modified,
    caption: modified ? newCaption : post.caption,
    hashtags: modified ? newHashtags : post.hashtags,
  };
}
