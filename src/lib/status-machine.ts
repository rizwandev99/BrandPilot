/**
 * Post Status State Machine (AC-F5-03)
 * Pure functions governing post workflow transitions and human-in-the-loop approval gate.
 */

export const ALL_POST_STATUSES = [
  'draft',
  'in_review',
  'approved',
  'held',
  'rejected',
  'scheduled',
  'publishing',
  'published',
  'failed',
] as const;

export type PostStatus = (typeof ALL_POST_STATUSES)[number];

export const ALLOWED_TRANSITION_MAP: Record<PostStatus, readonly PostStatus[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'held', 'rejected'],
  held: ['in_review'],
  approved: ['scheduled', 'in_review'],
  scheduled: ['publishing', 'approved'],
  publishing: ['published', 'failed'],
  failed: ['scheduled'],
  rejected: ['in_review'],
  published: [], // Terminal state
};

export class StatusTransitionError extends Error {
  readonly code = 'INVALID_TRANSITION';

  constructor(from: string, to: string) {
    super(`Invalid transition: cannot transition post from "${from}" to "${to}".`);
    this.name = 'StatusTransitionError';
    Object.setPrototypeOf(this, StatusTransitionError.prototype);
  }
}

export function isPostStatus(status: unknown): status is PostStatus {
  return typeof status === 'string' && (ALL_POST_STATUSES as readonly string[]).includes(status);
}

/**
 * Returns true if transition from `from` to `to` is permitted by the state machine.
 */
export function canTransition(from: PostStatus | string, to: PostStatus | string): boolean {
  if (!isPostStatus(from) || !isPostStatus(to)) {
    return false;
  }
  if (from === to) {
    return false;
  }
  const allowed = ALLOWED_TRANSITION_MAP[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Validates transition from `from` to `to`.
 * Throws StatusTransitionError with code 'INVALID_TRANSITION' if disallowed.
 */
export function validateTransition(from: PostStatus | string, to: PostStatus | string): void {
  if (!canTransition(from, to)) {
    throw new StatusTransitionError(String(from), String(to));
  }
}

/**
 * Returns the list of permitted target statuses from the current status.
 */
export function getAllowedTransitions(currentStatus: PostStatus): readonly PostStatus[] {
  return ALLOWED_TRANSITION_MAP[currentStatus] ?? [];
}
