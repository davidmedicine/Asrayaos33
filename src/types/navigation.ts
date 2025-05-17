import { z } from 'zod';

// ==========================================================================
// Phase 1: Core Constants & Foundational Types
// ==========================================================================

/**
 * ASSUMPTION: An IconRegistry maps string keys to icon components/data.
 * It MUST exist elsewhere and use 'as const' for type safety and enabling
 * literal type inference for IconKey.
 * VERIFICATION (Feedback 1.1, 1.2): 'as const' prevents type widening and is
 * preferred over 'const enum' due to better compatibility with modern build
 * tools (esbuild, webpack) regarding tree-shaking and HMR.
 * SOURCE (const enum issues): GitHub - evanw/esbuild#1289, GitHub - webpack/webpack#13838 (Illustrative examples)
 * FUTURE (TS 5.4+): Consider `satisfies Record<string, IconComponentType>` for compile-time exhaustiveness without widening.
 * SOURCE (satisfies): Microsoft DevBlogs - Announcing TypeScript 5.0 (or relevant newer TS docs)
 *
 * @example
 * // In a separate file (e.g., iconRegistry.ts)
 * // import { HomeIcon, SettingsIcon, UserIcon, ... } from './icons'; // Actual icon components
 * // export const IconRegistry = {
 * // 'home': HomeIcon,
 * // 'settings': SettingsIcon,
 * // // ... other icons
 * // } as const;
 * // export type IconComponentType = typeof IconRegistry[keyof typeof IconRegistry]; // Or a more specific type
 */
// Placeholder for demonstration: In a real app, IMPORT this from its definition file.
const IconRegistry = {
  'home': 'dummy-icon-home-component',
  'settings': 'dummy-icon-settings-component',
  'user': 'dummy-icon-user-component',
  'compass': 'dummy-icon-compass-component',
  'external-link': 'dummy-icon-external-component',
  'docs': 'dummy-icon-docs-component',
  'team': 'dummy-icon-team-component',
} as const;
// Consider Object.freeze() for runtime defense if mutations are a serious concern,
// though 'as const' already provides readonly properties.

/**
 * Type representing valid keys derived *directly* from the IconRegistry.
 * VERIFICATION (Feedback 1.2): This eliminates "stringly-typed" errors by leveraging
 * TypeScript's type system. It's the standard, recommended pattern.
 */
export type IconKey = keyof typeof IconRegistry;

/**
 * Represents cardinal directions using 'as const' for type safety and immutability.
 * VERIFICATION (Feedback 1.1): Confirmed 'as const' superiority over 'const enum'
 * for bundle size, HMR, and tree-shaking compatibility.
 */
export const COMPASS_KEYS = {
  NORTH: 'N',
  EAST: 'E',
  SOUTH: 'S',
  WEST: 'W',
} as const;
// Object.freeze(COMPASS_KEYS); // Optional: Add runtime immutability defense

/**
 * Literal union type representing the valid values of COMPASS_KEYS.
 * Ensures only defined compass directions are used, enforced at compile time.
 */
export type CompassKey = (typeof COMPASS_KEYS)[keyof typeof COMPASS_KEYS];


// ==========================================================================
// Phase 2: Path Definitions - Modelling, Validation & Interoperability
// ==========================================================================

// --- TypeScript Level Path Modelling ---

/**
 * Represents an internal application path structurally, enforcing it starts with '/'.
 * Provides basic compile-time guidance. Robust validation via Zod schema.
 * LIMITATION (Feedback 2.1): Complex RFC 3986 rules (e.g., segment encoding nuances)
 * or multi-param structures are not fully enforceable at the pure TS type level without
 * excessive complexity. Validation delegated to `InternalPathSchema`.
 */
export type InternalPathDefinition = `/${string}`;

/**
 * Represents a full, absolute external URL, starting with http:// or https://.
 * VERIFICATION (Feedback 3): Explicit type distinction is crucial for security handling
 * (rel="noopener noreferrer") in the rendering layer.
 */
export type ExternalUrl = `http://${string}` | `https://${string}`;

/**
 * Union type for any valid navigation target (internal or external).
 * Consuming components MUST use this type to determine rendering logic
 * (e.g., framework <Link> vs standard <a> tag with security attributes).
 */
