// === File: src/config/themes.ts ===

/**
 * Theme Configuration for Asraya OS
 *
 * Defines the available agent themes (corresponding to agent IDs) and the
 * default theme used throughout the application. This ensures consistency
 * between server-side rendering (RootLayout), client-side providers
 * (ThemeProviderClient), CSS definitions (global.css), and any components
 * that need to reference theme information.
 */

/**
 * A constant array containing all valid theme identifiers used in the application.
 * These typically correspond directly to the `AsrayaAgentId` type.
 *
 * Declared with `as const` which allows TypeScript to infer a precise
 * string literal union type (`'oracle' | 'muse' | ...`) rather than just `string[]`.
 * This enhances type safety when working with themes.
 */
export const VALID_THEMES = [
    'oracle',    // Wisdom, Insight, Default
    'muse',      // Creativity, Inspiration, Artistry
    'witness',   // Observation, Analysis, Neutrality
    'navigator', // Guidance, Planning, Strategy
    'scribe',    // Knowledge, Documentation, Recording
    'seeker',    // Exploration, Curiosity, Questioning
    'editor',    // Refinement, Clarity, Polishing
] as const; // <--- `as const` is crucial for deriving the specific type below

/**
 * A precise TypeScript type representing *only one* of the valid theme identifiers.
 * Derived automatically from the `VALID_THEMES` constant array.
 *
 * Use this `Theme` type for props, state variables, function parameters, etc.,
 * related to the theme to ensure only valid theme names are used.
 *
 * Example Usage:
 * ```typescript
 * function applySpecificTheme(themeName: Theme) {
 *   // ... logic that uses a valid theme name
 * }
 *
 * const currentAgentTheme: Theme = 'muse';
 * ```
 */
export type Theme = typeof VALID_THEMES[number];

/**
 * The default theme identifier to be used:
 * - For the initial server render in `RootLayout.tsx`.
 * - As a fallback in `ThemeProviderClient.tsx` if no valid theme cookie is found.
 * - As a fallback if an invalid theme is attempted to be set.
 *
 * This value **MUST** be one of the strings present in the `VALID_THEMES` array.
 * The `Theme` type annotation enforces this requirement at compile time.
 */
export const DEFAULT_THEME: Theme = 'oracle';


// --- Optional Enhancements (Consider adding later if needed) ---

/**
 * Optional: A mapping providing additional metadata for each theme.
 * This could be useful for displaying theme names nicely in UI selectors,
 * accessing associated primary colors programmatically, etc.
 */
/*
export const THEME_METADATA: Record<Theme, { displayName: string; description: string; }> = {
    oracle: { displayName: 'Oracle', description: 'Wisdom and Insight' },
    muse: { displayName: 'Muse', description: 'Creativity and Inspiration' },
    witness: { displayName: 'Witness', description: 'Observation and Neutrality' },
    navigator: { displayName: 'Navigator', description: 'Guidance and Strategy' },
    scribe: { displayName: 'Scribe', description: 'Knowledge and Documentation' },
    seeker: { displayName: 'Seeker', description: 'Exploration and Curiosity' },
    editor: { displayName: 'Editor', description: 'Refinement and Clarity' },
};
*/