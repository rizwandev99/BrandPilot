import { eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { llmUsage } from '@/server/db/schema';

export interface DailyBudgetOptions {
  budgetLimit?: number;
  dateStr?: string;
}

export interface DailyBudgetStatus {
  allowed: boolean;
  currentCalls: number;
  budgetLimit: number;
}

export async function checkAndIncrementDailyBudget(
  options: DailyBudgetOptions = {}
): Promise<DailyBudgetStatus> {
  const budgetLimit =
    options.budgetLimit ??
    (process.env.LLM_DAILY_BUDGET ? parseInt(process.env.LLM_DAILY_BUDGET, 10) : 50);

  const today = options.dateStr || new Date().toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(llmUsage)
    .where(eq(llmUsage.day, today));

  const currentCalls = rows && rows.length > 0 ? rows[0].calls : 0;

  if (currentCalls >= budgetLimit) {
    return {
      allowed: false,
      currentCalls,
      budgetLimit,
    };
  }

  // Increment call count
  let newCalls = currentCalls + 1;

  if (!rows || rows.length === 0) {
    await db
      .insert(llmUsage)
      .values({
        day: today,
        calls: 1,
      })
      .onConflictDoUpdate({
        target: llmUsage.day,
        set: {
          calls: sql`${llmUsage.calls} + 1`,
        },
      });
    newCalls = 1;
  } else {
    await db
      .update(llmUsage)
      .set({
        calls: sql`${llmUsage.calls} + 1`,
      })
      .where(eq(llmUsage.day, today));
  }

  return {
    allowed: true,
    currentCalls: newCalls,
    budgetLimit,
  };
}