export type NavigationTarget = InternalPathDefinition | ExternalUrl;

// --- Zod Schemas for Runtime Path Validation ---

/**
 * Zod schema validating internal paths according to RFC 3986 principles and specific constraints.
 * RULES:
 * 1. Must start with `/`.
 * 2. Must contain one or more segments separated by `/`.
 * 3. Segments allow Unicode letters (`\p{L}`), numbers (`\p{N}`), and RFC 3986 unreserved
 * characters (`-`, `.`, `_`, `~`) plus percent-encoded characters (`%`).
 * SOURCE (RFC 3986 Path): IETF Datatracker - RFC 3986 Section 3.3
 * SOURCE (Unreserved Chars): IETF Datatracker - RFC 3986 Section 2.3
 * 4. Optionally allows *exactly one* dynamic parameter segment (`:paramName`) at the *very end*.
 * 5. Parameter names allow Unicode letters, numbers, and underscore (`_`).
 *
 * LIMITATION / VERIFICATION (Feedback 2.1, 7, 8): This schema *intentionally* rejects:
 * - Paths with multiple dynamic parameters (e.g., `/teams/:teamId/users/:userId`).
 * - Paths with parameters not at the terminal position (e.g., `/resource/:id/details`).
 * - Empty paths or paths not starting with '/'.
 * If more complex routing patterns are needed, this regex MUST be replaced or supplemented,
 * potentially integrating `path-to-regexp` logic for parsing and validation.
 * SOURCE (path-to-regexp): GitHub - pillarjs/path-to-regexp
 *
 * Regex Breakdown (`u` flag enables Unicode property escapes like \p{L}):
 * `^`                      - Start of string anchor.
 * `\/`                     - Literal '/' character (start).
 * `([\p{L}\p{N}\-._~%]+)`  - Group 1: First path segment (required). Allows Unicode letters/numbers, unreserved chars, percent-encoding.
 * `( \/ [\p{L}\p{N}\-._~%]+ )*` - Group 2 (Repeated): Zero or more subsequent segments, each starting with '/' and containing allowed characters.
 * `( \/ : ([\p{L}\p{N}_]+) )?` - Group 3 (Optional): The dynamic parameter part.
 * `\/ :`                 - Matches literal '/:'.
 * `([\p{L}\p{N}_]+)`     - Group 4: Captures the parameter name (Unicode letters/numbers, underscore).
 * `$`                      - End of string anchor.
 */
const InternalPathSchema = z.string()
  .min(1, { message: "Internal path definition cannot be empty." }) // Basic non-empty check
  .regex(
    // Note: Double backslashes \\ are needed for escaping within a JS string literal.
    // The 'u' flag is critical for correct Unicode character class (\p{L}, \p{N}) matching.
    /^\/([\p{L}\p{N}\-._~%]+)(\/[\p{L}\p{N}\-._~%]+)*(\/:([\p{L}\p{N}_]+))?$/u,
    { message: "Invalid internal path format. Expected pattern like /segment, /segment/segment, /segment/:param, or /segment/segment/:param. Segments allow Unicode letters/numbers, - . _ ~ %. Params allow Unicode letters/numbers, _." }
  )
  // Refine step asserts the specific TypeScript type *after* successful regex validation.
  // This improves type inference for consumers of the validated data.
  .refine((path): path is InternalPathDefinition => true);

/**
 * Zod schema validating external URLs.
 * VERIFICATION (Feedback 3): Uses `z.url()` for general structural validity and a regex
 * for the mandatory `http://` or `https://` prefix, providing robust validation.
 */
const ExternalUrlSchema = z.string()
  .url({ message: "External URL must be a valid URL (e.g., https://example.com)." })
  // Explicitly enforce the required protocol prefix for security clarity.
  .regex(/^https?:\/\/.+/, { message: "External URL must start with http:// or https://." })
  // Refine step asserts the specific TypeScript type after successful validation.
  .refine((url): url is ExternalUrl => true);

/**
 * Zod schema validating that a navigation target is either a valid Internal Path
 * or a valid External URL. This is the primary schema to use for the `target` field.
 */
const NavigationTargetSchema = z.union([InternalPathSchema, ExternalUrlSchema]);

