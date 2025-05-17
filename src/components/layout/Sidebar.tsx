// src/components/layout/Sidebar.tsx
'use client';

/**
 * Responsive Sidebar – v3.4.1 (focusRing Fix)
 * ----------------------------------------------------------
 * • Fixes runtime TypeError by using `focusRing` as a string constant.
 * • Replaces all `focusRing()` calls with the `focusRing` constant.
 * • Ensures `focusRing` is correctly imported from classPrimitives.
 * • Keeps all other v3.4 improvements (strict types, IconLoader, etc.).
 *
 * Changelog:
 * v3.4.1: fix: use focusRing constant (string) not function.
 * v3.4: Correctly use `def.iconLoader`, import types, remove local types, replace placeholders.
 * v3.3: Typed lazyIconCache, added hydration comment.
 * v3.2: Rewritten for strict IconLoader, simplified LazyIcon.
 */

import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
  memo,
  ReactElement,
  ReactNode,
  ComponentType,
  LazyExoticComponent,
} from 'react';
import Link                         from 'next/link';
import { usePathname }              from 'next/navigation';
import { shallow }                  from 'zustand/shallow';
import { ErrorBoundary }            from 'react-error-boundary';
import { Settings as SettingsIcon, X as CloseIcon } from 'lucide-react'; // Keep static imports
import clsx                         from 'clsx'; // Import clsx if needed, though cn handles it

import { cn }                       from '@/lib/utils';
// CORRECT: Import focusRing as a constant (string)
import { focusRing }                from '@/lib/utils/classPrimitives';
import { useLayoutStore } from '@/lib/state/slices/layoutSlice';
import { getMainNavigationDefinitions } from '@/lib/core/layoutRegistry';
import type { CompassKey }          from '@/lib/core/layoutRegistry'; // Keep CompassKey if needed for reactKey
import {
    // Import STRICT types and components from the registry
    IconLoader,
    IconComponentProps,
    IconSkeleton,
} from '@/components/icons/IconRegistry';

// --- Constants ---
const ICON_SIZE = 20;
const ICON_STROKE = 1.75;
const ICON_SKELETON_FALLBACK = <IconSkeleton className="h-5 w-5 text-[var(--border-subtle)]" />;
const ICON_ERROR_CLS = 'h-5 w-5 rounded-sm bg-[var(--color-destructive-muted)] text-[var(--color-destructive-fg)] flex items-center justify-center';

// --- Icon Loading Infrastructure ---

// CORRECTLY TYPED Module-level cache using imported types.
const lazyIconCache = new Map<IconLoader, LazyExoticComponent<ComponentType<IconComponentProps>>>();

// Error Boundary Fallback: Rendered when an icon fails to load.
function IconErrorBoundaryFallback({ error }: { error: Error }) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Sidebar] Icon failed to load:', error);
  }
  // Simple inline SVG cross as fallback
  return (
    <div title={`Icon Error: ${error.message}`} className={ICON_ERROR_CLS}>
      <svg aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
  );
}

/**
 * Lazy Icon Component (Uses Imported Types)
 * -----------------------------------------
 * Takes a valid `IconLoader` function and renders the icon using
 * React.lazy, Suspense, and an ErrorBoundary. Memoized for performance.
 */
