/* ──────────────────────────────────────────────────────────────────────────
   classPrimitives.ts           ·   src/lib/utils/classPrimitives.ts
   -------------------------------------------------------------------------
   Centralised “lego bricks” of Tailwind utility strings that we re‑use
   across multiple components.  Keeping them here guarantees that every
   button, link and widget shows the *exact* same focus‑ring and ember
   hover‑glow – no drift, no copy‑paste typos.

   If design tokens change, update the string here once and every consumer
   picks it up automatically.
────────────────────────────────────────────────────────────────────────── */

export const focusRing =
  [
    /* remove default blue outline */
    'focus-visible:outline-none',

    /* halo colour comes from the active agent theme */
    'focus-visible:ring-2',
    'focus-visible:ring-[var(--agent-color-primary)]',

    /* subtle offset so the ring isn’t clipped by rounded corners */
    'focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[var(--bg-surface)]',
  ].join(' ');

/* --------------------------------------------------------------------- */
/* A faint ember‑style glow used on hover *and* keyboard focus.          */
/* Matches the “glow‑primary‑xs” token defined in global.css.            */
/* --------------------------------------------------------------------- */
export const glowHover =
  [
    /* smooth shadow interpolation (respects prefers‑reduced‑motion via global CSS) */
    'transition-shadow',
    'duration-[var(--duration-fast)]',
    'ease-[var(--ease-out)]',

    /* apply on pointer hover OR focus‑visible */
    'hover:shadow-[var(--glow-primary-xs)]',
    'focus-visible:shadow-[var(--glow-primary-xs)]',
  ].join(' ');