/**
 * Utility function for Next.js App Router compatibility.
 * Maps `:param` style paths (validated by `InternalPathSchema`) to Next.js
 * file-system based `[param]` style for use with `<Link href>`.
 * VERIFICATION (Feedback 2.2, 8): Directly addresses the syntax difference between
 * common path conventions and Next.js App Router dynamic segment naming.
 * SOURCE (Next.js Dynamic Routes): Next.js Docs - Dynamic Routes
 *
 * @param internalPath A validated internal path, potentially containing a single trailing `:param`.
 * @returns Path string suitable for Next.js `<Link>` component's `href` prop or file system routing.
 * Returns the original path if no parameter is found.
 */
export function mapPathToNextJs(internalPath: InternalPathDefinition): string {
    // Simple replacement for a single trailing parameter, aligned with InternalPathSchema's constraint.
    // If the schema were updated for multiple/complex params, this function would also need updating
    // potentially using a library like path-to-regexp for parsing and transformation.
    const nextJsPath = internalPath.replace(/\/:(.+)$/, '/[$1]');
    // Double-check: Ensure the replacement actually happened if a param was expected
    // This basic check prevents subtle errors if the regex match fails unexpectedly.
    if (internalPath.includes('/:') && nextJsPath === internalPath) {
         console.warn(`mapPathToNextJs: Path "${internalPath}" contained '/:' but was not transformed. Check path structure and regex.`);
    }
    return nextJsPath;
}


// ==========================================================================
// Phase 3: Core Navigation Item - Structure, Validation & Accessibility
// ==========================================================================

/**
 * Base interface defining the data structure for a single navigation item.
 * This serves as the TypeScript blueprint, enforced at runtime by NavItemSchema.
 */
export interface NavItemCore {
  /** Optional unique identifier (string). Useful for React keys, tracking, etc. */
  id?: string;

  /** User-facing text label. Required, non-empty string. */
  label: string;

  /**
   * Navigation target. Must be a validated `InternalPathDefinition` or `ExternalUrl`.
   * @see NavigationTarget
   * @see InternalPathSchema
   * @see ExternalUrlSchema
   *
   * SECURITY CRITICAL (Feedback 3): Rendering components MUST differentiate based on this value.
   * - If `target` is `ExternalUrl` (runtime check: `target.startsWith('http')`), render as:
   * `<a href={target} target="_blank" rel="noopener noreferrer">...</a>`
   * - The `rel="noopener noreferrer"` attribute combination is ESSENTIAL to mitigate security risks
   * like "tabnabbing" when opening external links in new tabs/windows.
   * VERIFICATION: While some modern browsers *may* implicitly add `noopener` to `target="_blank"`,
   * explicitly including both `noopener` and `noreferrer` ensures the strongest security posture
   * across different browsers and versions (defense-in-depth).
   * SOURCE (noopener): MDN Web Docs - rel=noopener
   * SOURCE (noreferrer): MDN Web Docs - rel=noreferrer
   * SOURCE (Browser defaults discussion): Chrome for Developers - Links to cross-origin destinations are unsafe
   */
  target: NavigationTarget;

  /**
   * Key referencing an icon within the centrally defined `IconRegistry`.
   * MUST be one of the literal keys defined by `IconKey`.
   * @see IconKey
   * @see IconRegistry
   * DX / MAINTAINABILITY (Feedback 1.2, 6, 7): A Continuous Integration (CI) check script
   * (`scripts/check-nav-icons.js` example provided later) is STRONGLY RECOMMENDED. This script
   * should verify at build time that every `icon` key used in the navigation configuration
   * actually exists as a key in the `IconRegistry`. This prevents runtime errors caused by
   * typos, refactoring, or removing icons from the registry.
   */
  icon: IconKey;

