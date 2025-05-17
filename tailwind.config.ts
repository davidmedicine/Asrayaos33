/**
 * Tailwind Config · v3.0.5
 * Maintainer: @design-system
 *
 * – Dark-mode via `.dark` class.
 * – Uses logical & container-query core plugins (tailwind-css-logical + Tailwind v4 flags).
 * – Custom tokens are mapped straight to CSS variables defined in src/styles/global.css.
 * – Keyframes live in src/styles/animations.css (purged via content globs).
 */

import type { Config } from 'tailwindcss';
import animatePlugin      from 'tailwindcss-animate';
import logicalPlugin      from 'tailwindcss-logical';
import plugin             from 'tailwindcss/plugin';

const config: Config = {
  darkMode: ['class'],

  experimental: {
    optimizeUniversalDefaults: true,
    // These two flags are recognised in Tailwind v4 (already behind ‘experimental’ in canary)
    // but are harmless in v3 – they simply no-op if unsupported.
    logical: true,
    container: true,
  },

  content: {
    files: [
      './app/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/features/**/*.{js,ts,jsx,tsx,mdx}',
      './src/styles/global.css',
      './src/styles/animations.css',
    ],
    relative: true,
  },

  /*
   * Safelist — ONLY classes generated at runtime (e.g. via `clsx` / props).
   * Run “npx tailwindcss --report” in CI to flag unused patterns.
   */
  safelist: [
    'theme-oracle',
    'theme-muse',
    { pattern: /^btn-(primary|secondary|creative|value|danger|ghost)$/ },
    { pattern: /^badge-(default|creative|value|success)$/ },
    { pattern: /^(bg|text|border)-(wisdom-indigo-500|create-magenta-500|value-amber-500)$/ },
    { pattern: /^(animate-border-rotate|animate-shine|animate-pulse-subtle)$/ },
  ],

  theme: {
    extend: {
      /* ------------------------------------------------------------------ */
      /*  Design Tokens → CSS Variables                                     */
      /* ------------------------------------------------------------------ */

      colors: {
        'focus-ring-color'   : 'var(--focus-ring-color)',          /* WCAG-checked value in global.css  */
        danger               : 'var(--color-danger-red-500)',

        'wisdom-indigo-500'  : 'var(--color-wisdom-indigo-500)',
        'create-magenta-500' : 'var(--color-create-magenta-500)',
        'value-amber-500'    : 'var(--color-value-amber-500)',

        /* Agent palette (flatter keys = simpler utilities) */
        'agent-primary'   : 'var(--color-agent-primary)',
        'agent-secondary' : 'var(--color-agent-secondary)',
      },

      backgroundColor: {
        body           : 'var(--bg-body)',
        surface        : 'var(--bg-surface)',
        subtle         : 'var(--bg-subtle)',
        muted          : 'var(--bg-muted)',
        hover          : 'var(--bg-hover)',
        active         : 'var(--bg-active)',
        'agent-primary': 'var(--bg-agent-primary)',
        'agent-secondary':'var(--bg-agent-secondary)',
      },

      textColor: {
        default        : 'var(--text-default)',
        muted          : 'var(--text-muted)',
        heading        : 'var(--text-heading)',
        danger         : 'var(--color-danger-red-500)',
        focus          : 'var(--focus-ring-color)',
        'agent-primary': 'var(--text-agent-primary)',
        'agent-secondary':'var(--text-agent-secondary)',
      },

      borderColor: {
        default        : 'var(--border-default)',
        muted          : 'var(--border-muted)',
        focus          : 'var(--focus-ring-color)',
        danger         : 'var(--color-danger-red-500)',
        'agent-primary': 'var(--border-agent-primary)',
      },

      /* ------------------------------------------------------------------ */
      /*  Focus ring utilities                                              */
      /* ------------------------------------------------------------------ */

      ringColor: {
        focus: 'var(--focus-ring-color)',
      },
      ringWidth: {
        focus: 'var(--focus-ring-width)', /* e.g. 2px in global.css */
      },

      /* ------------------------------------------------------------------ */
      /*  Spacing + sizing                                                  */
      /* ------------------------------------------------------------------ */

      spacing: {
        '1.5': '0.375rem',  // 6 px
        '5'  : '1.25rem',   // 20 px
      },

      minWidth : theme => ({ ...theme('spacing') }),
      height   : theme => ({ ...theme('spacing') }),

      /* ------------------------------------------------------------------ */
      /*  Animations — keyframes live in animations.css                     */
      /* ------------------------------------------------------------------ */

      animation: {
        'border-rotate' : 'border-rotate 6s linear infinite',
        shine           : 'shine 2s linear infinite',
        'pulse-subtle'  : 'pulse-subtle 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },

  plugins: [
    logicalPlugin,
    animatePlugin,
    plugin(({ addVariant }) => {
      /* Radix UI data-state helpers  */
      addVariant('data-state-active'  , '&[data-state="active"]');
      addVariant('data-state-open'    , '&[data-state="open"]');
      addVariant('data-state-closed'  , '&[data-state="closed"]');
      addVariant('data-state-checked' , '&[data-state="checked"]');
      addVariant('data-state-unchecked','&[data-state="unchecked"]');
    }),
  ],
};

export default config;
