// === File: src/app/ThemeProviderClient.tsx ===
'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import Cookies from 'js-cookie';

// --- Configuration & Types ---
import type { VALID_THEMES, DEFAULT_THEME } from '@/config/themes'; // Adjust path
// Derive the specific string literal union type from the const array
type Theme = typeof VALID_THEMES[number];

const THEME_COOKIE_NAME = 'theme';
const COOKIE_OPTIONS: Cookies.CookieAttributes = {
    expires: 365,
    path: '/',
    // secure: process.env.NODE_ENV === 'production',
    // sameSite: 'lax',
};

// --- Theme Context Definition ---
interface ThemeContextProps {
    theme: Theme;
    setTheme: (newTheme: Theme) => void;
    possibleThemes: readonly Theme[];
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// --- Custom Hook for Consuming Theme Context ---
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProviderClient');
    }
    return context;
}

// --- Theme Provider Component ---
interface ThemeProviderClientProps {
    children: React.ReactNode;
    possibleThemes: readonly Theme[];
    defaultTheme: Theme;
}

export function ThemeProviderClient({
    children,
    possibleThemes,
    defaultTheme,
}: ThemeProviderClientProps) {

    const [theme, setThemeState] = useState<Theme>(defaultTheme);

    // --- DOM Manipulation Logic ---
    const applyThemeToDOM = useCallback((newTheme: Theme) => {
        // Validate input theme before applying
        const themeToApply = possibleThemes.includes(newTheme) ? newTheme : defaultTheme;
        if (newTheme !== themeToApply) {
             console.warn(`[ThemeProviderClient] Invalid theme "${newTheme}" requested. Falling back to default "${defaultTheme}".`);
        }

        const root = document.documentElement;

        // Clean up old theme classes
        possibleThemes.forEach((t) => {
            root.classList.remove(`theme-${t}`);
        });

        // Add the new theme class
        root.classList.add(`theme-${themeToApply}`);
        root.dataset.agent = themeToApply;
        root.style.colorScheme = 'dark'; // Assuming always dark

        // Optional: Update meta theme-color
        try {
            const themeColorMeta = document.querySelector('meta[name="theme-color"]');
            requestAnimationFrame(() => { // Ensure styles are computed
                const bodyBgColor = getComputedStyle(document.body).getPropertyValue('background-color').trim();
                if (themeColorMeta && bodyBgColor) {
                    themeColorMeta.setAttribute('content', bodyBgColor);
                }
            });
        } catch (error) {
            console.warn("[ThemeProviderClient] Could not update meta theme-color:", error);
        }

    }, [possibleThemes, defaultTheme]);

    // --- Initial Client Load Effect ---
    useEffect(() => {
        const storedCookieValue = Cookies.get(THEME_COOKIE_NAME);

        // --- Type-Safe Validation (Fix for the .includes error) ---
        let validStoredTheme: Theme | null = null;
        if (
            storedCookieValue && // Check if the cookie value exists
            // Explicitly check if the string from cookie exists in the *string* array
            (possibleThemes as ReadonlyArray<string>).includes(storedCookieValue)
           ) {
            // If it exists and is included, *then* we can safely cast it to Theme
            validStoredTheme = storedCookieValue as Theme;
        }
        // --- End of Fix ---

        const effectiveTheme = validStoredTheme || defaultTheme;

        applyThemeToDOM(effectiveTheme);

        if (effectiveTheme !== theme) {
            setThemeState(effectiveTheme);
        }

        // --- Dev Checks (Keep as is) ---
        if (process.env.NODE_ENV === 'development') {
            setTimeout(() => {
                const agentPrimaryColor = getComputedStyle(document.documentElement).getPropertyValue('--agent-color-primary').trim();
                if (!agentPrimaryColor) {
                    console.warn("[ThemeProviderClient DEV CHECK] CSS variable '--agent-color-primary' not found. Check global.css loading and theme class definitions.");
                }
                 const modalContent = document.querySelector('.modal-content');
                 // Example check for @extend removal - adjust selector/property if needed
                 if(modalContent && !modalContent.classList.contains('custom-scrollbar') && getComputedStyle(modalContent).getPropertyValue('scrollbar-width') !== 'thin'){
                     console.warn("[ThemeProviderClient DEV CHECK] '.modal-content' may be missing the 'custom-scrollbar' class. Verify '@extend' was removed in CSS and the class added in JSX.");
                 }
            }, 500);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on initial mount

    // --- Theme Change Handler ---
    const setTheme = useCallback((newTheme: Theme) => {
        if (!possibleThemes.includes(newTheme)) {
            console.warn(`[ThemeProviderClient] setTheme: Attempted to set invalid theme "${newTheme}".`);
            return;
        }
        setThemeState(newTheme);
        applyThemeToDOM(newTheme);
        try {
            Cookies.set(THEME_COOKIE_NAME, newTheme, COOKIE_OPTIONS);
        } catch (error) {
            console.error("[ThemeProviderClient] Failed to set theme cookie:", error);
        }
    }, [possibleThemes, applyThemeToDOM]);

    // --- Context Value Memoization ---
    const contextValue = useMemo(() => ({
        theme,
        setTheme,
        possibleThemes,
    }), [theme, setTheme, possibleThemes]);

    // --- Render Provider ---
    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
}

// --- Reminder Notes (Keep as is) ---
// 1. CSS Conflicts: Resolve overlapping theme systems in global.css.
// 2. Invalid @extend: Remove @extend from global.css; apply classes in JSX.
// 3. Font Variables: Ensure correct application in RootLayout or modify applyThemeToDOM.
// 4. Constants File: Verify src/config/themes.ts exports VALID_THEMES (as const) & DEFAULT_THEME.