  /**
   * Controls if the navigation item is interactive. Defaults to `true`.
   * Can be a static boolean or a function returning a boolean for dynamic enabling/disabling.
   *
   * ACCESSIBILITY CRITICAL (Feedback 4, 8): Rendering components MUST implement specific ARIA attributes
   * when `enabled` evaluates to `false`:
   * 1. Add `aria-disabled="true"` to the interactive element (e.g., the `<a>` or `<button>`).
   * This signals the disabled state to assistive technologies (AT).
   * 2. Add `tabIndex={-1}` to the same element. This removes the disabled item from the
   * default keyboard navigation sequence (Tab order).
   * Both attributes are required for proper accessible implementation of disabled controls.
   * Simply applying visual styles (like graying out) or removing the `href` is INSUFFICIENT.
   * SOURCE (aria-disabled): MDN Web Docs - aria-disabled
   * SOURCE (WAI-ARIA Practices - Disabled state): W3C WAI-ARIA Authoring Practices 1.1 - Disabled Controls
   * SOURCE (Focus Management): Smashing Magazine - Designing Accessible Navigation (Discusses focus order)
   * CONSIDERATION: For complex interactive widgets (like tree menus), managing focus correctly for
   * disabled items might require additional ARIA attributes or logic (e.g., `aria-hidden` or specific
   * keyboard interaction patterns), but `aria-disabled` and `tabIndex="-1"` are the foundational requirements.
   */
  enabled?: boolean | (() => boolean);

  /** Optional associated compass direction, validated against `CompassKey`. */
  compassDirection?: CompassKey;

  /**
   * Optional array of nested `NavItemCore` objects, allowing for hierarchical menus (submenus).
   * The structure is recursive.
   */
  items?: NavItemCore[];
}

/**
 * Zod schema providing runtime validation for the `NavItemCore` interface.
 * Uses `z.lazy` to correctly handle the recursive `items` property.
 * VERIFICATION (Feedback 5): `z.lazy` is the canonical and recommended Zod pattern for defining
 * schemas for recursive data structures like trees or nested lists.
 * SOURCE (Zod recursive types): Zod Documentation - Recursive Types
 *
 * PERFORMANCE CONSIDERATIONS (Feedback 5, 8): Validating deeply nested structures (e.g., many levels of `items`)
 * using `z.lazy` can potentially impact performance, especially if performed frequently on the client-side
 * during runtime (e.g., on every render).
 * MITIGATION STRATEGIES:
 * - **CI/Build-Time Validation:** Perform full, strict validation using `NavItemSchema.parse()` primarily
 * during Continuous Integration (CI) or build steps to catch errors early.
 * - **Runtime `safeParse`:** If runtime checks are needed, consider using the less throwing
 * `NavItemSchema.safeParse()` and checking the `.success` property.
 * - **Conditional Validation:** Skip runtime validation in production builds (`if (process.env.NODE_ENV !== 'production')`)
 * if build-time checks provide sufficient confidence.
 * - **Benchmarking:** Measure the parsing time with realistic data depth if performance becomes a noticeable issue.
 * SOURCE (Zod performance discussions): General discussions can be found in Zod's GitHub issues/discussions,
 * often comparing trade-offs with other validation libraries like io-ts, Yup. Example: GitHub - colinhacks/zod#538
 */
export const NavItemSchema: z.ZodType<NavItemCore> = z.lazy(() => // z.lazy enables recursion
  z.object({
    id: z.string().optional(),
    label: z.string().min(1, { message: "Navigation item label cannot be empty." }),

    // Use the unified NavigationTargetSchema to validate the target field.
    target: NavigationTargetSchema,

    // Validate the icon key against the *runtime* IconRegistry.
    // VERIFICATION (Feedback 1.2): Uses z.custom for runtime validation. This complements
    // the compile-time IconKey type and the recommended CI script for defense-in-depth.
    // Assumes IconRegistry is available in the scope where validation occurs.
    icon: z.custom<IconKey>(
      (val): val is IconKey => typeof val === 'string' && Object.prototype.hasOwnProperty.call(IconRegistry, val),
      {
        message: `Invalid icon key provided. Must be one of the keys defined in IconRegistry: ${Object.keys(IconRegistry).join(', ')}`,
      }
    ),

    // Validate 'enabled' is boolean OR a function returning boolean. Default to true.
    // VERIFICATION (Feedback 4): Ensures the type is either a direct boolean or a
    // zero-argument function that resolves to a boolean.
    enabled: z.union([
      z.boolean(),
      z.function()
        .args() // Expects no arguments
        .returns(z.boolean()) // Must return a boolean
    ]).optional().default(true), // Default to enabled if omitted.

    // Validate compassDirection using z.enum derived from COMPASS_KEYS values.
    // VERIFICATION (Feedback 1.1, 7): Uses z.enum with Object.values for potential bundle size savings
    // over z.nativeEnum by avoiding the reverse mapping inclusion.
    // Requires explicit type assertion `as [CompassKey, ...CompassKey[]]` because Object.values
    // returns `string[]`, but z.enum needs a non-empty tuple/array literal type for inference.
    // SOURCE (z.enum vs z.nativeEnum bundle size): GitHub - colinhacks/zod discussion #1981 (Example)
    compassDirection: z.enum(Object.values(COMPASS_KEYS) as [CompassKey, ...CompassKey[]])
      .optional(),

    // Recursively validate 'items' as an optional array of NavItemSchema objects.
    items: z.array(NavItemSchema).optional(),
  })
);


