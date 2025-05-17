
// Assumes a tree-shakable Subject implementation (e.g., small closure-based)
import { tinySubject, TinySubject } from './tinySubject'; // Adjust path as needed

// --- Constants & Types ---

const DURATION_TOKEN_NAMES = [
    'ultrafast', 'fastest', 'fast', 'normal', 'slow', 'slower', 'slowest', 'tortoise',
] as const;
const EASING_TOKEN_NAMES = [
    'default', // Often maps to 'out' or 'inOut'
    'out',
    'inOut',
    'in',
    'elastic',
    'bounce',
    'back',
    'organic', // Example custom ease name
    // Names for specific easings that *might* be defined as arrays in CSS
    'framerSpringy', // e.g., --ease-framer-springy: 0.68, -0.55, 0.265, 1.55 OR cubic-bezier(0.68, -0.55, 0.265, 1.55)
    'framerSharp',   // e.g., --ease-framer-sharp: 0.55, 0.055, 0.675, 0.19 OR cubic-bezier(0.55, 0.055, 0.675, 0.19)
    'framerArrayTest', // For testing direct array input
    'framerCubicBezierTest', // For testing cubic-bezier() input
    'framerKeywordTest', // For testing keyword input
] as const;

export type DurationTokenName = typeof DURATION_TOKEN_NAMES[number];
export type EasingTokenName = typeof EASING_TOKEN_NAMES[number];

/** Represents a valid easing value, either a CSS string or a Framer Motion cubic-bezier array */
export type EaseValue = string | number[]; // Array format [P1x, P1y, P2x, P2y]

/** Helper object for typed access to DurationTokenName strings. */
export const DURATION: Record<DurationTokenName, DurationTokenName> =
    Object.fromEntries(DURATION_TOKEN_NAMES.map(n => [n, n])) as Record<DurationTokenName, DurationTokenName>;

/** Helper object for typed access to EasingTokenName strings. */
export const EASE: Record<EasingTokenName, EasingTokenName> =
    Object.fromEntries(EASING_TOKEN_NAMES.map(n => [n, n])) as Record<EasingTokenName, EasingTokenName>;

// --- Default Fallback Values (SSR / Missing CSS Vars) ---
// These values are used if CSS variables are missing or before client-side hydration.

const DEFAULT_DURATIONS: Readonly<Record<DurationTokenName, number>> = {
    [DURATION.ultrafast]: 0.05,
    [DURATION.fastest]: 0.1,
    [DURATION.fast]: 0.2,
    [DURATION.normal]: 0.3,
    [DURATION.slow]: 0.5,
    [DURATION.slower]: 0.8,
    [DURATION.slowest]: 1.2,
    [DURATION.tortoise]: 1.6,
};

// Fallbacks MUST be in EaseValue format (string or array).
const DEFAULT_EASINGS: Readonly<Record<EasingTokenName, EaseValue>> = {
    [EASE.default]: 'cubic-bezier(0.22, 1, 0.36, 1)', // Default to 'out' string
    [EASE.out]: 'cubic-bezier(0.22, 1, 0.36, 1)',
    [EASE.inOut]: 'cubic-bezier(0.65, 0, 0.35, 1)',
    [EASE.in]: 'cubic-bezier(0.4, 0, 1, 1)',
    [EASE.elastic]: 'cubic-bezier(0.5, 1.5, 0.75, 1.25)',
    [EASE.bounce]: 'cubic-bezier(0.5, -0.5, 0.1, 1.5)',
    [EASE.back]: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    [EASE.organic]: 'cubic-bezier(0.43, 0.11, 0.37, 0.85)',
    // Provide array fallbacks if these specific easings are fundamental defaults
    [EASE.framerSpringy]: [0.68, -0.55, 0.265, 1.55],
    [EASE.framerSharp]: [0.55, 0.055, 0.675, 0.19],
    // Fallbacks for test tokens
    [EASE.framerArrayTest]: [0.1, 0.2, 0.3, 0.4],
    [EASE.framerCubicBezierTest]: 'cubic-bezier(0.1, 0.2, 0.3, 0.4)',
    [EASE.framerKeywordTest]: 'ease-in-out', // Keyword string fallback
};

// --- State & Caching ---

