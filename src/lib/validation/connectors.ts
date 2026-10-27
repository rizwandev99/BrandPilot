import { z } from 'zod';

export const socialProviderSchema = z.enum(['linkedin', 'instagram', 'x', 'facebook']);
export type SocialProviderInput = z.infer<typeof socialProviderSchema>;

export const connectorModeSchema = z.enum(['sandbox', 'live']);
export type ConnectorModeInput = z.infer<typeof connectorModeSchema>;

export const simulationFailureModeSchema = z.enum([
  'none',
  'temporary',
  'rate_limit',
  'permanent',
  'auth_expired',
]);
export type SimulationFailureMode = z.infer<typeof simulationFailureModeSchema>;

export const connectRequestSchema = z.object({
  mode: connectorModeSchema.optional().default('sandbox'),
});

export const updateSettingsRequestSchema = z.object({
  simulationFailure: simulationFailureModeSchema,
  retryAfterSeconds: z.number().int().positive().optional(),
});
