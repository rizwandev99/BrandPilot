import { z } from 'zod';

export const HexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const BrandColorsSchema = z.object({
  primary: z.string().regex(HexColorRegex, 'Invalid primary hex color'),
  secondary: z.string().regex(HexColorRegex, 'Invalid secondary hex color'),
  background: z.string().regex(HexColorRegex, 'Invalid background hex color'),
  text: z.string().regex(HexColorRegex, 'Invalid text hex color'),
});

export const BrandKitSchema = z.object({
  id: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  name: z.string().min(1, 'Brand name is required').max(100),
  summary: z.string().min(1).max(280, 'Summary must not exceed 280 characters'),
  tone: z.array(z.string().min(1)).min(3, 'Minimum 3 tone words').max(5, 'Maximum 5 tone words'),
  dos: z.array(z.string().min(1)).min(3, 'Minimum 3 dos').max(5, 'Maximum 5 dos'),
  donts: z.array(z.string().min(1)).min(3, 'Minimum 3 donts').max(5, 'Maximum 5 donts'),
  audience: z.string().min(1, 'Target audience is required').max(300),
  colors: BrandColorsSchema,
  keywords: z.array(z.string().min(1)).min(5, 'Minimum 5 keywords').max(12, 'Maximum 12 keywords'),
  provider: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateBrandKitRequestSchema = z.union([
  z.object({ url: z.string().url('Invalid URL format') }),
  z.object({ sample: z.literal(true) }),
]);

export const PatchBrandKitRequestSchema = z.object({
  name: z.string().min(1, 'Brand name cannot be empty').max(100).optional(),
  summary: z.string().min(1).max(280, 'Summary must not exceed 280 characters').optional(),
  tone: z.array(z.string().min(1)).min(3, 'Minimum 3 tone words').max(5, 'Maximum 5 tone words').optional(),
  dos: z.array(z.string().min(1)).min(3, 'Minimum 3 dos').max(5, 'Maximum 5 dos').optional(),
  donts: z.array(z.string().min(1)).min(3, 'Minimum 3 donts').max(5, 'Maximum 5 donts').optional(),
  audience: z.string().min(1, 'Target audience is required').max(300).optional(),
  colors: BrandColorsSchema.partial().optional(),
  keywords: z.array(z.string().min(1)).min(5, 'Minimum 5 keywords').max(12, 'Maximum 12 keywords').optional(),
});

export type BrandColors = z.infer<typeof BrandColorsSchema>;
export type BrandKit = z.infer<typeof BrandKitSchema>;
export type CreateBrandKitRequest = z.infer<typeof CreateBrandKitRequestSchema>;
export type PatchBrandKitRequest = z.infer<typeof PatchBrandKitRequestSchema>;