const isClient = typeof window !== 'undefined';
let isInitialized = false; // Becomes true after first successful client-side read attempt
let isReady = false; // Becomes true once DOM is interactive/complete client-side

// Caches store resolved values (number for duration, EaseValue for easing)
const durationCache = new Map<DurationTokenName, number>();
const easingCache = new Map<EasingTokenName, EaseValue>(); // <-- UPDATED TYPE

// --- Reactive Prefers-Reduced-Motion ---

const initialServerValue = true; // Default to TRUE during SSR (safer)
let prefersReducedMotionValue = !isClient ? initialServerValue : false; // Will be updated on client
const prefersReducedMotionSubject = tinySubject<boolean>(prefersReducedMotionValue);

/** Reactive observable for prefers-reduced-motion preference. Defaults true on SSR. */
export const prefersReducedMotion$: TinySubject<boolean> = prefersReducedMotionSubject;

/** Initial value for prefers-reduced-motion (true on server/before hydration). */
export const prefersReducedMotionInitial: boolean = initialServerValue;

/** Object compatible with React's `useSyncExternalStore` for prefers-reduced-motion. */
export const prefersReducedMotionStore = {
    subscribe: (callback: () => void): (() => void) => {
        if (isClient && !isInitialized) {
            try {
               const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
               prefersReducedMotionValue = mq.matches;
            } catch {}
        }
        return prefersReducedMotion$.subscribe(callback);
    },
    getSnapshot: (): boolean => {
        return !isClient ? initialServerValue : prefersReducedMotionValue;
    },
};

// --- Internal Core Logic ---

/** Safely reads CSS custom property. Returns null if SSR/not found/error. */
function _readCssVar(name: string): string | null {
    if (!isClient || !document?.documentElement) return null;
    try {
        if (!isReady) {
           // console.warn(`motionTokens: Attempted to read CSS var "${name}" before DOM was ready.`);
           return null;
        }
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || null;
    } catch (e) {
        console.warn(`motionTokens: Error reading CSS variable "${name}".`, e);
        return null;
    }
}

/**
 * **Internal helper** to parse ONLY comma-separated numbers into a 4-element number array.
 * Returns undefined if parsing fails or input is not exactly 4 numbers.
 * Used by `cubicBezierStringToArray` and `_readAndCacheEasing`.
 */
function _parseCubicCoords(value: string): number[] | undefined {
    const parts = value.split(',').map(s => s.trim());
    if (parts.length === 4) {
        const numbers = parts.map(parseFloat);
        if (numbers.every(n => !isNaN(n))) {
            return numbers;
        }
    }
    return undefined;
}

/**
 * Parses a CSS easing string. If it starts with `cubic-bezier(` and contains
 * valid coordinates, it returns a `[number, number, number, number]` array.
 * Otherwise, it returns the original trimmed string. Returns null only if
 * the input string itself is null or empty.
 *
 * @param cssValue The raw value from the CSS custom property.
 * @returns The parsed `EaseValue` (string or number array), or null if input was null/empty.
 */
function _parseCssEasingValue(cssValue: string | null): EaseValue | null {
    if (cssValue === null || cssValue === '') {
        return null;
    }

    const trimmedValue = cssValue.trim();

    // 1. Check for explicit cubic-bezier(N, N, N, N) format
    if (trimmedValue.startsWith('cubic-bezier(') && trimmedValue.endsWith(')')) {
        const innerCoords = trimmedValue.substring('cubic-bezier('.length, trimmedValue.length - 1);
        const parsedArray = _parseCubicCoords(innerCoords);
        if (parsedArray) {
            return parsedArray; // Return array if parsing successful
        }
        // If parsing fails, fall through to return the original string
        console.warn(`motionTokens: Could not parse coordinates inside "${trimmedValue}". Returning as string.`);
        return trimmedValue;
    }

    // 2. Check if the value ITSELF is just N, N, N, N (legacy Framer Motion format perhaps?)
    // Note: This path was mentioned in requirements but the specific instruction focused on parsing *inside* cubic-bezier().
    // Let's *not* parse raw N,N,N,N unless explicitly wrapped, to avoid ambiguity with potential future CSS syntaxes.
    // If needed, this check could be added here:
    // const parsedDirectArray = _parseCubicCoords(trimmedValue);
    // if (parsedDirectArray) {
    //     return parsedDirectArray;
    // }

    // 3. Otherwise, assume it's a keyword ('ease', 'linear', 'steps(...)', etc.) or invalid. Return as string.
    return trimmedValue;
}


