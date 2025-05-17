import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    getEase,
    getDuration, // Import if testing durations too
    refreshMotionTokens,
    EASE,
    DURATION, // If testing durations
    cubicBezierStringToArray,
    EaseValue,
    prefersReducedMotion, // To test reduced motion impact
    // Import internal state/functions ONLY if absolutely necessary for setup/mocking
    // and understand the risks of testing implementation details.
    // For this test, we primarily mock browser APIs.
} from './motiontokens'; // Adjust path as needed

// --- Mocks ---

// Mock window.getComputedStyle
const mockGetComputedStyle = vi.fn();
const originalGetComputedStyle = global.window ? window.getComputedStyle : undefined;

// Mock window.matchMedia for prefers-reduced-motion
const mockMatchMedia = vi.fn();
const originalMatchMedia = global.window ? window.matchMedia : undefined;

// Mock DOM readiness state/events if initialization logic depends heavily on them
// For basic token reading after potential initialization, mocking `isReady` via internal access
// might be simpler, OR ensure tests run after mocked 'DOMContentLoaded'.
// Let's assume initialization runs and sets 'isReady = true' internally before tests.
// We can achieve this by mocking requestAnimationFrame used in initialization.

vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  cb(0); // Execute callback immediately
  return 0; // Return a dummy handle
});


beforeEach(() => {
    // Reset mocks and state before each test
    vi.resetModules(); // Ensure fresh module state if possible

    // Mock getComputedStyle to return specific values based on variable name
    mockGetComputedStyle.mockImplementation((elt: Element) => ({
        getPropertyValue: (varName: string) => {
            // Define mock CSS variable values here for the tests
            // Make sure names match `--ease-{token}` format
            if (varName === '--ease-framerArrayTest') return '0.65, 0, 0.35, 1'; // Raw numbers (should return as string)
            if (varName === '--ease-framerCubicBezierTest') return 'cubic-bezier(0.22, 1, 0.36, 1)'; // Standard cubic-bezier()
            if (varName === '--ease-framerKeywordTest') return 'ease-out'; // Keyword
            if (varName === '--ease-inOut') return 'cubic-bezier(0.9, 0.1, 0.1, 0.9)'; // Another cubic-bezier()
            if (varName === '--ease-malformedCubic') return 'cubic-bezier(0.1, 0.2, invalid)'; // Malformed
            if (varName === '--ease-malformedArray') return '0.1, 0.2, 0.3'; // Wrong number of coords (should return as string)
            // Add duration mocks if testing getDuration
            if (varName === '--duration-fast') return '250ms';
            return ''; // Default empty value for unhandled variables
        },
        // Add other methods if needed by the code under test
    }));
    if (global.window) {
        window.getComputedStyle = mockGetComputedStyle as typeof window.getComputedStyle;
    }

    // Mock matchMedia
    mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)' ? false : false, // Default to NOT reduced motion
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated but maybe used in fallbacks
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
    if (global.window) {
        window.matchMedia = mockMatchMedia as typeof window.matchMedia;
    }

    // Mock documentElement and head for MutationObserver setup if needed
    if (global.document) {
        vi.spyOn(document, 'documentElement', 'get').mockReturnValue(document.createElement('html'));
        vi.spyOn(document, 'head', 'get').mockReturnValue(document.createElement('head'));
        // Mock readyState if initialization depends on it
        Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' });
    }

    // Reset internal caches by calling the public refresh function
    refreshMotionTokens();

    // Re-trigger initialization logic by importing the module again (requires resetModules)
    // OR manually call the internal init function if exposed/mockable.
    // Since requestAnimationFrame is mocked to run immediately, init should run.
    // We might need to explicitly set `isReady = true` if relying on internal state.
    // For simplicity, let's assume the mocked RAF + DOM state allows reads.
});

afterEach(() => {
    // Restore original functions
    if (originalGetComputedStyle) window.getComputedStyle = originalGetComputedStyle;
    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
    // Reset readyState if modified
    if (global.document) {
        Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' }); // Or original value
    }
});

// --- Test Suites ---