// ==========================================================================
// Phase 4: Overall Navigation Configuration Structure
// ==========================================================================

/**
 * Defines the schema for the top-level navigation configuration, assuming it's
 * an array of `NavItemCore` items. Adjust this if your application uses a different
 * root structure (e.g., an object with named navigation groups).
 *
 * @example Alternate structure with named groups:
 * // export const NavGroupSchema = z.object({
 * //   title: z.string().optional(),
 * //   items: z.array(NavItemSchema).min(1),
 * // });
 * // export const NavigationConfigSchema = z.array(NavGroupSchema); // Or z.record(NavGroupSchema)
 */
export const NavigationConfigSchema = z.array(NavItemSchema);

/**
 * TypeScript type alias inferred directly from the `NavigationConfigSchema`.
 * Use this type for variables holding the validated navigation configuration data.
 */
export type NavigationConfig = z.infer<typeof NavigationConfigSchema>;


// ==========================================================================
// Phase 5: Developer Experience (DX) & Continuous Integration (CI) Tools
// ==========================================================================

/*
 * DX Recommendation 1: Synchronize Types & Schemas (`ts-to-zod`)
 * VERIFICATION (Feedback 6): Manually keeping TypeScript interfaces (`NavItemCore`) and Zod schemas
 * (`NavItemSchema`) perfectly synchronized is error-prone and tedious.
 * TOOL: Consider using `ts-to-zod` to automatically generate the Zod schema *from* the
 * TypeScript interface. This makes the interface the single source of truth.
 * INTEGRATION: This generation can be done manually, via a file watcher during development,
 * or automated as part of a pre-commit hook or CI step.
 * REPOSITORY: https://github.com/colinhacks/ts-to-zod
 * TRADE-OFF: Introduces a build-time dependency and potentially an extra step, but
 * significantly reduces the risk of schema drift and simplifies maintenance.
 */

