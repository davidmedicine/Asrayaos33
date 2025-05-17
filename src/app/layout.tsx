// -----------------------------------------------------------------------------
// File: src/app/layout.tsx         (App Router – *server* component)
// -----------------------------------------------------------------------------
// • Provides the HTML shell for every route.
// • Wraps the client-side context providers: Auth ➜ React-Query ➜ Theme.
// -----------------------------------------------------------------------------

import '@/styles/globals.css';
import '@/styles/firefox-fallbacks.css';
import '@/styles/agent-themes.css';

import React, { ReactNode } from 'react';
import { Inter } from 'next/font/google';

import { cn } from '@/lib/utils';
import { VALID_THEMES, DEFAULT_THEME } from '@/config/themes';
import { AuthProvider } from '@/features/hub/components/AuthContext';          // NEW
import { ReactQueryProvider } from '@/lib/react-query/ReactQueryProvider';
import { ThemeProviderClient } from './ThemeProviderClient';

const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans' });

/* -------------------------------------------------------------------------- */
/*  Metadata (preferred over raw <head> tags in App Router)                   */
/* -------------------------------------------------------------------------- */
export const metadata = {
  title:  'Asraya OS',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0b0b0f',
  icons: { icon: '/favicon.ico' },
};

/* -------------------------------------------------------------------------- */
/*  Root Layout                                                               */
/* -------------------------------------------------------------------------- */
export default function RootLayout({ children }: { children: ReactNode }) {
  const serverTheme = DEFAULT_THEME;               // e.g. "oracle"
  const themeClass  = `theme-${serverTheme}`;      // => .theme-oracle { … }

  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={cn(themeClass, fontSans.variable)}
      data-agent={serverTheme}
      style={{ colorScheme: 'dark' }}              /* keeps system UI in sync */
    >
      <body
        className={cn(
          'min-h-screen font-sans antialiased',
          'bg-[var(--bg-body)] text-[var(--text-default)]',
          'bg-gradient-body texture-noise-subtle',
        )}
      >
        {/* ---------- CLIENT-SIDE CONTEXT PROVIDERS ---------- */}
        <AuthProvider>                              {/* <— NEW outer wrapper */}
          <ReactQueryProvider>
            <ThemeProviderClient
              possibleThemes={VALID_THEMES}
              defaultTheme={serverTheme}
            >
              {/* All routed UI lives here */}
              <div className="flex h-full min-h-screen w-full flex-col">
                {children}
              </div>

              {/* React-Portal mount-point for modals / toasts */}
              <div id="modal-root" />
            </ThemeProviderClient>
          </ReactQueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
