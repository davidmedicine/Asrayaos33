'use client';

/* ──────────────────────────────────────────────────────────────────────────
 * Topbar – Celestial Header
 * ------------------------------------------------------------------------ */

import React, {
  useCallback,
  useEffect,
  useRef,
  unstable_ViewTransition as ReactViewTransition,
} from 'react';
import { shallow } from 'zustand/shallow';
import { gsap } from '@/lib/gsapSetup';

import { cn } from '@/lib/utils';
import { useStore } from '@/lib/state/store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useEscCloseSidebar } from '@/hooks/useEscCloseSidebar';

import { SidebarCollapseIcon } from '@/components/icons/SidebarCollapseIcon';
import { SidebarExpandIcon } from '@/components/icons/SidebarExpandIcon';
import { BellIcon } from '@/components/ui/BellIcon';
import { AsrayaGlyphIcon } from '@/components/icons/AsrayaGlyphIcon';

/* -------------------------------------------------------------------------- */
/* 1.  Feature flags / fall-backs                                             */
/* -------------------------------------------------------------------------- */
const USE_RND_FEATURES = process.env.NEXT_PUBLIC_RND === 'true';

const FallbackVT: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);
const ViewTransition =
  USE_RND_FEATURES && typeof ReactViewTransition !== 'undefined'
    ? (ReactViewTransition as React.FC<{ children: React.ReactNode }>)
    : FallbackVT;

/* -------------------------------------------------------------------------- */
/* 2.  Re-usable class fragments                                              */
/* -------------------------------------------------------------------------- */
const ICON_SIZE = 'size-5';
const BUTTON_SIZE = 'size-9';

const glassButtonBase = cn(
  'btn flex-center isolate rounded-full p-0 transition-all',
  'duration-[var(--duration-normal)] ease-[var(--ease-out-quad)]',
  'hover:transform hover:scale-105',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-glass)]',
  'hover:bg-[var(--glass-btn-hover-bg)] active:bg-[var(--glass-btn-active-bg)]'
);

const userActionBtnClass = 'glass-btn';