/** Reads/caches duration from CSS or fallback. Handles SSR/readiness. */
function _readAndCacheDuration(token: DurationTokenName): number {
    const fallback = DEFAULT_DURATIONS[token];
    if (!isClient || !isReady || fallback === undefined) {
        return fallback ?? DEFAULT_DURATIONS[DURATION.normal];
    }

    const cachedValue = durationCache.get(token);
    if (cachedValue !== undefined) return cachedValue;

    const varName = `--duration-${token}`;
    const cssValue = _readCssVar(varName);
    let resolvedValue = fallback;

    if (cssValue !== null) {
        const parsed = parseFloat(cssValue);
        if (!isNaN(parsed)) {
            resolvedValue = cssValue.includes('ms') ? parsed / 1000 : parsed;
        } else {
            console.warn(`motionTokens: Invalid number format for CSS var "${varName}" ("${cssValue}"). Using fallback ${fallback}s.`);
        }
    }

    durationCache.set(token, resolvedValue);
    if (!isInitialized) isInitialized = true;
    return resolvedValue;
}

/** Reads/caches easing from CSS or fallback. Handles SSR/readiness. Returns string or array. */
function _readAndCacheEasing(token: EasingTokenName): EaseValue {
    const fallback = DEFAULT_EASINGS[token];
    if (!isClient || !isReady || fallback === undefined) {
        return fallback ?? DEFAULT_EASINGS[EASE.default];
    }

    const cachedValue = easingCache.get(token);
    if (cachedValue !== undefined) return cachedValue;

    const varName = `--ease-${token}`;
    const cssValue = _readCssVar(varName);
    let resolvedValue: EaseValue = fallback; // Start with default for this token

    const parsedCss = _parseCssEasingValue(cssValue); // Use the new parser

    if (parsedCss !== null) {
        // If parser returned something (string or array), use it
        resolvedValue = parsedCss;
    }
    // If cssValue was null or empty, parsedCss is null, so we stick with the fallback

    easingCache.set(token, resolvedValue); // Store string OR array in cache
    if (!isInitialized) isInitialized = true;
    return resolvedValue;
}

/**
 * Clears internal motion token caches. Call this if CSS variables might have
 * changed dynamically (e.g., JS theme switching) to force re-reads.
 */
export function refreshMotionTokens(): void {
    if (!isClient) return;
    durationCache.clear();
    easingCache.clear(); // Clears the cache storing EaseValue
    isInitialized = false;
}

// --- Public API ---

/**
 * Retrieves a duration value in seconds from CSS custom properties (`--duration-${token}`)
 * or fallbacks. Uses internal caching. SSR-safe.
 * @param token The duration token name (e.g., `DURATION.fast`).
 * @returns Duration in seconds.
 */
export function getDuration(token: DurationTokenName): number {
    // Attempt cache read first for performance
    const cachedValue = durationCache.get(token);
    if (cachedValue !== undefined) return cachedValue;
    // If not cached or requires re-read (e.g., after refresh), compute/cache it
    return _readAndCacheDuration(token);
}

/**
 * Retrieves an easing value from CSS custom properties (`--ease-${token}`) or fallbacks.
 * If the CSS variable value is a valid `cubic-bezier(n,n,n,n)` string, it parses it
 * and returns a number array `[n, n, n, n]`.
 * Otherwise, it returns the CSS value as a string (e.g., 'ease-out', 'linear', 'steps(...)').
 * Uses internal caching. SSR-safe.
 * @param token The easing token name (e.g., `EASE.inOut`, `EASE.framerSpringy`).
 * @returns The easing value as a string or a number array `[P1x, P1y, P2x, P2y]`.
 *          Guaranteed to return `EaseValue = string | number[]`.
 */
export function getEase(token: EasingTokenName): EaseValue {
    // Attempt cache read first
    const cachedValue = easingCache.get(token);
    if (cachedValue !== undefined) return cachedValue;
    // If not cached or requires re-read, compute/cache it
    return _readAndCacheEasing(token);
}

