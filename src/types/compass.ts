/**
 * @file src/types/compass.ts
 * @description Defines core types, constants, and validation schemas for the Compass D-Pad navigation system.
 * Establishes a single source of truth for directions and provides runtime safety mechanisms.
 */

import { z } from 'zod'; // Assuming Zod is installed: npm install zod

// --- Single Source of Truth for Directions ---

/**
 * The canonical list of compass directions including the center point.
 * Defined as a `const` tuple to ensure order and literal types.
 * THIS IS THE SINGLE SOURCE OF TRUTH for all direction-related types and constants.
 * @readonly
 */
export const COMPASS_DIRS = ['north', 'east', 'south', 'west', 'center'] as const;

// --- Derived Types and Constants ---

/**
 * Represents the possible navigation directions or the central action point.
 * DERIVED directly from `COMPASS_DIRS` to prevent type drift.
 * 'north' | 'east' | 'south' | 'west' | 'center'
 */
export type CompassDir = typeof COMPASS_DIRS[number];

/**
 * Defines the standard focus traversal order for keyboard navigation (e.g., Arrow Keys)
 * within the Compass D-Pad component, crucial for accessibility (WCAG 2.1.1).
 * DERIVED from `COMPASS_DIRS` to ensure consistency. If a different specific order is
 * strictly required, define it separately but ensure it only contains `CompassDir` elements.
 * Exported as a readonly array to prevent accidental mutation.
 * @readonly
 */
export const DPAD_FOCUS_ORDER = [...COMPASS_DIRS] as const;

/**
 * A Set containing all valid `CompassDir` values for efficient O(1) lookups.
 * Used internally by the `isCompassDir` type guard. Initialized once at module scope.
 * @internal
 */
const COMPASS_DIR_SET = new Set(COMPASS_DIRS);

// --- Type Guard for Compile-time and Runtime Checks ---

/**
 * Type guard function to safely check if an unknown value is a valid `CompassDir`.
 * Uses an efficient Set lookup (O(1)). Essential for validating data from
 * external sources (e.g., URL parameters, API responses, CMS data).
 *
 * @param value - The value to check.
 * @returns `true` if the value is a valid `CompassDir` string, `false` otherwise.
 *
 * @example
 * const directionParam = urlSearchParams.get('direction');
 * if (isCompassDir(directionParam)) {
 * // TypeScript now knows `directionParam` is of type `CompassDir`
 * navigateToDirection(directionParam);
 * } else {
 * // Handle invalid input
 * console.warn('Invalid direction received:', directionParam);
 * }
 */
export function isCompassDir(value: unknown): value is CompassDir {
  return typeof value === 'string' && COMPASS_DIR_SET.has(value);
}

// --- Associated Data Structures & Interfaces ---

/**
 * Represents the routing information associated with a specific compass direction (`CompassDir`).
 * Used within a `RouteRegistry` to map directions to navigation targets and metadata.
 */
export interface RouteInfo {
  /**
   * The application-internal URL path for navigation.
   * Strongly recommend using typed routes if available (e.g., Next.js App Router helpers).
   * Example: '/map/sector/north'
   */
  path: string; // Consider using a template literal type if paths follow a strict pattern

  /**
   * Human-readable name/title for the destination. Used for UI labels, titles, ARIA attributes.
   * Example: 'Northern Sector Command'
   */
  name: string;

  /**
   * Optional: A brief description for UI previews, tooltips, or metadata.
   * Consider defaulting to an empty string or omitting if not used.
   */
  description?: string;

  /**
   * Optional: Identifier for an icon associated with this direction/destination.
   * SHOULD correspond to a key in your icon registry or sprite sheet system.
   * Example: 'arrow-up', 'map-pin-north'
   * @todo Define and link to the actual icon registry system being used.
   */
  iconId?: string; // Or potentially: iconComponent?: React.ComponentType<{ className?: string }>;
}

/**
 * Defines the structure for the complete registry mapping EACH `CompassDir`
 * to its corresponding `RouteInfo`.
 * Using `Record` ensures all directions *must* have an entry at compile time
 * when used with `satisfies`.
 */
export type RouteRegistry = Record<CompassDir, RouteInfo>;