const LazyIcon = memo(({
  load, // The loader function adhering to the imported IconLoader type
  ...props // Pass down standard IconComponentProps from Registry
}: {
  load: IconLoader;
} & IconComponentProps) => { // Use IconComponentProps from Registry
  let IconComponent = lazyIconCache.get(load);

  if (!IconComponent) {
    IconComponent = React.lazy(load); // Directly pass the IconLoader
    lazyIconCache.set(load, IconComponent);
  }

  return (
    <ErrorBoundary FallbackComponent={IconErrorBoundaryFallback}>
      <Suspense fallback={ICON_SKELETON_FALLBACK}>
        <IconComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
});
LazyIcon.displayName = 'LazyIcon';


/* --------------------------------------------------------------------------
 * Tooltip
 * ------------------------------------------------------------------------ */
const Tooltip = ({ children, content, disabled }: { children: ReactElement; content: ReactNode; disabled?: boolean }) =>
  disabled ? (
    children
  ) : (
    <span className="group relative flex">
      {children}
      {/* Example tooltip styling - adjust as needed */}
      <span className={cn(
        "invisible group-hover:visible", // Base visibility
        "absolute left-full top-1/2 z-20 ml-2 -translate-y-1/2", // Positioning
        "whitespace-nowrap rounded px-2 py-1 text-xs shadow-md", // Appearance
        "bg-[var(--bg-tooltip)] text-[var(--text-tooltip)]" // Colors using CSS vars
      )}>
        {content}
      </span>
    </span>
  );


/* --------------------------------------------------------------------------
 * Navigation Item Component (Uses Imported Types & Functional Classes)
 * ------------------------------------------------------------------------ */
interface NavItemProps {
  href: string;
  label: string;
  iconLoader: IconLoader; // Use the imported strict IconLoader type
  active: boolean;
  isMinimized: boolean;
}

const NavItem = memo(function NavItem({ href, label, iconLoader, active, isMinimized }: NavItemProps) {
  const baseClasses = cn(
    "group relative flex items-center rounded-md transition-colors duration-200 ease-out",
    // FIX: Use focusRing constant (string) directly
    focusRing
  );
  const activeInactiveClasses = active
    ? "bg-[color-mix(in_oklch,var(--agent-color-primary)_10%,var(--bg-surface))] text-[var(--text-default)] shadow-[var(--glow-primary-xs)]"
    : "text-[var(--text-muted)] hover:text-[var(--text-default)] hover:bg-[var(--bg-hover)]";
  const iconContainerClasses = cn(
    "flex h-5 w-5 shrink-0 items-center justify-center", // Base styles
    active && "text-[var(--agent-color-primary)]" // Active color for icon
  );
  const labelClasses = cn(
    "ml-3 flex-1 overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200 ease-in-out",
    isMinimized ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100' // Animation classes
  );

  return (
    <li>
      <Tooltip content={label} disabled={!isMinimized}>
        <Link
          href={href}
          aria-current={active ? 'page' : undefined}
          aria-label={isMinimized ? label : undefined}
          className={cn(
            baseClasses,
            activeInactiveClasses,
            // Adjust padding/layout based on minimized state
            isMinimized ? 'h-10 w-10 justify-center p-2' : 'px-3 py-2'
          )}
        >
          <span aria-hidden="true" className={iconContainerClasses}>
            <LazyIcon
              load={iconLoader} // Pass the stable loader function
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE}
              // className can be passed if specific styling needed inside LazyIcon consumer
            />
          </span>
          <span aria-hidden={isMinimized} className={labelClasses}>
            {label}
          </span>
        </Link>
      </Tooltip>
    </li>
  );
});
NavItem.displayName = 'NavItem';


/* --------------------------------------------------------------------------
 * Stable Icon Loader for Static Settings Icon (Uses Imported Type)
 * ------------------------------------------------------------------------ */
// Ensure this conforms to the imported IconLoader type
const loadSettingsIcon: IconLoader = () => Promise.resolve({ default: SettingsIcon });


/* ----------------------------------------------------------------------------
 * Main Sidebar Component (Consumes Corrected layoutRegistry Output)
 * ------------------------------------------------------------------------- */
