import { getNestedProperty } from './path-resolver';
import type {
  AutomationRule,
  RuleCondition,
  SystemEvent,
  RuleEvaluationResult,
  ConditionLog,
  StepLog,
} from './types';
import type { BrandKitOutput } from '@/server/llm/interface';

export { getNestedProperty };

/**
 * Pure condition evaluator for an event payload.
 * Supports path comparison and semantic AI on-brand evaluation.
 */
export function evaluateCondition(
  condition: RuleCondition,
  event: SystemEvent,
  brandKit?: BrandKitOutput | null
): boolean | Promise<boolean> {
  if (condition.type === 'path_comparison') {
    if (!condition.path || !condition.operator) {
      return false;
    }

    const actualValue = getNestedProperty(event, condition.path);
    const expectedValue = condition.value;

    switch (condition.operator) {
      case 'eq':
      case 'equals':
        return actualValue === expectedValue;

      case 'neq':
      case 'not_equals':
        return actualValue !== expectedValue;

      case 'contains': {
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return actualValue.toLowerCase().includes(expectedValue.toLowerCase());
        }
        if (Array.isArray(actualValue)) {
          return actualValue.some((item) => {
            if (typeof item === 'string' && typeof expectedValue === 'string') {
              return item.toLowerCase() === expectedValue.toLowerCase();
            }
            return item === expectedValue;
          });
        }
        return false;
      }

      case 'not_contains': {
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return !actualValue.toLowerCase().includes(expectedValue.toLowerCase());
        }
        if (Array.isArray(actualValue)) {
          return !actualValue.some((item) => {
            if (typeof item === 'string' && typeof expectedValue === 'string') {
              return item.toLowerCase() === expectedValue.toLowerCase();
            }
            return item === expectedValue;
          });
        }
        return true;
      }

      case 'gt':
      case 'greater_than':
        return (
          typeof actualValue === 'number' &&
          typeof expectedValue === 'number' &&
          actualValue > expectedValue
        );

      case 'lt':
      case 'less_than':
        return (
          typeof actualValue === 'number' &&
          typeof expectedValue === 'number' &&
          actualValue < expectedValue
        );

      case 'in': {
        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(actualValue);
        }
        if (typeof expectedValue === 'string') {
          return expectedValue.toLowerCase().includes(String(actualValue).toLowerCase());
        }
        return false;
      }

      case 'exists':
        return actualValue !== undefined && actualValue !== null;

      default:
        return false;
    }
  }

  if (condition.type === 'ai_on_brand' || condition.type === 'ai_on_brand_check') {
    return evaluateAiOnBrandCondition(condition, event, brandKit);
  }

  return true;
}

async function evaluateAiOnBrandCondition(
  condition: RuleCondition,
  event: SystemEvent,
  brandKit?: BrandKitOutput | null
): Promise<boolean> {
  const payloadStr = JSON.stringify(event.payload || {}).toLowerCase();

  // 1. Fallback / deterministic check against brand kit 'donts' and negative terms
  if (brandKit?.donts && Array.isArray(brandKit.donts)) {
    for (const dont of brandKit.donts) {
      if (typeof dont === 'string' && dont.trim().length > 0) {
        const words = dont.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        for (const w of words) {
          if (payloadStr.includes(w)) {
            return false;
          }
        }
      }
    }
  }

  // 2. Delegate to ResilientLlmProvider if prompt provided
  try {
    const { FallbackProvider } = await import('@/server/llm/fallback-provider');
    const fallback = new FallbackProvider();
    const result = await fallback.evaluateCondition({
      brandKit: brandKit || {
        name: 'BrandPilot',
        summary: 'Marketing automation',
        tone: ['Professional'],
        dos: [],
        donts: [],
        audience: 'Teams',
        colors: { primary: '#2563eb', secondary: '#4f46e5', background: '#ffffff', text: '#0f172a' },
        keywords: ['automation', 'marketing'],
      },
      eventPayload: (event.payload as Record<string, unknown>) || {},
      prompt:
        'prompt' in condition && typeof condition.prompt === 'string'
          ? condition.prompt
          : 'Check if event is on-brand',
    });
    return result.data.matched;
  } catch {
    return true;
  }
}

/**
 * Evaluates an entire automation rule against a system event.
 * Enforces AND conjunction logic across all condition rows.
 */
export async function evaluateRule(
  rule: AutomationRule,
  event: SystemEvent,
  brandKit?: BrandKitOutput | null
): Promise<RuleEvaluationResult> {
  const conditionLogs: ConditionLog[] = [];
  const logs: StepLog[] = [];

  // 1. Trigger verification
  if (rule.trigger?.type && event.type && rule.trigger.type !== event.type) {
    return {
      matched: false,
      actionsToRun: [],
      conditionLogs: [],
      conditionsSummary: [],
      logs: [
        {
          step: 'trigger_check',
          status: 'failed',
          details: { expected: rule.trigger.type, actual: event.type },
        },
      ],
    };
  }

  if (
    rule.trigger?.eventName &&
    event.payload &&
    typeof event.payload === 'object' &&
    'eventName' in event.payload &&
    event.payload.eventName !== rule.trigger.eventName
  ) {
    return {
      matched: false,
      actionsToRun: [],
      conditionLogs: [],
      conditionsSummary: [],
      logs: [
        {
          step: 'trigger_event_name_check',
          status: 'failed',
          details: { expected: rule.trigger.eventName, actual: event.payload.eventName },
        },
      ],
    };
  }

  // 2. Evaluate all conditions with AND logic
  let allMatched = true;

  if (rule.conditions && Array.isArray(rule.conditions) && rule.conditions.length > 0) {
    for (let i = 0; i < rule.conditions.length; i++) {
      const cond = rule.conditions[i];
      const result = await evaluateCondition(cond, event, brandKit);
      const passed = Boolean(result);

      conditionLogs.push({
        conditionIndex: i,
        passed,
        details: cond,
      });

      if (!passed) {
        allMatched = false;
      }
    }
  }

  const actionsToRun = allMatched ? [...(rule.actions || [])] : [];

  return {
    matched: allMatched,
    actionsToRun,
    conditionLogs,
    conditionsSummary: conditionLogs,
    logs: [
      {
        step: 'condition_evaluation',
        status: allMatched ? 'passed' : 'failed',
        details: { conditionCount: rule.conditions?.length || 0, matched: allMatched },
      },
    ],
  };
}