/**
 * Helper function to parse a string that might contain cubic-bezier coordinates.
 * Handles `"cubic-bezier(n, n, n, n)"` format.
 * Does NOT handle raw `"n, n, n, n"` format directly based on primary requirements.
 *
 * @param str The string to parse (e.g., "cubic-bezier(0.65, 0, 0.35, 1)").
 * @returns A four-element number array `[P1x, P1y, P2x, P2y]` if parsing is successful, otherwise `null`.
 */
export function cubicBezierStringToArray(str: string): number[] | null {
    if (typeof str !== 'string') return null;

    const trimmed = str.trim();
    if (trimmed.startsWith('cubic-bezier(') && trimmed.endsWith(')')) {
        const innerCoords = trimmed.substring('cubic-bezier('.length, trimmed.length - 1);
        const parsedArray = _parseCubicCoords(innerCoords);
        return parsedArray ?? null; // Return array or null
    }
    // Only parse if it has the cubic-bezier wrapper per Requirement 1's specific wording
    return null;
}


/**
 * DEPRECATED: Provides legacy Proxy access. Returns STRING values only.
 * Prefer `getDuration(DURATION.TokenName)`.
 * @deprecated Use `getDuration()` instead. This proxy only returns fallback strings on server.
 */
export const durations: Record<DurationTokenName, number> = new Proxy({} as any, {
    get(_, key: DurationTokenName) {
        console.warn(`motionTokens: Access via deprecated 'durations.${String(key)}' proxy. Use getDuration(DURATION.${String(key)}) instead.`);
        if (DURATION_TOKEN_NAMES.includes(key)) {
            return getDuration(key);
        }
        console.warn(`motionTokens: Invalid duration token "${String(key)}" accessed via deprecated proxy. Returning fallback.`);
        return DEFAULT_DURATIONS[DURATION.normal];
    },
});

/**
 * DEPRECATED: Provides legacy Proxy access. Returns STRING values only.
 * Prefer `getEase(EASE.TokenName)`.
 * @deprecated Use `getEase()` instead. This proxy only returns fallback strings on server or non-array values. It does NOT return arrays.
 */
export const easings: Record<EasingTokenName, string> = new Proxy({} as any, {
    get(_, key: EasingTokenName) {
        console.warn(`motionTokens: Access via deprecated 'easings.${String(key)}' proxy. Use getEase(EASE.${String(key)}) instead. Note: Proxy returns string values only.`);
        if (EASING_TOKEN_NAMES.includes(key)) {
            const value = getEase(key);
            // Deprecated proxy MUST return a string. Convert array back to cubic-bezier string format.
            if (Array.isArray(value)) {
                return `cubic-bezier(${value.join(', ')})`;
            }
            return value; // It's already a string
        }
        console.warn(`motionTokens: Invalid easing token "${String(key)}" accessed via deprecated proxy. Returning fallback.`);
        const fallback = DEFAULT_EASINGS[EASE.default];
        return Array.isArray(fallback) ? `cubic-bezier(${fallback.join(', ')})` : fallback;
    },
});


/**
 * Synchronously checks the current `prefers-reduced-motion` status.
 * Returns the server-side default (`true`) during SSR or before client-side initialization.
 * Use `prefersReducedMotionStore` with `useSyncExternalStore` for reactivity in React.
 * @returns `true` if reduced motion is preferred (or SSR), `false` otherwise.
 */
export const prefersReducedMotion = (): boolean => {
    return !isClient ? initialServerValue : prefersReducedMotionValue;
}

// --- GSAP Helpers ---

type GSAPTimelineVars = gsap.TimelineVars; // Assume GSAP types are available

/**
 * Creates a GSAP-compatible timeline configuration object.
 * Sets default duration/easing from tokens, respecting `prefers-reduced-motion`.
 * **Important:** If `getEase` returns an array, this helper passes it stringified
 * as `"[n,n,n,n]"`. The consuming code (e.g., `getGsapEase` helper) MUST handle
 * this by registering it with GSAP's `CustomEase`.
 *
 * @param options Optional overrides for default ease/duration tokens.
 * @param timelineOptions Optional additional GSAP timeline options (e.g., `{ paused: true }`).
 * @returns GSAP TimelineVars configuration object.
 */
