import type { BrandKitOutput, IdeaItem, LlmProvider, LlmResult, CreativeOutput } from '@/server/llm/interface';
import { ResilientLlmProvider } from '@/server/llm/resilient-provider';
import type { Channel } from '@/lib/channels';
import { trimPostForChannel } from '@/lib/channels';
import { cleanPostDonts } from '@/lib/banned-words';
import type { CreativeSpec } from '@/server/creatives/card-renderer';

export interface CreativeStepInput {
  brandKit: BrandKitOutput;
  ideas: IdeaItem[];
  provider?: LlmProvider;
}

export interface GeneratedCreative {
  ideaId: string;
  channel: Channel;
  caption: string;
  hashtags: string[];
  creativeSpec: CreativeSpec;
}

export interface CreativeStepOutput {
  creatives: GeneratedCreative[];
  provider: 'gemini' | 'fallback' | 'fake';
}

const TEMPLATE_ROTATION = ['minimal-quote', 'feature-card', 'editorial-tip'] as const;

/**
 * Step 2: Creative Agent
 * Takes post ideas and writes channel-compliant copy, hashtags, and branded image card specs.
 * Guarantees banned word filtering (donts) and channel length/hashtag limits.
 */
export async function runCreativeStep(input: CreativeStepInput): Promise<CreativeStepOutput> {
  const provider = input.provider || new ResilientLlmProvider();
  const { brandKit, ideas } = input;

  const creatives: GeneratedCreative[] = [];
  let detectedProvider: 'gemini' | 'fallback' | 'fake' = 'fallback';

  for (let idx = 0; idx < ideas.length; idx++) {
    const idea = ideas[idx];
    const channel = (idea.channel || 'linkedin') as Channel;

    const result: LlmResult<CreativeOutput> = await provider.generateCreative({
      brandKit,
      idea,
    });
    detectedProvider = result.provider;

    const rawCreative = result.data;

    // 1. Filter banned words using brand kit "donts"
    const cleaned = cleanPostDonts(
      {
        caption: rawCreative.caption,
        hashtags: rawCreative.hashtags || [],
      },
      brandKit.donts || []
    );

    // 2. Validate and auto-trim against channel limits (characters and hashtag caps)
    const trimmed = trimPostForChannel(
      {
        caption: cleaned.caption,
        hashtags: cleaned.hashtags,
      },
      channel
    );

    // 3. Assign rotating distinct creative card template and brand colors
    const templateId = TEMPLATE_ROTATION[idx % TEMPLATE_ROTATION.length];
    const colors = {
      primary: brandKit.colors?.primary || '#2563eb',
      secondary: brandKit.colors?.secondary || '#4f46e5',
      background: brandKit.colors?.background || '#ffffff',
      text: brandKit.colors?.text || '#0f172a',
    };

    const creativeSpec: CreativeSpec = {
      headline: rawCreative.creativeSpec?.headline || idea.angle || 'Brand Highlight',
      subline: rawCreative.creativeSpec?.subline || idea.keyMessage,
      templateId,
      colors,
    };

    creatives.push({
      ideaId: idea.id,
      channel,
      caption: trimmed.caption,
      hashtags: trimmed.hashtags,
      creativeSpec,
    });
  }

  return {
    creatives,
    provider: detectedProvider,
  };
}
