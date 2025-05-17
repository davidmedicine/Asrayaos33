/* ────────────────────────────────────────────────
 * supabase/functions/_shared/zod/flameDayDefinition.ts
 * Zod schema ⇄ TypeScript type guard for First-Flame day-definition JSON.
 * Compatible with Deno 1.40 + Supabase build pipeline (no “satisfies”).
 * ────────────────────────────────────────────────*/
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  RITUAL_STAGES_LOOKUP,
  type RitualStage,
} from '../5dayquest/ritual.constants.ts';
import type {
  RitualDayNumber,
  FlameDayDefinition as TsFlameDayDefinition,
  StaticReflectionJourneyStep as TsStaticReflectionJourneyStep,
} from '../5dayquest/FirstFlame.ts';

/* ---------- primitive reusable pieces ---------- */
const RitualDayNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]) as z.ZodType<RitualDayNumber>;

const ritualStageValues = Object.values(
  RITUAL_STAGES_LOOKUP,
) as [RitualStage, ...RitualStage[]];

const RitualStageSchema = z.enum(ritualStageValues);

const OracleGuidanceSchema = z.object({
  interactionPrompt: z.string().min(1),
  oraclePromptPreview: z.string().min(1),
});

const StaticReflectionJourneyStepSchema: z.ZodType<
  TsStaticReflectionJourneyStep
> = z.object({
  id: z
    .string()
    .min(1, 'ID must not be empty')
    .max(64, 'ID must be 64 characters or less'),
  title: z.string().min(1),
  description: z.string().min(1),
});

/* ---------------- root schema ------------------ */
export const FlameDayDefinitionZ: z.ZodType<TsFlameDayDefinition> = z.object({
  ritualDay: RitualDayNumberSchema,
  ritualStage: RitualStageSchema,
  theme: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  accentColor: z
    .string()
    .regex(
      /^var\(--[a-zA-Z0-9-]+\)|#(?:[0-9a-fA-F]{3,4}){1,2}|(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([\d\s.,%a-zA-Z()-]+\)|[a-zA-Z]+$/i,
      'Invalid CSS color value',
    )
    .optional(),
  iconName: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(50).optional(),

  intention: z.string().min(1),
  narrativeOpening: z.array(z.string().min(1)).min(1),
  oracleGuidance: OracleGuidanceSchema,
  reflectionJourney: z.array(StaticReflectionJourneyStepSchema).min(1),

  contemplationPrompts: z.array(z.string().min(1)),
  symbolism: z.array(z.string().min(1)),
  affirmation: z.string().min(1),
  narrativeClosing: z.array(z.string().min(1)).min(1),
});

/* ---------- compile-time shape check ------------ */
/**
 * If the inferred Zod type ever diverges from the hand-written
 * `TsFlameDayDefinition`, TypeScript will raise an error here.
 * This trick is compatible with TS 4.7+ and SWC.
 */
type _ZodMatchesTS = z.infer<typeof FlameDayDefinitionZ>;
type _CompileTimeAssert = _ZodMatchesTS & TsFlameDayDefinition;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertExactMatch: _CompileTimeAssert = {} as never;

/* ------------------------------------------------ */
export type FlameDayDefinition = TsFlameDayDefinition;
