'use client';

import { useEffect, RefObject } from 'react';
import { gsap } from '@/lib/gsapSetup';

interface UseGlassHoverOptions {
  /**
   * Scale factor for hover effect (default: 1.15)
   */
  scale?: number;
  /**
   * Duration of the animation in seconds (default: 0.2)
   */
  duration?: number;
  /**
   * GSAP easing function (default: 'power2.out')
   */
  ease?: string;
  /**
   * CSS shadow variable to use for glow effect (default: 'var(--header-icon-glow-hover)')
   */
  glowShadow?: string;
}

/**
 * Hook that applies a consistent glass hover effect to elements
 * using GSAP for smooth animations
 */
export function useGlassHover<T extends HTMLElement>(
  elementRefs: RefObject<T> | RefObject<T>[],
  options: UseGlassHoverOptions = {}
) {
  const {
    scale = 1.15,
    duration = 0.2,
    ease = 'power2.out',
    glowShadow = 'var(--header-icon-glow-hover)',
  } = options;

  useEffect(() => {
    // Normalize to array of refs
    const refs = Array.isArray(elementRefs) ? elementRefs : [elementRefs];
    
    // Filter out null refs and get elements
    const elements = refs
      .map(ref => ref.current)
      .filter(Boolean) as HTMLElement[];
    
    if (!elements.length) return;

    const ctx = gsap.context(() => {
      elements.forEach((element) => {
        const tl = gsap
          .timeline({ 
            paused: true, 
            defaults: { duration, ease } 
          })
          .to(element, { 
            scale, 
            transformOrigin: 'center center' 
          })
          .to(element, { 
            boxShadow: glowShadow 
          }, '-=0.15');

        element.addEventListener('mouseenter', () => tl.play());
        element.addEventListener('mouseleave', () => tl.reverse());
      });
    });

    // Clean up animations when component unmounts
    return () => ctx.revert();
  }, [elementRefs, scale, duration, ease, glowShadow]);
}