describe('motiontokens: getEase()', () => {
    it('should return array for valid cubic-bezier() string in CSS var', () => {
        const easeValue = getEase(EASE.framerCubicBezierTest);
        expect(easeValue).toEqual([0.22, 1, 0.36, 1]);
        // Check cache
        const easeValueCached = getEase(EASE.framerCubicBezierTest);
        expect(easeValueCached).toEqual([0.22, 1, 0.36, 1]);
        expect(mockGetComputedStyle).toHaveBeenCalledTimes(1); // Should only read CSS once
    });

    it('should return string for keyword easing string in CSS var', () => {
        const easeValue = getEase(EASE.framerKeywordTest);
        expect(easeValue).toBe('ease-out');
        // Check cache
        const easeValueCached = getEase(EASE.framerKeywordTest);
        expect(easeValueCached).toBe('ease-out');
        expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);
    });

    it('should return string for raw N,N,N,N array-like string in CSS var (not wrapped)', () => {
        // Based on the implementation, raw numbers are NOT parsed unless wrapped in cubic-bezier()
        const easeValue = getEase(EASE.framerArrayTest);
        expect(easeValue).toBe('0.65, 0, 0.35, 1');
        // Check cache
        const easeValueCached = getEase(EASE.framerArrayTest);
        expect(easeValueCached).toBe('0.65, 0, 0.35, 1');
        expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);
    });

    it('should return fallback value if CSS var is missing or empty', () => {
        // Mock getComputedStyle to return empty for 'elastic'
        mockGetComputedStyle().getPropertyValue.mockImplementation((varName: string) =>
            varName === '--ease-elastic' ? '' : 'mockedValue' // Return empty only for elastic
        );
        refreshMotionTokens(); // Refresh to clear potential previous cache

        const easeValue = getEase(EASE.elastic);
        // Expect the default fallback defined in motiontokens.ts
        expect(easeValue).toEqual(DEFAULT_EASINGS[EASE.elastic]); // Compare with the source of truth
    });

    it('should return fallback value for unknown token', () => {
        const easeValue = getEase('unknownTokenName' as any); // Cast to bypass type checking
        // Expect the default fallback (EASE.default)
        expect(easeValue).toEqual(DEFAULT_EASINGS[EASE.default]);
    });

    it('should return the original string if cubic-bezier() content is malformed', () => {
        // Setup mock for this specific test case
        mockGetComputedStyle().getPropertyValue.mockImplementation((varName: string) =>
            varName === '--ease-malformedCubic' ? 'cubic-bezier(0.1, 0.2, invalid)' : ''
        );
        refreshMotionTokens();

        const easeValue = getEase('malformedCubic' as any);
        expect(easeValue).toBe('cubic-bezier(0.1, 0.2, invalid)');
    });

     it('should return the original string if raw array-like string has wrong number of coords', () => {
        // Setup mock for this specific test case
        mockGetComputedStyle().getPropertyValue.mockImplementation((varName: string) =>
            varName === '--ease-malformedArray' ? '0.1, 0.2, 0.3' : ''
        );
        refreshMotionTokens();

        const easeValue = getEase('malformedArray' as any);
        expect(easeValue).toBe('0.1, 0.2, 0.3');
    });

    // Test reduced motion overrides if relevant to getEase (it isn't directly, but affects helpers)
});


describe('motiontokens: cubicBezierStringToArray()', () => {
    it('should parse valid cubic-bezier() string', () => {
        const result = cubicBezierStringToArray('cubic-bezier(0.65, 0, 0.35, 1)');
        expect(result).toEqual([0.65, 0, 0.35, 1]);
    });

    it('should parse valid cubic-bezier() string with extra whitespace', () => {
        const result = cubicBezierStringToArray('  cubic-bezier( 0.1 , 0.2,  0.3,0.4 )  ');
        expect(result).toEqual([0.1, 0.2, 0.3, 0.4]);
    });

    it('should return null for string without cubic-bezier() wrapper', () => {
        const result = cubicBezierStringToArray('0.65, 0, 0.35, 1');
        expect(result).toBeNull();
    });

    it('should return null for keyword string', () => {
        const result = cubicBezierStringToArray('ease-in-out');
        expect(result).toBeNull();
    });

    it('should return null for malformed cubic-bezier() content (not 4 numbers)', () => {
        const result1 = cubicBezierStringToArray('cubic-bezier(0.1, 0.2, 0.3)');
        expect(result1).toBeNull();
        const result2 = cubicBezierStringToArray('cubic-bezier(0.1, 0.2, abc, 0.4)');
        expect(result2).toBeNull();
    });

    it('should return null for invalid input types', () => {
        expect(cubicBezierStringToArray(null as any)).toBeNull();
        expect(cubicBezierStringToArray(undefined as any)).toBeNull();
        expect(cubicBezierStringToArray(123 as any)).toBeNull();
        expect(cubicBezierStringToArray({} as any)).toBeNull();
    });
});