/**
 * RECOMMENDED USAGE for defining the actual routes constant:
 * Use `satisfies RouteRegistry` to ensure the constant adheres to the type
 * *and* that all `CompassDir` keys are present, without losing specific literal types.
 *
 * @example
 * // In your constants file (e.g., src/config/routes.ts)
 * import type { RouteRegistry, RouteInfo } from '@/types/compass';
 *
 * const defaultRouteProps: Partial<RouteInfo> = {
 * description: 'Default description', // Example of providing defaults
 * };
 *
 * export const COMPASS_ROUTES = {
 * north: { ...defaultRouteProps, path: '/north', name: 'North Sector', iconId: 'arrow-up' },
 * east:  { ...defaultRouteProps, path: '/east',  name: 'East Sector',  iconId: 'arrow-right' },
 * south: { ...defaultRouteProps, path: '/south', name: 'South Sector', iconId: 'arrow-down' },
 * west:  { ...defaultRouteProps, path: '/west',  name: 'West Sector',  iconId: 'arrow-left' },
 * center:{ ...defaultRouteProps, path: '/center',name: 'Central Hub',  iconId: 'crosshair' },
 * } as const satisfies RouteRegistry; // Ensures all CompassDir keys exist
 *
 */

/**
 * Configuration details for rendering a single button/element within the Compass D-Pad UI.
 */
export interface DPadItemConfig {
  /** The specific `CompassDir` this UI element represents. */
  id: CompassDir;

  /** Accessible name for the button (used for `aria-label`). Crucial for WCAG 4.1.2. */
  label: string;

  /**
   * Identifier for the icon to display. MUST correspond to a key in your icon system (e.g., sprite sheet ID, component name).
   * Avoids bundle bloat and allows tree-shaking compared to raw SVG strings.
   * @todo Finalize and implement the icon registry/system. Replace placeholder references.
   * @example 'icon-arrow-north', 'ChevronUpIcon'
   */
  iconId: string;

  /** CSS `grid-area` value for positioning in the D-Pad grid layout. Example: '1 / 2 / 2 / 3' */
  gridArea: string;

  /**
   * Optional: Specifies the rotation degree for the icon/button, typically for directional arrows.
   * Use this value to dynamically apply Tailwind classes like `rotate-[${rotationDeg}deg]`.
   */
  rotationDeg?: 0 | 90 | 180 | 270;

  /** Optional: Indicates if this direction/button should be disabled. Defaults to `false`. */
  disabled?: boolean;
}

// --- Runtime Validation Schema (Zod) ---

/**
 * Zod schema for validating a single `CompassDir` string at runtime.
 * Useful for parsing data from external sources (URL params, API, localStorage, CMS).
 */
export const CompassDirSchema = z.enum(COMPASS_DIRS);

/**
 * Zod schema for validating the structure of `RouteInfo` objects at runtime.
 * Ensures data fetched from external sources conforms to the expected shape.
 */
export const RouteInfoSchema = z.object({
  path: z.string().min(1), // Ensure path is a non-empty string
  name: z.string().min(1), // Ensure name is a non-empty string
  description: z.string().optional(),
  iconId: z.string().optional(),
  // Add validation for other RouteInfo fields as needed
});

/**
 * Zod schema for validating the entire `RouteRegistry` structure at runtime.
 * Ensures that an object received from an external source is a complete
 * mapping from every `CompassDir` to a valid `RouteInfo`.
 */
export const RouteRegistrySchema = z.object({
  north: RouteInfoSchema,
  east: RouteInfoSchema,
  south: RouteInfoSchema,
  west: RouteInfoSchema,
  center: RouteInfoSchema,
}).strict(); // Use `.strict()` to fail if extra keys are present

/**
 * RECOMMENDED USAGE for runtime validation:
 * Parse any untrusted data (e.g., from CMS, localStorage, API) using these schemas
 * before using it in your application logic, especially before navigation or rendering.
 *
 * @example
 * import { RouteRegistrySchema, isCompassDir } from '@/types/compass';
 * import { invariant } from '@/utils/invariant'; // Assuming an invariant function exists
 *
 * function navigateFromUntrustedSource(direction: unknown, routeDataFromCMS: unknown) {
 * // 1. Validate the direction itself
 * invariant(isCompassDir(direction), `Invalid direction provided: ${direction}`);
 *
 * // 2. Validate the potentially incomplete/incorrect route data
 * const parseResult = RouteRegistrySchema.safeParse(routeDataFromCMS);
 * if (!parseResult.success) {
 * console.error("Invalid route registry data:", parseResult.error);
 * // Handle error: show fallback UI, log error, etc.
 * return;
 * }
 * const validatedRoutes = parseResult.data;
 *
 * // 3. Now safely use the validated data
 * const routeInfo = validatedRoutes[direction];
 * router.push(routeInfo.path);
 * }
 */

// --- End of File ---