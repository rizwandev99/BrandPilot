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
import { FallbackProvider } from './fallback-provider';

export type SimulatedErrorType = 'rate_limit' | 'timeout' | 'server_error' | 'none';

export class FakeProvider implements LlmProvider {
  readonly name = 'fake' as const;

  private brandKitMock: BrandKitOutput | null = null;
  private ideasMock: IdeaItem[] | null = null;
  private creativeMock: CreativeOutput | null = null;
  private conditionMock: ConditionOutput | null = null;

  private currentError: SimulatedErrorType = 'none';
  private callCounts: Record<string, number> = {};

  private fallback = new FallbackProvider();

  setBrandKitMock(mock: BrandKitOutput): void {
    this.brandKitMock = mock;
  }

  setIdeasMock(mock: IdeaItem[]): void {
    this.ideasMock = mock;
  }

  setCreativeMock(mock: CreativeOutput): void {
    this.creativeMock = mock;
  }

  setConditionMock(mock: ConditionOutput): void {
    this.conditionMock = mock;
  }

  simulateError(type: SimulatedErrorType): void {
    this.currentError = type;
  }

  getCallCount(method: string): number {
    return this.callCounts[method] || 0;
  }

  private recordCall(method: string): void {
    this.callCounts[method] = (this.callCounts[method] || 0) + 1;
  }

  private checkSimulatedError(): void {
    if (this.currentError === 'rate_limit') {
      const err = new Error('HTTP 429: Rate limit exceeded / Too Many Requests');
      // intentional any: attach HTTP status code property to Error object
      (err as any).status = 429;
      throw err;
    }
    if (this.currentError === 'timeout') {
      throw new Error('Request timeout after 15000ms');
    }
    if (this.currentError === 'server_error') {
      const err = new Error('HTTP 500: Internal Server Error');
      // intentional any: attach HTTP status code property to Error object
      (err as any).status = 500;
      throw err;
    }
  }

  async generateBrandKit(input: BrandKitGenerationInput): Promise<LlmResult<BrandKitOutput>> {
    this.recordCall('generateBrandKit');
    this.checkSimulatedError();

    if (this.brandKitMock) {
      return {
        data: this.brandKitMock,
        provider: 'fake',
      };
    }

    const fallbackRes = await this.fallback.generateBrandKit(input);
    return {
      data: fallbackRes.data,
      provider: 'fake',
    };
  }

  async generateIdeas(input: IdeasGenerationInput): Promise<LlmResult<IdeaItem[]>> {
    this.recordCall('generateIdeas');
    this.checkSimulatedError();

    if (this.ideasMock) {
      return {
        data: this.ideasMock,
        provider: 'fake',
      };
    }

    const fallbackRes = await this.fallback.generateIdeas(input);
    return {
      data: fallbackRes.data,
      provider: 'fake',
    };
  }

  async generateCreative(input: CreativeGenerationInput): Promise<LlmResult<CreativeOutput>> {
    this.recordCall('generateCreative');
    this.checkSimulatedError();

    if (this.creativeMock) {
      return {
        data: this.creativeMock,
        provider: 'fake',
      };
    }

    const fallbackRes = await this.fallback.generateCreative(input);
    return {
      data: fallbackRes.data,
      provider: 'fake',
    };
  }

  async evaluateCondition(input: ConditionEvaluationInput): Promise<LlmResult<ConditionOutput>> {
    this.recordCall('evaluateCondition');
    this.checkSimulatedError();

    if (this.conditionMock) {
      return {
        data: this.conditionMock,
        provider: 'fake',
      };
    }

    const fallbackRes = await this.fallback.evaluateCondition(input);
    return {
      data: fallbackRes.data,
      provider: 'fake',
    };
  }
}