describe('motiontokens: Cache & Refresh', () => {
    it('should cache resolved easing values', () => {
        getEase(EASE.framerCubicBezierTest); // First call reads CSS
        expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);
        getEase(EASE.framerCubicBezierTest); // Second call should hit cache
        expect(mockGetComputedStyle).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should re-read CSS after refreshMotionTokens() is called', () => {
        getEase(EASE.framerCubicBezierTest); // Call 1 -> reads CSS
        expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);

        refreshMotionTokens(); // Clear cache

        getEase(EASE.framerCubicBezierTest); // Call 2 -> reads CSS again
        expect(mockGetComputedStyle).toHaveBeenCalledTimes(2);
    });
});

// Add tests for getDuration, prefersReducedMotion, motionDefaults, spring if needed
describe('motiontokens: getDuration()', () => {
    it('should parse time correctly (ms)', () => {
        const duration = getDuration(DURATION.fast);
        expect(duration).toBe(0.25); // 250ms -> 0.25s
        expect(mockGetComputedStyle).toHaveBeenCalledTimes(1);
        const durationCached = getDuration(DURATION.fast);
        expect(durationCached).toBe(0.25);
        expect(mockGetComputedStyle).toHaveBeenCalledTimes(1); // Cached
    });

     it('should parse time correctly (s - assumed if no unit)', () => {
        mockGetComputedStyle().getPropertyValue.mockImplementation((varName: string) =>
            varName === '--duration-normal' ? '0.7' : ''
        );
        refreshMotionTokens();
        const duration = getDuration(DURATION.normal);
        expect(duration).toBe(0.7);
    });

    it('should return fallback for missing duration', () => {
        const duration = getDuration(DURATION.slowest); // Assume not mocked
        expect(duration).toBe(DEFAULT_DURATIONS[DURATION.slowest]);
    });
});

describe('motiontokens: prefersReducedMotion', () => {
    it('should return false when media query does not match', () => {
         mockMatchMedia.mockImplementation((query: string) => ({
            matches: false, // Explicitly false
            addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), // etc
         }));
         refreshMotionTokens(); // Re-run init logic with new mock

         // Need to ensure the listener callback runs if initialization uses it.
         // Calling `prefersReducedMotion()` synchronously relies on the value set during init.
         // Let's re-mock the listener call or trust the init mock.
         // For simplicity, assume init sets the value correctly based on the mock:
         expect(prefersReducedMotion()).toBe(false);
    });

     it('should return true when media query matches', () => {
         mockMatchMedia.mockImplementation((query: string) => ({
            matches: query === '(prefers-reduced-motion: reduce)', // True only for the specific query
            addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), // etc
         }));
         refreshMotionTokens(); // Re-run init logic

         // Manually trigger listener if state update depends on it and isn't sync in test setup
         // Find the listener attached via mockMatchMedia().addEventListener.mock.calls
         const listener = mockMatchMedia().addEventListener.mock.calls.find(call => call[0] === 'change')?.[1];
         if (listener) {
             listener({ matches: true }); // Simulate event
         } else {
            // If init runs synchronously based on initial matchMedia().matches:
            // refresh and re-check might be needed depending on exact init flow.
            // This part can be tricky depending on how state updates are wired.
         }

         expect(prefersReducedMotion()).toBe(true);
     });
});

// Example for testing a helper that uses the tokens
// describe('motiontokens: motionDefaults()', () => {
//     it('should use default tokens when no options provided', () => {
//         const defaults = motionDefaults();
//         expect(defaults.defaults?.duration).toBe(getDuration(EASE.normal)); // Or mocked value
//         expect(defaults.defaults?.ease).toBe(getEase(EASE.default)); // Or mocked value
//     });

//     it('should return 0 duration and "none" ease when reduced motion is preferred', () => {
//         // Mock reduced motion = true
//          mockMatchMedia.mockImplementation((query: string) => ({ matches: true, /* ... */ }));
//          refreshMotionTokens(); // Re-init state
//          // Ensure state is updated (see previous test note on listeners/sync)
//          const listener = mockMatchMedia().addEventListener.mock.calls.find(call => call[0] === 'change')?.[1];
//          if (listener) listener({ matches: true });


//         const defaults = motionDefaults();
//         expect(defaults.defaults?.duration).toBe(0);
//         expect(defaults.defaults?.ease).toBe('none');
//     });
// });