export type Channel = 'linkedin' | 'x' | 'instagram' | 'facebook';

export interface ChannelRule {
  name: string;
  maxCharacters: number;
  maxHashtags: number;
  qualityHashtagTarget: [number, number];
  dimensions: {
    width: number;
    height: number;
  };
}

export const CHANNEL_CONFIG: Record<Channel, ChannelRule> = {
  linkedin: {
    name: 'LinkedIn',
    maxCharacters: 3000,
    maxHashtags: 10,
    qualityHashtagTarget: [3, 5],
    dimensions: {
      width: 1200,
      height: 627,
    },
  },
  x: {
    name: 'X (Twitter)',
    maxCharacters: 280,
    maxHashtags: 4,
    qualityHashtagTarget: [1, 2],
    dimensions: {
      width: 1200,
      height: 675,
    },
  },
  instagram: {
    name: 'Instagram',
    maxCharacters: 2200,
    maxHashtags: 30,
    qualityHashtagTarget: [8, 15],
    dimensions: {
      width: 1080,
      height: 1080,
    },
  },
  facebook: {
    name: 'Facebook',
    maxCharacters: 2000,
    maxHashtags: 10,
    qualityHashtagTarget: [2, 5],
    dimensions: {
      width: 1200,
      height: 630,
    },
  },
};

export interface PostValidationInput {
  caption: string;
  hashtags?: string[];
}

export interface PostValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePostForChannel(
  post: PostValidationInput,
  channel: Channel
): PostValidationResult {
  const config = CHANNEL_CONFIG[channel];
  if (!config) {
    return {
      valid: false,
      errors: [`Unsupported channel: ${channel}`],
    };
  }

  const errors: string[] = [];
  const captionLength = (post.caption || '').length;
  const hashtagCount = (post.hashtags || []).length;

  if (captionLength > config.maxCharacters) {
    errors.push(
      `Caption length (${captionLength}) exceeds ${config.name} limit of ${config.maxCharacters} characters`
    );
  }

  if (hashtagCount > config.maxHashtags) {
    errors.push(
      `Hashtag count (${hashtagCount}) exceeds ${config.name} limit of ${config.maxHashtags} hashtags`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function trimPostForChannel(
  post: PostValidationInput,
  channel: Channel
): { caption: string; hashtags: string[] } {
  const config = CHANNEL_CONFIG[channel];
  if (!config) {
    return {
      caption: post.caption,
      hashtags: post.hashtags || [],
    };
  }

  let caption = post.caption || '';
  if (caption.length > config.maxCharacters) {
    const maxContentLength = config.maxCharacters - 3; // reserve 3 chars for '...'
    if (caption.length > maxContentLength) {
      const slice = caption.slice(0, maxContentLength);
      const lastSpaceIdx = slice.lastIndexOf(' ');
      if (lastSpaceIdx > 0 && lastSpaceIdx >= maxContentLength - 30) {
        caption = slice.slice(0, lastSpaceIdx).trimEnd() + '...';
      } else {
        caption = slice.trimEnd() + '...';
      }
    }
  }

  const originalHashtags = post.hashtags || [];
  const hashtags = originalHashtags.slice(0, config.maxHashtags);

  return {
    caption,
    hashtags,
  };
}

/**
 * Validates channel constraints for character limits and hashtag counts,
 * returning structured error codes.
 */
export function validateChannelConstraints(
  channel: Channel,
  caption: string,
  hashtags: string[] = []
): { valid: boolean; errors: string[] } {
  const config = CHANNEL_CONFIG[channel];
  if (!config) {
    return {
      valid: false,
      errors: ['UNSUPPORTED_CHANNEL'],
    };
  }

  const errors: string[] = [];
  if ((caption || '').length > config.maxCharacters) {
    errors.push('EXCEEDS_MAX_CHARACTERS');
  }

  if ((hashtags || []).length > config.maxHashtags) {
    errors.push('EXCEEDS_MAX_HASHTAGS');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
