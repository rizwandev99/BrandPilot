export interface BrandKitGenerationInput {
  url?: string;
  scrapedData?: {
    title: string;
    description: string;
    headings: string[];
    sampleText: string;
    colors: string[];
  };
}

export interface BrandKitOutput {
  name: string;
  summary: string;
  tone: string[];
  dos: string[];
  donts: string[];
  audience: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  keywords: string[];
}

export interface IdeasGenerationInput {
  brandKit: BrandKitOutput;
  goal: string;
  channels: ('linkedin' | 'instagram' | 'x' | 'facebook')[];
  postCount: number;
}

export interface IdeaItem {
  id: string;
  channel: 'linkedin' | 'instagram' | 'x' | 'facebook';
  angle: string;
  keyMessage: string;
}

export interface CreativeGenerationInput {
  brandKit: BrandKitOutput;
  idea: IdeaItem;
}

export interface CreativeOutput {
  caption: string;
  hashtags: string[];
  creativeSpec: {
    headline: string;
    subline?: string;
    templateId: string;
    colors: Record<string, string>;
  };
}

export interface ConditionEvaluationInput {
  brandKit: BrandKitOutput;
  eventPayload: Record<string, unknown>;
  prompt: string;
}

export interface ConditionOutput {
  matched: boolean;
  reason: string;
}

export interface LlmResult<T> {
  data: T;
  provider: 'gemini' | 'fallback' | 'fake';
  cached?: boolean;
  fallbackReason?: string;
}

export interface LlmProvider {
  readonly name: 'gemini' | 'fallback' | 'fake';
  generateBrandKit(input: BrandKitGenerationInput): Promise<LlmResult<BrandKitOutput>>;
  generateIdeas(input: IdeasGenerationInput): Promise<LlmResult<IdeaItem[]>>;
  generateCreative(input: CreativeGenerationInput): Promise<LlmResult<CreativeOutput>>;
  evaluateCondition(input: ConditionEvaluationInput): Promise<LlmResult<ConditionOutput>>;
}
