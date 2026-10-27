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
import { GeminiProvider } from './gemini-provider';
import { FallbackProvider } from './fallback-provider';
import { checkAndIncrementDailyBudget } from './usage';

export interface ResilientLlmProviderOptions {
  geminiProvider?: LlmProvider;
  fallbackProvider?: LlmProvider;
  dailyBudgetLimit?: number;
}

export class ResilientLlmProvider implements LlmProvider {
  readonly name = 'gemini' as const;

  private geminiProvider: LlmProvider;
  private fallbackProvider: LlmProvider;
  private dailyBudgetLimit?: number;

  constructor(options: ResilientLlmProviderOptions = {}) {
    this.geminiProvider = options.geminiProvider || new GeminiProvider();
    this.fallbackProvider = options.fallbackProvider || new FallbackProvider();
    this.dailyBudgetLimit = options.dailyBudgetLimit;
  }

  private classifyError(err: unknown): string {
    if (!err) return 'unknown_error';
    const message = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number })?.status;

    if (status === 429 || /429|rate\s*limit|resource\s*exhausted/i.test(message)) {
      return 'rate_limit';
    }
    if (/timeout/i.test(message)) {
      return 'timeout';
    }
    if ((status && status >= 500 && status < 600) || /503|500|502|504|server\s*error/i.test(message)) {
      return 'server_error';
    }
    return message;
  }

  private async checkGating(): Promise<{ allowed: boolean; fallbackReason?: string }> {
    // 1. Daily Budget Check first
    try {
      const budgetStatus = await checkAndIncrementDailyBudget({
        budgetLimit: this.dailyBudgetLimit,
      });
      if (!budgetStatus.allowed) {
        return { allowed: false, fallbackReason: 'budget_exceeded' };
      }
    } catch {
      // If DB is offline/unreachable in unit test, do not block execution
    }

    // 2. Secret Key Check
    if (!process.env.GEMINI_API_KEY) {
      return { allowed: false, fallbackReason: 'missing_api_key' };
    }

    return { allowed: true };
  }

  async generateBrandKit(input: BrandKitGenerationInput): Promise<LlmResult<BrandKitOutput>> {
    const gating = await this.checkGating();
    if (!gating.allowed) {
      const fallback = await this.fallbackProvider.generateBrandKit(input);
      return {
        ...fallback,
        provider: 'fallback',
        fallbackReason: gating.fallbackReason,
      };
    }

    try {
      const result = await this.geminiProvider.generateBrandKit(input);
      return result;
    } catch (err) {
      const reason = this.classifyError(err);
      const fallback = await this.fallbackProvider.generateBrandKit(input);
      return {
        ...fallback,
        provider: 'fallback',
        fallbackReason: reason,
      };
    }
  }

  async generateIdeas(input: IdeasGenerationInput): Promise<LlmResult<IdeaItem[]>> {
    const gating = await this.checkGating();
    if (!gating.allowed) {
      const fallback = await this.fallbackProvider.generateIdeas(input);
      return {
        ...fallback,
        provider: 'fallback',
        fallbackReason: gating.fallbackReason,
      };
    }

    try {
      return await this.geminiProvider.generateIdeas(input);
    } catch (err) {
      const reason = this.classifyError(err);
      const fallback = await this.fallbackProvider.generateIdeas(input);
      return {
        ...fallback,
        provider: 'fallback',
        fallbackReason: reason,
      };
    }
  }

  async generateCreative(input: CreativeGenerationInput): Promise<LlmResult<CreativeOutput>> {
    const gating = await this.checkGating();
    if (!gating.allowed) {
      const fallback = await this.fallbackProvider.generateCreative(input);
      return {
        ...fallback,
        provider: 'fallback',
        fallbackReason: gating.fallbackReason,
      };
    }

    try {
      return await this.geminiProvider.generateCreative(input);
    } catch (err) {
      const reason = this.classifyError(err);
      const fallback = await this.fallbackProvider.generateCreative(input);
      return {
        ...fallback,
        provider: 'fallback',
        fallbackReason: reason,
      };
    }
  }

  async evaluateCondition(input: ConditionEvaluationInput): Promise<LlmResult<ConditionOutput>> {
    const gating = await this.checkGating();
    if (!gating.allowed) {
      const fallback = await this.fallbackProvider.evaluateCondition(input);
      return {
        ...fallback,
        provider: 'fallback',
        fallbackReason: gating.fallbackReason,
      };
    }

    try {
      return await this.geminiProvider.evaluateCondition(input);
    } catch (err) {
      const reason = this.classifyError(err);
      const fallback = await this.fallbackProvider.evaluateCondition(input);
      return {
        ...fallback,
        provider: 'fallback',
        fallbackReason: reason,
      };
    }
  }
}