export default function Sidebar() {
  const pathname = usePathname();
  // Select only the needed state and actions for performance
  const { isSidebarOpen, isSidebarMinimized, closeSidebar } = useLayoutStore(
    (state) => ({
      isSidebarOpen: state.isSidebarOpen,
      isSidebarMinimized: state.isSidebarMinimized,
      closeSidebar: state.closeSidebar,
    }),
    shallow // Use shallow comparison
  );

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Determine minimized state (consider unmounted state for initial render)
  const minimized = !isMounted || isSidebarMinimized;
  // Determine if the desktop sidebar should be visually present
  const showDesktop = isSidebarOpen; // Controls desktop visibility via transform

  // Calculate navigation items. Memoized.
  const navItems = useMemo(() => {
    const definitions = getMainNavigationDefinitions();

    const processedNavItems = definitions.map((def) => {
      const keyLower = def.key.toLowerCase();
      // Handle root path mapping
      const href = (def.key === 'oracle-hub') ? '/' : `/${keyLower}`;

      // Active state determination logic
      const isActivePredicate = (currentPath: string): boolean => {
        if (href === '/') {
           // Root is active for '/', '/hub', '/dashboard'
          return currentPath === '/' || currentPath.startsWith('/hub') || currentPath.startsWith('/dashboard');
        }
        // Other items are active if the current path starts with their href
        return currentPath.startsWith(href);
      };

      // Return the structure needed by NavItem
      return {
        reactKey: def.key as CompassKey, // Use CompassKey as React key
        href: href,
        label: def.title,
        iconLoader: def.iconLoader, // Pass the loader function directly from definition
        activePredicate: isActivePredicate,
      };
    });

    // Add the static "Settings" item
    processedNavItems.push({
      reactKey: 'settings',
      href: '/settings',
      label: 'Settings',
      iconLoader: loadSettingsIcon, // Use the IconLoader-compliant static loader
      activePredicate: (currentPath: string) => currentPath.startsWith('/settings'),
    });

    return processedNavItems;
  }, []); // Dependency array assumes definitions are stable; add dependencies if not

  // Determine if the mobile backdrop should be shown
  const showBackdrop = isSidebarOpen && !minimized; // Typically only shown on mobile when open

  return (
    <>
      {/* === Backdrop (Mobile Only) === */}
      <div
        aria-hidden="true" role="presentation" onClick={closeSidebar}
        className={cn(
          "fixed inset-0 z-30 bg-black/30 transition-opacity duration-300 ease-linear md:hidden", // Only show on mobile
          isMounted && showBackdrop ? 'opacity-100' : 'opacity-0 pointer-events-none' // Control visibility/interactivity
        )}
      />

      {/* === Sidebar Container === */}
      <aside
        id="main-sidebar" aria-label="Main navigation"
        className={cn(
          // Base styles
          "fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-[var(--border-muted)] bg-[var(--bg-surface)]",
          // FIX: Use focusRing constant (string) directly. The 'focus-within:ring-inset' is handled below.
          focusRing,
          'focus-within:ring-inset', // Keep this class for the desired inset behavior on focus-within

          // Transitions
          'transition-[transform,width] duration-[var(--duration-normal)] ease-[var(--ease-out)]',

          // --- Width based on state (with fallbacks for CSS var loading) ---
          minimized
            ? 'w-[var(--sidebar-width-minimized,theme(spacing.16))]' // Use theme helper for fallback
            : 'w-[var(--sidebar-width-expanded,theme(spacing.60))]',

          // --- Visibility & Transform Transitions ---
          // Initial state before mount (hidden off-screen)
          !isMounted && '-translate-x-full',
          // Mobile state after mount (controlled by isSidebarOpen)
          isMounted && 'md:hidden', // Apply mobile transform logic only below md breakpoint
          isMounted && (isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'),

          // Desktop state after mount (controlled by showDesktop = isSidebarOpen)
          isMounted && 'hidden md:flex', // Base desktop visibility (flex)
          isMounted && (showDesktop ? 'md:translate-x-0' : 'md:-translate-x-full') // Desktop slide in/out
        )}
      >
        {/* Inner container for content and scrolling */}
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden pb-4">
          {/* === Sidebar Header === */}
          <div className={cn(
            "flex h-[var(--header-height)] shrink-0 items-center border-b border-[var(--border-muted)] px-4",
            minimized ? 'justify-center' : 'justify-between' // Center content when minimized
          )}>
             {/* Show title only when expanded */}
             {!minimized && (
                <span className="font-display text-lg font-semibold tracking-tight text-[var(--text-default)]">
                    Asraya OS {/* Example Title */}
                </span>
             )}
             {/* Close button (Mobile only) */}
             <button
                type="button"
                onClick={closeSidebar}
                aria-label="Close sidebar"
                className={cn(
                    "rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-default)] md:hidden", // Hide on desktop
                    // FIX: Use focusRing constant (string) directly
                    focusRing
                )}
             >
               <CloseIcon size={18} strokeWidth={ICON_STROKE} />
             </button>
          </div>

          {/* === Main Navigation Section === */}
          <nav className={cn(
            "flex-1 px-2 py-4", // Padding for the nav list
            minimized && "overflow-hidden" // Prevent text overflow when minimized during animation
          )}>
            <ul role="list" className="space-y-1">
              {navItems.map((item) => (
                <NavItem
                  key={item.reactKey}
                  href={item.href}
                  label={item.label}
                  iconLoader={item.iconLoader} // Pass the correct loader
                  isMinimized={minimized}
                  active={item.activePredicate(pathname)} // Calculate active state based on current path
                />
              ))}
            </ul>
          </nav>

          {/* === Footer Navigation Section (Optional) === */}
          {/* If there's a separate footer section (e.g., User Profile, Logout), add it here */}
          {/* <div className="mt-auto px-2 py-2 border-t border-[var(--border-muted)]"> ... </div> */}
        </div>
      </aside>
    </>
  );
}

// Note: Zustand store structure reference (not part of the component code)
/*
interface LayoutState {
  isSidebarOpen: boolean;
  isSidebarMinimized: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebarMinimize: () => void;
  // ... other layout state
}
*/