/* -------------------------------------------------------------------------- */
/* 3.  Component                                                              */
/* -------------------------------------------------------------------------- */
export default function Topbar() {
  /* -------- Centralised state selects (single store) -------------------- */
  const {
    user,
    isSidebarOpen,
    isSidebarMinimized,
    toggleSidebarOpen,
    toggleSidebarMini,
  } = useStore(
    (s) => ({
      user: s.user,
      isSidebarOpen: s.isSidebarOpen,
      isSidebarMinimized: s.isSidebarMinimized,
      toggleSidebarOpen: s.toggleSidebarOpen,
      toggleSidebarMini: s.toggleSidebarMini,
    }),
    shallow
  );

  /* -------- Local utilities & refs -------------------------------------- */
  const isSmallScreen = useMediaQuery('(max-width: 639px)');
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const notificationBellRef = useRef<HTMLButtonElement>(null);
  const userAvatarRef = useRef<HTMLButtonElement>(null);
  const brandLinkRef = useRef<HTMLAnchorElement>(null);

  /* -------- Toggle logic ------------------------------------------------- */
  const onToggleSidebar = useCallback(() => {
    if (isSmallScreen) {
      toggleSidebarOpen(); // mobile: single open/close
    } else if (!isSidebarOpen) {
      toggleSidebarOpen(); // closed → open
    } else if (isSidebarMinimized) {
      toggleSidebarMini(); // rail → expanded
    } else {
      toggleSidebarOpen(); // expanded → closed
      queueMicrotask(() => sidebarToggleRef.current?.focus());
    }
  }, [
    isSmallScreen,
    isSidebarOpen,
    isSidebarMinimized,
    toggleSidebarOpen,
    toggleSidebarMini,
  ]);

  /* -------- ESC to close on mobile -------------------------------------- */
  useEscCloseSidebar({
    isMobile: isSmallScreen,
    isSidebarOpen,
    isSidebarMinimized,
    toggleSidebarOpen,
    focusRef: sidebarToggleRef,
  });

  /* -------- GSAP hover micro-interactions ------------------------------- */
  useEffect(() => {
    const buttons = [
      sidebarToggleRef.current,
      notificationBellRef.current,
      userAvatarRef.current,
    ].filter(Boolean) as HTMLButtonElement[];

    const brandElement = brandLinkRef.current;
    if (!buttons.length && !brandElement) return;

    const ctx = gsap.context(() => {
      buttons.forEach((btn) => {
        const tl = gsap
          .timeline({ paused: true, defaults: { duration: 0.2, ease: 'power2.out' } })
          .to(btn, { scale: 1.15, transformOrigin: 'center center' })
          .to(btn, { boxShadow: 'var(--header-icon-glow-hover)' }, '-=0.15');

        btn.addEventListener('mouseenter', () => tl.play());
        btn.addEventListener('mouseleave', () => tl.reverse());
      });

      if (brandElement) {
        const glyph = brandElement.querySelector('.asraya-glyph-animatable');
        if (glyph) {
          const brandTl = gsap
            .timeline({ paused: true, defaults: { duration: 0.3, ease: 'sine.inOut' } })
            .to(glyph, { scale: 1.1, opacity: 0.85, transformOrigin: 'center center' })
            .to(glyph, { rotate: 5 }, '-=0.2');

          brandElement.addEventListener('mouseenter', () => brandTl.play());
          brandElement.addEventListener('mouseleave', () => brandTl.reverse());
        }
      }
    });
    return () => ctx.revert();
  }, [user]);

  /* -------- ARIA labels & icon mapping ---------------------------------- */
  const ariaLabelSidebarToggle = isSmallScreen
    ? isSidebarOpen
      ? 'Close Menu'
      : 'Open Menu'
    : !isSidebarOpen
    ? 'Open Sidebar'
    : isSidebarMinimized
    ? 'Expand Sidebar'
    : 'Close Sidebar';

  const SidebarIcon = isSmallScreen
    ? isSidebarOpen
      ? SidebarCollapseIcon
      : SidebarExpandIcon
    : isSidebarMinimized
    ? SidebarExpandIcon
    : SidebarCollapseIcon;

  /* -------- Render ------------------------------------------------------- */
  return (
    <ViewTransition>
      <header
        role="banner"
        aria-label="Celestial Header"
        data-testid="topbar"
        className={cn(
          'relative z-header flex h-[var(--header-height,4.5rem)] items-center justify-between',
          'px-3 sm:px-4 my-2 mx-2 sm:mx-3 rounded-2xl',
          'bg-glass border border-[var(--glass-border)] shadow-[var(--header-glow)]',
          'text-[var(--text-default)] transition-all duration-normal ease-out-quad'
        )}
      >
        {/* ── Left cluster ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            ref={sidebarToggleRef}
            type="button"
            onClick={onToggleSidebar}
            aria-label={ariaLabelSidebarToggle}
            aria-expanded={
              isSmallScreen ? isSidebarOpen : isSidebarOpen && !isSidebarMinimized
            }
            aria-controls="main-sidebar"
            data-testid="sidebar-toggle-button"
            className={cn(glassButtonBase, BUTTON_SIZE)}
          >
            <SidebarIcon className={ICON_SIZE} />
          </button>

          <a
            ref={brandLinkRef}
            href="/"
            aria-label="AsrayaOS Home"
            className="group -ml-1 flex items-center gap-2 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-glass)]"
          >
            <AsrayaGlyphIcon
              className={cn(
                'asraya-glyph-animatable text-[var(--brand-main)] transition-transform duration-fast group-hover:opacity-80',
                isSmallScreen ? 'size-7' : 'size-6'
              )}
            />
            <span
              className={cn(
                'font-display text-lg font-semibold tracking-tight text-[var(--text-heading)]',
                isSmallScreen && 'sr-only'
              )}
            >
              Asraya<span className="font-light opacity-60">OS</span>
            </span>
          </a>
        </div>

        {/* ── Right cluster ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            ref={notificationBellRef}
            type="button"
            aria-label="Echoes & Omens"
            className={cn(glassButtonBase, userActionBtnClass, BUTTON_SIZE)}
          >
            <BellIcon className={ICON_SIZE} />
          </button>

          {user ? (
            <button
              ref={userAvatarRef}
              type="button"
              aria-label={`${user.name} – View Your Constellation`}
              className={cn(glassButtonBase, userActionBtnClass, BUTTON_SIZE, 'overflow-hidden')}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={`${user.name}'s avatar`}
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center bg-[var(--avatar-bg,var(--bg-muted))] text-sm font-medium text-[var(--avatar-fg,var(--text-heading))]">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          ) : (
            <div
              className={cn(
                'animate-pulse rounded-full border border-[var(--glass-border)] bg-[var(--glass-btn-bg)]',
                BUTTON_SIZE
              )}
              aria-label="Loading user information"
            />
          )}
        </div>
      </header>
    </ViewTransition>
  );
}
