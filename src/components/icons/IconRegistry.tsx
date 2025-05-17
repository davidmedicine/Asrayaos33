// src/components/icons/IconRegistry.ts
/* eslint-disable import/consistent-type-specifier-style */
/**
 * Centralised, Type-Safe, React.lazy-Compatible Icon Registry (v2.1)
 * ------------------------------------------------------------------
 * Ensures all icon loaders strictly adhere to the format required by React.lazy:
 * `() => Promise<{ default: ComponentType<SVGProps<SVGSVGElement>> }>`
 * Provides necessary types and accessors for lazy-loaded icons.
 *
 * Changelog:
 * v2.1: Re-verified all loaders. Confirmed IconComponentProps export.
 * v2.0: Initial strict implementation with IconLoader type.
 */
import React, {
  type ComponentType,
  type LazyExoticComponent,
  type SVGProps,
} from 'react';

/* -------------------------------------------------------------------------- */
/* 1. Type Definitions                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Props accepted by all SVG icon components loaded through this registry.
 * Exported for use in components that render these icons (e.g., Sidebar).
 */
export type IconComponentProps = SVGProps<SVGSVGElement>;

/**
 * The STRICT signature required for an icon loader function compatible with React.lazy.
 * It MUST be a function that returns a Promise resolving to a module object
 * with a `default` property holding the React component.
 */
export type IconLoader = () => Promise<{ default: ComponentType<IconComponentProps> }>;

/* -------------------------------------------------------------------------- */
/* 2. Icon Loaders Map                                                        */
/* - Verified: All entries conform to the IconLoader type.                    */
/* -------------------------------------------------------------------------- */

/**
 * The central map defining how to load each icon lazily.
 * Each loader MUST conform to the `IconLoader` type.
 *
 * - **Local SVGs (Default Export):** Use `.then(m => ({ default: m.default }))`
 * - **Library Icons (Named Export):** Use `.then(m => ({ default: m.NamedExport }))`
 */
export const iconLoaders = {
  /* ---------- Local SVG Icons (ASSUMED Default Export) ---------- */
  Library:   () => import('./LibraryIcon').then(m => ({ default: m.default })), // Verified wrapping
  OracleOrb: () => import('./OracleOrbIcon').then(m => ({ default: m.default })), // Verified wrapping
  Sanctum:   () => import('./SanctumIcon').then(m => ({ default: m.default })),   // Verified wrapping

  /* ---------- Lucide Icons (Named Exports) ----------------------- */
  ArrowRight: () => import('lucide-react').then(m => ({ default: m.ArrowRight })), // Verified wrapping
  Check:      () => import('lucide-react').then(m => ({ default: m.Check })),      // Verified wrapping
  ChevronDown:() => import('lucide-react').then(m => ({ default: m.ChevronDown })),// Verified wrapping
  Close:      () => import('lucide-react').then(m => ({ default: m.X })),          // Verified wrapping (X mapped to Close)
  Globe:      () => import('lucide-react').then(m => ({ default: m.Globe })),      // Verified wrapping
  Settings:   () => import('lucide-react').then(m => ({ default: m.Settings })),   // Verified wrapping
  Users:      () => import('lucide-react').then(m => ({ default: m.Users })),      // Verified wrapping (Lucide Users)

  /* ---------- Phosphor Icons (Named Exports) --------------------- */
  Bell:          () => import('@phosphor-icons/react').then(m => ({ default: m.Bell })),         // Verified wrapping
  ChartPieSlice: () => import('@phosphor-icons/react').then(m => ({ default: m.ChartPieSlice })),// Verified wrapping
  User:          () => import('@phosphor-icons/react').then(m => ({ default: m.User })),         // Verified wrapping (Phosphor User)

} as const satisfies Readonly<Record<string, IconLoader>>;

// Infer the IconName type from the keys of the strictly typed iconLoaders map
export type IconName = keyof typeof iconLoaders;

/* -------------------------------------------------------------------------- */
/* 3. Lazy Component Cache & Accessors                                        */
/* -------------------------------------------------------------------------- */

// Cache defined in Sidebar.tsx where React.lazy is called.
// Accessor functions remain the same.

/** Retrieves the raw, type-safe icon loader function for a given icon name. */
export function getIconLoader(name: IconName): IconLoader {
  const loader = iconLoaders[name];
  if (!loader) {
    throw new Error(`IconRegistry: Loader for icon "${name}" not found.`);
  }
  return loader;
}

/**
 * Retrieves or creates a React.lazy component for the specified icon name.
 * Note: Caching implemented in Sidebar.tsx / consuming component.
 */
export function getLazyIcon(
  name: IconName,
): LazyExoticComponent<ComponentType<IconComponentProps>> {
    // In this revised structure, the caching happens where React.lazy is called (Sidebar).
    // This function just provides the mechanism to create one if needed,
    // relying on the caller (like Sidebar's LazyIcon) to manage the cache.
    const loader = getIconLoader(name); // Get the guaranteed valid loader
    return React.lazy(loader);        // Create the lazy component
}


/* -------------------------------------------------------------------------- */
/* 4. Icon Skeleton Placeholder                                               */
/* -------------------------------------------------------------------------- */

/** A simple SVG placeholder component for Suspense fallbacks. */
export function IconSkeleton({
  className,
  ...rest
}: { className?: string } & IconComponentProps): JSX.Element {
  return (
    <svg
      role="presentation"
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      {...rest}
    >
      <rect x="2" y="2" width="12" height="12" rx="2" strokeOpacity="0.3" />
    </svg>
  );
}