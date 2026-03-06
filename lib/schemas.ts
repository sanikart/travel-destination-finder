import { z } from 'zod';

import { BUDGET_BANDS, GROUP_TYPES, MONTHS, TRIP_TAGS } from '@/lib/types';

export const recommendationSchema = z.object({
  month: z.enum(MONTHS),
  tripTypes: z.array(z.enum(TRIP_TAGS)).default([]),
  groupType: z.enum(GROUP_TYPES).default('any'),
  budgetBand: z.enum(BUDGET_BANDS).default('mid'),
  regionTags: z.array(z.string().min(2).max(50)).optional().default([]),
  limit: z.number().int().min(1).max(500).optional().default(60)
});

export const destinationFilterSchema = z.object({
  countryIso: z.string().length(3).optional(),
  adminLevel: z
    .union([z.literal('0'), z.literal('1'), z.literal(0), z.literal(1)])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value) as 0 | 1)),
  tags: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').map((tag) => tag.trim()).filter(Boolean) : []))
});

export const saveDestinationSchema = z.object({
  destinationId: z.string().min(2),
  note: z.string().trim().max(240).optional().default('')
});

export const clickEventSchema = z.object({
  destinationId: z.string().min(2),
  score: z.number().min(0).max(100).optional(),
  position: z.number().int().min(1).max(500),
  month: z.enum(MONTHS)
});
