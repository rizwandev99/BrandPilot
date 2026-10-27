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
  "name": string, // Brand name, max 100 chars
  "summary": string, // Concise summary, max 280 chars
  "tone": string[], // Exactly 3 to 5 tone descriptors
  "dos": string[], // Exactly 3 to 5 actionable dos
  "donts": string[], // Exactly 3 to 5 things to avoid
  "audience": string, // Target audience, max 300 chars
  "colors": {
    "primary": string, // valid hex color e.g. #2563eb
    "secondary": string, // valid hex color e.g. #10b981
    "background": string, // valid hex color e.g. #ffffff
    "text": string // valid hex color e.g. #111827
  },
  "keywords": string[] // Between 5 and 10 core keywords
}
Output only valid JSON, no surrounding commentary.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text || '';
        const raw = JSON.parse(this.cleanJson(text)) as Partial<BrandKitOutput>;

        const sanitized: BrandKitOutput = {
          name: (raw.name || 'Brand').slice(0, 100),
          summary: (raw.summary || '').slice(0, 280) || 'Comprehensive brand identity and product suite.',
          tone: Array.isArray(raw.tone) && raw.tone.length >= 3 ? raw.tone.slice(0, 5) : ['innovative', 'authoritative', 'concise'],
          dos: Array.isArray(raw.dos) && raw.dos.length >= 3 ? raw.dos.slice(0, 5) : ['Highlight key benefits', 'Maintain clarity', 'Focus on customer outcomes'],
          donts: Array.isArray(raw.donts) && raw.donts.length >= 3 ? raw.donts.slice(0, 5) : ['Avoid misleading claims', 'Do not use jargon', 'Never overpromise'],
          audience: (raw.audience || 'Target customers and professionals.').slice(0, 300),
          colors: {
            primary: raw.colors?.primary || '#2563eb',
            secondary: raw.colors?.secondary || '#10b981',
            background: raw.colors?.background || '#ffffff',
            text: raw.colors?.text || '#111827',
          },
          keywords: Array.isArray(raw.keywords) && raw.keywords.length >= 5
            ? raw.keywords.slice(0, 12)
            : [...(Array.isArray(raw.keywords) ? raw.keywords : []), 'marketing', 'innovation', 'product', 'growth', 'digital'].slice(0, 8),
        };

        return {
          data: sanitized,
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
    "templateId": "minimal-quote" | "feature-card" | "editorial-tip",
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
