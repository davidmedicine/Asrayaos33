/* ────────────────────────────────────────────────
 * src/__checks__/flameData.validate.ts
 * Compile-time validation of day-N.json files against FlameDayDefinition.
 * This file is intended for `tsc --noEmit` during CI/build steps.
 * It should be excluded from production bundles.
 *
 * Bundler Exclusions:
 * - Vite: Files in `__tests__` or `__checks__` are often excluded by default.
 *         If not, use /* @vite-ignore * / before problematic static imports.
 * - Webpack: Use /* webpackIgnore: true * / or configure `exclude` in webpack config.
 * - Next.js: Files outside special dirs are typically not bundled unless imported by bundled code.
 * - Rollup: Use `external` or a plugin if needed.
 * Alternatively, ensure this file is only included in a tsconfig used for type-checking.
 * Example: "include": ["src", "tests", "src/__checks__/*.validate.ts"] in tsconfig.typecheck.json
 * ────────────────────────────────────────────────*/

// TODO: Remove the three @ts-expect-error lines below once actual JSON files are in place
// and the import paths are correctly resolved for your type-checking environment.
// These are added temporarily to allow the TypeScript code to be valid for generation purposes.

import type { FlameDayDefinition } from '../lib/core/FirstFlame';

// Using static, explicit imports as template string imports are not supported by tsc for type analysis.
// ADJUST PATHS to your JSON files relative to THIS FILE's location for `tsc --noEmit`.
// Example assumes `_shared` is two levels up from `src/__checks__/`
// /* @vite-ignore */ /* webpackIgnore: true */
// @ts-expect-error - Placeholder until JSON path is confirmed for TSC context
import day1JsonData from '../../../_shared/5dayquest/day-1.json' with { type: 'json' };
// /* @vite-ignore */ /* webpackIgnore: true */
// @ts-expect-error - Placeholder
import day2JsonData from '../../../_shared/5dayquest/day-2.json' with { type: 'json' };
// /* @vite-ignore */ /* webpackIgnore: true */
// @ts-expect-error - Placeholder
import day3JsonData from '../../../_shared/5dayquest/day-3.json' with { type: 'json' };
// Add day4JsonData and day5JsonData similarly

// These constants are not exported and are for compile-time checks only.
// The /*#__PURE__*/ annotation hints to aggressive minifiers/bundlers.
/*#__PURE__*/
const _day1Validation = day1JsonData satisfies FlameDayDefinition;
/*#__PURE__*/
const _day2Validation = day2JsonData satisfies FlameDayDefinition;
/*#__PURE__*/
const _day3Validation = day3JsonData satisfies FlameDayDefinition;
// Add _day4Validation and _day5Validation