/*
 * DX Recommendation 2: Implement CI Check for Icon Key Validity (`check-nav-icons`)
 * VERIFICATION (Feedback 1.2, 6, 7): Implement a script executed during your CI pipeline
 * (e.g., GitHub Actions, GitLab CI) to verify that all `icon` keys used within your actual
 * navigation data configuration file(s) are valid keys present in the `IconRegistry`.
 * RATIONALE: This catches errors (typos, icons removed from registry) *before* they reach
 * production, complementing the runtime Zod validation with build-time safety. This is
 * particularly valuable if the icon set is large, managed separately, or changes frequently.
 * PATTERN: This follows standard practices for configuration validation seen in complex systems
 * (e.g., validating route definitions against controllers, feature flags against implementation).
 *
 * --- Example CI Script Logic (`scripts/check-nav-icons.mjs` or `.ts`) ---
 *
 * // Adjust import paths based on your project structure
 * import { IconRegistry } from '../path/to/iconRegistry.js';
 * import { yourNavigationData } from '../path/to/your/navigationData.js'; // Load your defined nav array
 * import { NavigationConfigSchema } from '../path/to/navigationSchema.js'; // Import the schema
 * import { z } from 'zod'; // Import Zod for potential validation step
 *
 * function findAllIconKeysRecursive(items: unknown): string[] {
 * let keys: string[] = [];
 * if (!Array.isArray(items)) return keys; // Base case for recursion or invalid input
 *
 * for (const item of items) {
 * if (typeof item === 'object' && item !== null) {
 * // Check if the item has an 'icon' property and it's a string
 * if (typeof (item as any).icon === 'string') {
 * keys.push((item as any).icon);
 * }
 * // Recursively check sub-items if 'items' array exists
 * if (Array.isArray((item as any).items)) {
 * keys = keys.concat(findAllIconKeysRecursive((item as any).items));
 * }
 * }
 * }
 * return keys;
 * }
 *
 * console.log("🚀 Starting CI Check: Navigation Icon Validity...");
 *
 * try {
 * // Optional but recommended: First validate the overall structure
 * console.log("  Validating navigation data structure against schema...");
 * NavigationConfigSchema.parse(yourNavigationData); // Throws ZodError on failure
 * console.log("  ✅ Structure validation passed.");
 *
 * // Extract all used icon keys
 * const iconsUsed = new Set(findAllIconKeysRecursive(yourNavigationData));
 * const iconsAvailable = new Set(Object.keys(IconRegistry));
 *
 * console.log(`  Found ${iconsUsed.size} unique icon keys used in navigation config.`);
 * console.log(`  IconRegistry contains ${iconsAvailable.size} available icon keys.`);
 *
 * // Find keys used in config but not present in the registry
 * const missingIcons = [...iconsUsed].filter(icon => !iconsAvailable.has(icon));
 *
 * if (missingIcons.length > 0) {
 * console.error("\n❌ CI Check Failed: The following icon keys are used in the navigation configuration but are NOT defined in IconRegistry!");
 * console.error(`   Missing Icons: ${missingIcons.join(', ')}`);
 * // Optional: Log available keys for easier debugging in CI logs
 * // console.log(`   Available Icons in Registry: ${[...iconsAvailable].join(', ')}`);
 * process.exit(1); // Indicate failure to the CI runner
 * } else {
 * console.log("\n✅ CI Check Passed: All navigation icon keys are valid and present in IconRegistry.");
 * process.exit(0); // Indicate success
 * }
 *
 * } catch (error) {
 * console.error("\n❌ CI Check Failed: An error occurred during validation.");
 * if (error instanceof z.ZodError) {
 * console.error("  Reason: Navigation data failed Zod schema validation.");
 * // Provide formatted Zod errors for easier debugging
 * console.error(JSON.stringify(error.format(), null, 2));
 * } else {
 * // Log unexpected errors
 * console.error("  Unexpected Error:", error);
 * }
 * process.exit(1); // Indicate failure
 * }
 * --- End Example Script ---
 *
 * Add this script to your `package.json` (e.g., `"scripts": { "check:nav-icons": "node ./scripts/check-nav-icons.mjs" }`)
 * and ensure it runs as part of your CI pipeline (e.g., in a test or lint stage).
 */


// ==========================================================================
// Phase 6: Integration & Rendering Considerations
// ==========================================================================

/*
 * Integration Note 1: Next.js App Router Path Handling
 * VERIFICATION (Feedback 2.2, 8): The `InternalPathSchema` validates paths using the `:param` convention.
 * When rendering links using Next.js's `<Link>` component within the App Router, you MUST
 * transform these paths to the `[param]` convention expected by Next.js file-system routing.
 * ACTION: Use the provided `mapPathToNextJs(item.target as InternalPathDefinition)` utility
 * function within the `href` prop of your `<Link>` components for internal routes.
 * EXAMPLE: `<Link href={mapPathToNextJs(navItem.target as InternalPathDefinition)}>...</Link>`
 */

