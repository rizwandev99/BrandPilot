import type { PostStatus } from '@/lib/status-machine';

export type TriggerType =
  | 'webhook.received'
  | 'post.created'
  | 'post.published'
  | 'post.failed'
  | 'post.approved';

export interface RuleTrigger {
  type: TriggerType | string;
  eventName?: string;
  [key: string]: unknown;
}

export type ConditionOperator =
  | 'eq'
  | 'equals'
  | 'neq'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'greater_than'
  | 'lt'
  | 'less_than'
  | 'in'
  | 'exists';

export interface PathComparisonCondition {
  type: 'path_comparison';
  path: string;
  operator: ConditionOperator;
  value?: unknown;
}

export interface AiOnBrandCondition {
  type: 'ai_on_brand' | 'ai_on_brand_check';
  prompt?: string;
  brandKitId?: string;
  strictness?: 'lenient' | 'moderate' | 'strict';
  [key: string]: unknown;
}

export type RuleCondition = PathComparisonCondition | AiOnBrandCondition | {
  type: string;
  path?: string;
  operator?: ConditionOperator;
  value?: unknown;
  prompt?: string;
  [key: string]: unknown;
};

export type SocialChannel = 'linkedin' | 'instagram' | 'x' | 'facebook';

export interface CreateAiDraftAction {
  type: 'create_ai_draft';
  channel?: SocialChannel;
  prompt?: string;
  [key: string]: unknown;
}

export interface SendWebhookAction {
  type: 'send_webhook';
  webhookUrl?: string;
  [key: string]: unknown;
}

export interface HoldPostAction {
  type: 'hold_post';
  reason?: string;
  postId?: string;
  [key: string]: unknown;
}

export interface SetPostStatusAction {
  type: 'set_post_status';
  status?: PostStatus | string;
  postId?: string;
  [key: string]: unknown;
}

export type RuleAction =
  | CreateAiDraftAction
  | SendWebhookAction
  | HoldPostAction
  | SetPostStatusAction
  | {
      type: string;
      channel?: SocialChannel;
      status?: PostStatus | string;
      reason?: string;
      webhookUrl?: string;
      [key: string]: unknown;
    };

export interface AutomationRule {
  id: string;
  workspaceId?: string;
  name?: string;
  enabled?: boolean;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdAt?: Date | string;
}

export interface SystemEvent {
  id?: string;
  type: string;
  source?: 'incoming' | 'outgoing' | 'system' | string;
  depth?: number;
  payload?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ConditionLog {
  conditionIndex: number;
  passed: boolean;
  reason?: string;
  details?: unknown;
}

export interface StepLog {
  step: string;
  status: 'passed' | 'failed' | 'skipped';
  details?: unknown;
  error?: string;
  durationMs?: number;
}

export interface RuleEvaluationResult {
  matched: boolean;
  actionsToRun: RuleAction[];
  conditionLogs: ConditionLog[];
  conditionsSummary?: ConditionLog[];
  logs: StepLog[];
}
