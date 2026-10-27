import type { BrandKitOutput, IdeaItem, LlmProvider, LlmResult } from '@/server/llm/interface';
import { ResilientLlmProvider } from '@/server/llm/resilient-provider';
import type { Channel } from '@/lib/channels';

export interface IdeaStepInput {
  brandKit: BrandKitOutput;
  goal: string;
  channels: Channel[];
  postCount: number;
  provider?: LlmProvider;
}

export interface IdeaStepOutput {
  ideas: IdeaItem[];
  provider: 'gemini' | 'fallback' | 'fake';
}

/**
 * Step 1: Idea Agent
 * Generates post ideas (angle, key message, channel) from the Brand Kit and campaign goal.
 */
export async function runIdeaStep(input: IdeaStepInput): Promise<IdeaStepOutput> {
  const provider = input.provider || new ResilientLlmProvider();

  const channels = input.channels.length > 0 ? input.channels : (['linkedin', 'x'] as Channel[]);
  const postCount = Math.max(1, input.postCount || 4);

  const result: LlmResult<IdeaItem[]> = await provider.generateIdeas({
    brandKit: input.brandKit,
    goal: input.goal,
    channels,
    postCount,
  });

  return {
    ideas: result.data,
    provider: result.provider,
  };
}