export function motionDefaults(
    options: Partial<{ ease: EasingTokenName; duration: DurationTokenName }> = {},
    timelineOptions: Omit<gsap.TimelineVars, 'defaults'> = {}
): GSAPTimelineVars {
    const easeToken = options.ease || EASE.default;
    const durationToken = options.duration || DURATION.normal;

    let defaults: GSAPTimelineVars['defaults'];

    if (prefersReducedMotion()) {
        defaults = {
            ease: 'none',
            duration: 0,
        };
    } else {
        const easeValue = getEase(easeToken);
        // Pass array stringified; consumer MUST parse/register with CustomEase
        defaults = {
            ease: Array.isArray(easeValue) ? `[${easeValue.join(',')}]` : easeValue,
            duration: getDuration(durationToken),
        };
    }

    return {
        ...timelineOptions,
        defaults: defaults,
    };
}

/**
 * Creates a GSAP-compatible "spring" animation object (from/to vars).
 * Respects `prefers-reduced-motion`.
 * **Important:** Uses `getEase`. If it returns an array, it's passed stringified
 * as `"[n,n,n,n]"`. Consuming code must handle this via `CustomEase`.
 *
 * @param direction Base direction ('up', 'down', 'left', 'right').
 * @param magnitude Pixel distance. Defaults to 15.
 * @param options Optional overrides: `exit`, `duration`, `ease`.
 * @returns GSAP `from` or `to` variables object.
 */
export function spring(
    direction: 'up' | 'down' | 'left' | 'right',
    magnitude = 15,
    options: Partial<{
        exit: boolean;
        duration: DurationTokenName;
        ease: EasingTokenName;
    }> = {}
): Record<string, any> {
    const {
        exit = false,
        duration: durationToken = DURATION.fast,
        ease: easeTokenOverride,
    } = options;

    const reduceMotion = prefersReducedMotion();
    const defaultEaseToken: EasingTokenName = reduceMotion ? EASE.out : (exit ? EASE.out : EASE.elastic);
    const resolvedEaseToken = easeTokenOverride ?? defaultEaseToken;

    const resolvedDuration = reduceMotion ? 0 : getDuration(durationToken);
    const resolvedEaseValue = reduceMotion ? 'none' : getEase(resolvedEaseToken);
    // Pass array stringified; consumer MUST parse/register with CustomEase
    const gsapEase = Array.isArray(resolvedEaseValue) ? `[${resolvedEaseValue.join(',')}]` : resolvedEaseValue;

    const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
    const baseMagnitude = (direction === 'down' || direction === 'right') ? magnitude : -magnitude;
    const offset = reduceMotion ? 0 : baseMagnitude;
    const targetOpacity = exit ? 0 : 1;
    const initialOpacity = exit ? 1 : 0;

    const commonProps = {
        ease: gsapEase,
        duration: resolvedDuration,
    };

    return exit
        ? { [axis]: offset, opacity: targetOpacity, ...commonProps } // For gsap.to
        : { [axis]: offset, opacity: initialOpacity, ...commonProps }; // For gsap.from
}

/**
 * (Bonus) Retrieves all current duration and easing token values from cache/CSS/fallbacks.
 * @returns Object containing Maps of durations (name -> seconds) and easings (name -> EaseValue).
 */
export function getMotionTokens(): {
    durations: Map<DurationTokenName, number>;
    easings: Map<EasingTokenName, EaseValue>; // Updated type
} {
    const allDurations = new Map<DurationTokenName, number>();
    DURATION_TOKEN_NAMES.forEach(token => {
        allDurations.set(token, getDuration(token));
    });

    const allEasings = new Map<EasingTokenName, EaseValue>();
    EASING_TOKEN_NAMES.forEach(token => {
        allEasings.set(token, getEase(token));
    });

    return {
        durations: allDurations,
        easings: allEasings,
    };
}


// --- Client-Side Initialization & Listeners ---

// Keep this logic as it was, ensuring it handles client-side readiness checks
// and reduced motion preferences. The core token reading logic above now
// depends on 'isReady'.

let _mediaQueryListener: ((event: MediaQueryListEvent | MediaQueryList) => void) | null = null; // Store listener for cleanup