/*
 * Integration Note 2: Critical Rendering Logic Checklist
 * The component(s) responsible for rendering navigation based on `NavItemCore` data MUST adhere
 * to the following logic to ensure security and accessibility:
 *
 * 1. Differentiate Target Types:
 * - Check `if (item.target.startsWith('http'))` (or use `ExternalUrlSchema.safeParse`).
 * - If TRUE (External): Render using a standard `<a>` tag.
 * - If FALSE (Internal): Render using your framework's link component (e.g., Next.js `<Link>`).
 *
 * 2. Apply Security Attributes for External Links:
 * - For `<a>` tags rendering external URLs, ALWAYS include `target="_blank"` and
 * `rel="noopener noreferrer"`.
 * VERIFICATION (Feedback 3): Crucial for security.
 *
 * 3. Handle Internal Links Correctly:
 * - For internal links rendered with `<Link>`, pass the transformed path using `mapPathToNextJs`
 * to the `href` prop.
 * VERIFICATION (Feedback 2.2): Necessary for Next.js compatibility.
 *
 * 4. Implement Accessibility for Disabled Items:
 * - Evaluate the `enabled` property (if it's a function, call it: `const isEnabled = typeof item.enabled === 'function' ? item.enabled() : item.enabled;`).
 * - If `isEnabled` is `false`:
 * - Apply visual styling to indicate disabled state (e.g., CSS `opacity`, `pointer-events: none`, specific class).
 * - Add the ARIA attribute `aria-disabled="true"` to the rendered link/button element.
 * - Add the `tabIndex={-1}` attribute to remove it from keyboard focus order.
 * VERIFICATION (Feedback 4): Essential for accessibility compliance.
 */

/*
 * Pitfall Reminder & Mitigation: Multi-Parameter Route Limitation
 * VERIFICATION (Feedback 2.1, 7, 8): The current `InternalPathSchema` is intentionally strict and only supports
 * an optional, single dynamic parameter at the very end of the path.
 * ACTION: If your application requires more complex routing patterns (e.g., `/teams/:teamId/members/:memberId`),
 * you MUST update the `InternalPathSchema` regex. This likely requires a more robust approach, potentially
 * incorporating logic similar to `path-to-regexp` for parsing and validation within a `z.custom` or `z.transform`.
 * Document this limitation clearly if it remains.
 */

/*
 * Pitfall Reminder & Mitigation: Asynchronous Enablement Flags
 * VERIFICATION (Feedback 7, 8): The current `enabled` field schema supports only synchronous boolean values or
 * functions returning booleans.
 * ACTION: If item enablement depends on asynchronous operations (e.g., fetching user permissions, checking
 * feature flags from an API), the schema and consuming logic need significant extension. Options include:
 * - Modifying the schema to allow `Promise<boolean>` and handling the async resolution in the rendering component (complex state management).
 * - Pre-fetching permissions/flags and storing them in a synchronous state accessible by the `enabled` function.
 * - Handling enablement entirely within the rendering component's state logic, potentially simplifying the schema `enabled` field back to just boolean | undefined.
 * Choose the approach that best fits your application's architecture and state management patterns.
 */


// ==========================================================================
// Phase 7: Example Usage & Runtime Validation Demonstration
// ==========================================================================

// Example raw navigation data (typed as `unknown` to simulate data from an external source like API or JSON file)
const myNavigationData: unknown = [
  {
    id: 'home-dash',
    label: 'Dashboard',
    target: '/dashboard', // Valid internal path
    icon: 'home',
    // 'enabled' omitted -> defaults to true via Zod schema
  },
  {
    id: 'settings-main',
    label: 'Settings',
    target: '/settings', // Valid internal path (parent)
    icon: 'settings',
    items: [
      { id: 'set-acc', label: 'Account', target: '/settings/account', icon: 'user' },
      { id: 'set-pref', label: 'Preferences', target: '/settings/preferences', icon: 'settings', compassDirection: COMPASS_KEYS.EAST },
      {
        id: 'set-team',
        label: 'Team Management',
        target: '/settings/teams/:teamId', // Valid: single dynamic param at end
        icon: 'team',
        enabled: false, // Example explicitly disabled item
      }
    ]
  },
  {
    id: 'usr-prof',
    label: 'My Profile',
    target: '/user/:userId', // Valid: single dynamic param at end
    icon: 'user',
    compassDirection: COMPASS_KEYS.NORTH,
  },
  {
    id: 'ext-docs',
    label: 'Documentation Site',
    target: 'https://docs.example.com/v2/guide', // Valid external URL
    icon: 'docs', // Assumes 'docs' key exists in IconRegistry
  },
  {
    id: 'cond-feat',
    label: 'Conditional Feature',
    target: '/experimental/feature-abc',
    icon: 'compass',
    enabled: () => typeof window !== 'undefined' && window.location.hostname === 'localhost', // Example dynamic enabled function
  },
  // --- Examples of Data That Would FAIL Validation ---
  // {
  //   id: 'fail-multi-param', label: 'Multi Param',
  //   target: '/teams/:teamId/users/:userId', // INVALID: Schema rejects multiple params
  //   icon: 'team',
  // },
  // {
  //   id: 'fail-param-middle', label: 'Param Mid Path',
  //   target: '/resource/:id/details', // INVALID: Schema rejects param not at the end
  //   icon: 'settings',
  // },
  // {
  //   id: 'fail-no-slash', label: 'No Leading Slash',
  //   target: 'dashboard', // INVALID: Internal paths must start with /
  //   icon: 'home',
  // },
  // {
  //   id: 'fail-bad-icon', label: 'Bad Icon Key', target: '/validpath',
  //   icon: 'non-existent-icon-key', // INVALID: Key not in IconRegistry
  // },
  // {
  //   id: 'fail-bad-url', label: 'Bad External URL',
  //   target: 'www.example.com', // INVALID: Missing protocol (http/https)
  //   icon: 'external-link',
  // },
  // {
  //   id: 'fail-empty-label',
  //   // label: '', // INVALID: Label cannot be empty (min(1))
  //   target: '/somewhere', icon: 'home',
  // },
  // {
  //   id: 'fail-bad-compass', label: 'Invalid Compass', target: '/compass-test', icon: 'compass',
  //   compassDirection: 'NE', // INVALID: 'NE' not in COMPASS_KEYS values
  // }
];

