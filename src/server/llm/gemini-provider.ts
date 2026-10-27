import { GoogleGenAI } from '@google/genai';
import type {
  BrandKitGenerationInput,
  BrandKitOutput,
  IdeasGenerationInput,
  IdeaItem,
  CreativeGenerationInput,
  CreativeOutput,
  ConditionEvaluationInput,
  ConditionOutput,
  LlmResult,
  LlmProvider,
} from './interface';
import { createSerializedQueue } from './concurrency';
import { executeWithBackoff } from './backoff';

export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini' as const;
  private queue = createSerializedQueue();

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const err = new Error('Missing GEMINI_API_KEY environment variable');
      // intentional any: attach HTTP status code property to Error object
      (err as any).status = 401;
      throw err;
    }
    return new GoogleGenAI({ apiKey });
  }

  private cleanJson(text: string): string {
    let clean = text.trim();
    if (clean.startsWith('```json')) {
      clean = clean.slice(7);
    } else if (clean.startsWith('```')) {
      clean = clean.slice(3);
    }
    if (clean.endsWith('```')) {
      clean = clean.slice(0, -3);
    }
    return clean.trim();
  }

  async generateBrandKit(input: BrandKitGenerationInput): Promise<LlmResult<BrandKitOutput>> {
    return this.queue.enqueue(async () => {
      return executeWithBackoff(async () => {
        const ai = this.getClient();
        const prompt = `You are a branding expert. Analyze the following scraped website data and generate a comprehensive Brand Kit strictly in JSON format.
URL: ${input.url || 'N/A'}
Scraped Facts: ${JSON.stringify(input.scrapedData || {})}

Return a valid JSON object matching this TypeScript interface:
{
  "name": string,
  "summary": string,
  "tone": string[],
  "dos": string[],
  "donts": string[],
  "audience": string,
  "colors": {
    "primary": string, // hex color
    "secondary": string, // hex color
    "background": string, // hex color e.g. #ffffff
    "text": string // hex color with WCAG AA >= 4.5:1 contrast
  },
  "keywords": string[]
}
Output only valid JSON, no surrounding commentary.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text || '';
        const parsed = JSON.parse(this.cleanJson(text)) as BrandKitOutput;

        return {
          data: parsed,
          provider: 'gemini',
        };
      });
    });
  }

  async generateIdeas(input: IdeasGenerationInput): Promise<LlmResult<IdeaItem[]>> {
    return this.queue.enqueue(async () => {
      return executeWithBackoff(async () => {
        const ai = this.getClient();
        const prompt = `You are a social media campaign strategist. Generate ${input.postCount} distinct, high-impact content ideas across the specified channels.
Brand Kit: ${JSON.stringify(input.brandKit)}
Campaign Goal: ${input.goal}
Channels: ${input.channels.join(', ')}

Return a JSON array of IdeaItem objects matching:
[
  {
    "id": string,
    "channel": "linkedin" | "instagram" | "x" | "facebook",
    "angle": string,
    "keyMessage": string
  }
]
Output only valid JSON array.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text || '';
        const parsed = JSON.parse(this.cleanJson(text)) as IdeaItem[];

        return {
          data: parsed,
          provider: 'gemini',
        };
      });
    });
  }

  async generateCreative(input: CreativeGenerationInput): Promise<LlmResult<CreativeOutput>> {
    return this.queue.enqueue(async () => {
      return executeWithBackoff(async () => {
        const ai = this.getClient();
        const prompt = `You are a social media copywriter and creative director. Generate copy and card specifications for this idea.
Brand Kit: ${JSON.stringify(input.brandKit)}
Idea: ${JSON.stringify(input.idea)}

Return a JSON object matching:
{
  "caption": string,
  "hashtags": string[],
  "creativeSpec": {
    "headline": string,
    "subline": string,
    "templateId": "quote-card" | "feature-card" | "tip-card",
    "colors": {
      "primary": string,
      "secondary": string,
      "background": string,
      "text": string
    }
  }
}
Output only valid JSON.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text || '';
        const parsed = JSON.parse(this.cleanJson(text)) as CreativeOutput;

        return {
          data: parsed,
          provider: 'gemini',
        };
      });
    });
  }

  async evaluateCondition(input: ConditionEvaluationInput): Promise<LlmResult<ConditionOutput>> {
    return this.queue.enqueue(async () => {
      return executeWithBackoff(async () => {
        const ai = this.getClient();
        const prompt = `Evaluate whether the event payload satisfies the condition prompt.
Brand Kit: ${JSON.stringify(input.brandKit)}
Event Payload: ${JSON.stringify(input.eventPayload)}
Condition Rule: ${input.prompt}

Return a JSON object matching:
{
  "matched": boolean,
  "reason": string
}
Output only valid JSON.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text || '';
        const parsed = JSON.parse(this.cleanJson(text)) as ConditionOutput;

        return {
          data: parsed,
          provider: 'gemini',
        };
      });
    });
  }
}