function _initializeClientSide(): void {
    if (!isClient || isInitialized) return;

    // 1. Reduced Motion Listener
    let mediaQueryList: MediaQueryList | null = null;
    try {
        mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
        // Define listener separately for potential removal
        _mediaQueryListener = (event: MediaQueryListEvent | MediaQueryList) => {
            const newValue = event.matches;
            if (newValue !== prefersReducedMotionValue) {
                prefersReducedMotionValue = newValue;
                prefersReducedMotionSubject.next(newValue);
                // Optional: Refresh tokens if reduced motion changes, as defaults might differ
                // refreshMotionTokens();
            }
        };

        prefersReducedMotionValue = mediaQueryList.matches;
        prefersReducedMotionSubject.next(prefersReducedMotionValue);

        // Use addEventListener if available, fallback for older browsers unlikely needed
        mediaQueryList.addEventListener?.('change', _mediaQueryListener);

    } catch (error) {
        console.error("motionTokens: Failed to initialize 'prefers-reduced-motion' listener.", error);
        prefersReducedMotionSubject.next(prefersReducedMotionValue);
    }

    // 2. Mutation Observer for CSS Variable Changes
    let observer: MutationObserver | null = null;
    try {
        observer = new MutationObserver((mutationsList) => {
            const needsRefresh = mutationsList.some(mutation =>
                (mutation.type === 'attributes' && mutation.target === document.documentElement && (mutation.attributeName === 'style' || mutation.attributeName === 'class' || mutation.attributeName?.startsWith('data-'))) ||
                (mutation.type === 'childList' && mutation.target === document.head && Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes)).some(node => node.nodeName === 'STYLE' || (node.nodeName === 'LINK' && (node as HTMLLinkElement).rel === 'stylesheet')))
            );
            if (needsRefresh) {
                // console.log("motionTokens: Potential style change detected, refreshing caches.");
                refreshMotionTokens();
            }
        });

        if (document.documentElement) observer.observe(document.documentElement, { attributes: true });
        if (document.head) observer.observe(document.head, { childList: true, subtree: true }); // Observe subtree in head too

    } catch (error) {
        console.error("motionTokens: Failed to initialize MutationObserver.", error);
    }

    // 3. Mark as Ready for Token Reads
    const tryMarkReady = () => {
        if (!isReady) {
             isReady = true;
             isInitialized = true; // Can now safely read CSS vars
             // console.log("motionTokens: DOM ready. Caches will populate on first access.");
             // Initial population might be useful after DOM ready, but lazy loading is default
             // refreshMotionTokens(); // Uncomment to eagerly populate cache on DOM ready
        }
    };

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        tryMarkReady();
    } else {
        window.addEventListener('DOMContentLoaded', tryMarkReady, { once: true });
    }

    // --- Cleanup --- Store references for potential HMR cleanup
    // @ts-ignore - HMR specific checks
    if (import.meta.hot) {
        // @ts-ignore
        import.meta.hot.dispose(() => {
             if (_mediaQueryListener && mediaQueryList) {
                mediaQueryList.removeEventListener?.('change', _mediaQueryListener);
             }
             observer?.disconnect();
             window.removeEventListener('DOMContentLoaded', tryMarkReady);
             isReady = false;
             isInitialized = false;
             durationCache.clear();
             easingCache.clear();
             // Reset internal state if needed, e.g., prefersReducedMotionValue?
             // Subject cleanup if provided by tinySubject
             // console.log('motionTokens: Cleaned up listeners and observer on HMR dispose.');
         });
    }
}

// --- Auto-initialize on Client ---
if (isClient) {
    // Use requestAnimationFrame to delay slightly, ensuring elements exist
    requestAnimationFrame(() => {
       _initializeClientSide();
    });
}

/* --- Notes ---
 * CSS Variable Naming: Expects `--duration-{token}` and `--ease-{token}`.
 * CSS Easing Values:
 *   - `cubic-bezier(n,n,n,n)` -> Parsed to array `[n,n,n,n]`.
 *   - `ease-out`, `linear`, `steps(...)`, other keywords -> Returned as string.
 *   - Invalid `cubic-bezier(...)` content -> Returned as the original string with a warning.
 *   - Raw numbers `n,n,n,n` -> Returned as string (not parsed unless wrapped in `cubic-bezier()`).
 * GSAP CustomEase: GSAP helpers (`motionDefaults`, `spring`) pass array easings
 *   stringified as `"[n,n,n,n]"`. Consuming code MUST handle this via `CustomEase`.
 * TinySubject: Ensure `./tinySubject` provides a working implementation.
 */