// --- Runtime Validation Execution ---
console.log("\n--- Running Navigation Configuration Validation ---");
try {
  // Use .parse() which throws an error on validation failure
  const validatedNavConfig: NavigationConfig = NavigationConfigSchema.parse(myNavigationData);

  console.log("✅ SUCCESS: Navigation configuration passed validation!");

  // Optional: Log the validated structure (useful for debugging)
  // console.log("\nValidated Config Structure:", JSON.stringify(validatedNavConfig, null, 2));

  // --- Example: Process validated data safely ---
  console.log("\n--- Processing Validated Navigation Items ---");
  validatedNavConfig.forEach(item => {
    processValidatedNavItem(item); // Process top-level items
    if (item.items) {
      item.items.forEach(subItem => processValidatedNavItem(subItem, "  ")); // Process sub-items
    }
  });

} catch (error) {
  // Catch ZodError specifically for detailed validation messages
  if (error instanceof z.ZodError) {
    console.error("❌ ERROR: Navigation configuration validation failed.");
    // .format() provides a user-friendly error structure
    console.error("Validation Issues:", JSON.stringify(error.format(), null, 2));
  } else {
    // Catch any other unexpected errors during parsing
    console.error("\n❌ An unexpected error occurred during validation:", error);
  }
  console.log("\n--- Validation Halted ---");
  // In a real application: Fallback logic, error reporting, prevent rendering bad nav, etc.
}

/** Helper function to demonstrate processing validated items */
function processValidatedNavItem(item: NavItemCore, indent: string = "") {
    console.log(`${indent}Processing Item: ${item.label} (ID: ${item.id ?? 'N/A'})`);
    console.log(`${indent}  Icon: ${item.icon}`);
    const isEnabled = typeof item.enabled === 'function' ? item.enabled() : item.enabled;
    console.log(`${indent}  Enabled: ${isEnabled}`);
    console.log(`${indent}  Target: ${item.target}`);

    // Demonstrate rendering hints based on validated target type
    if (ExternalUrlSchema.safeParse(item.target).success) {
        console.log(`${indent}  ➡️ Render Hint: External Link (use <a> with target='_blank' rel='noopener noreferrer')`);
    } else {
        // Type assertion is safe here because if it's not external, it must be internal due to NavigationTargetSchema union
        const nextJsHref = mapPathToNextJs(item.target as InternalPathDefinition);
        console.log(`${indent}  ➡️ Render Hint: Internal Link (use <Link href='${nextJsHref}'>)`);
    }

    // Accessibility hint for disabled items
    if (!isEnabled) {
        console.log(`${indent}  ♿️ Accessibility Hint: Item is disabled. Render with aria-disabled='true' and tabIndex='-1'.`);
    }

    if (item.compassDirection) {
        console.log(`${indent}  🧭 Compass: ${item.compassDirection}`);
    }
}