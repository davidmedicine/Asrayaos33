'use client';

import { useEffect, useState, useRef, RefObject } from 'react';
import { gsap } from '@/lib/gsapSetup';

type ScrollDirection = 'up' | 'down' | 'none';

interface UseScrollDirectionOptions {
  /**
   * Minimum scroll distance before triggering direction change (default: 64)
   */
  threshold?: number;
  /**
   * Element to apply transform to (if not provided, no automatic transform is applied)
   */
  elementRef?: RefObject<HTMLElement>;
  /**
   * Duration of show/hide animation in seconds (default: 0.4)
   */
  animationDuration?: number;
  /**
   * GSAP easing function (default: 'expo.out')
   */
  ease?: string;
  /**
   * CSS transform value for hiding the element (default: 'translateY(-110%)')
   */
  hideTransform?: string;
  /**
   * CSS transform value for showing the element (default: 'translateY(0)')
   */
  showTransform?: string;
  /**
   * Disable effect on small screens (default: true)
   */
  disableOnMobile?: boolean;
  /**
   * Mobile breakpoint in pixels (default: 640)
   */
  mobileBreakpoint?: number;
}

/**
 * Hook that detects scroll direction and can automatically hide/show an element
 * based on scroll direction. Uses GSAP for smooth animations.
 */
export function useScrollDirection({
  threshold = 64,
  elementRef,
  animationDuration = 0.4,
  ease = 'expo.out',
  hideTransform = 'translateY(-110%)',
  showTransform = 'translateY(0)',
  disableOnMobile = true,
  mobileBreakpoint = 640
}: UseScrollDirectionOptions = {}) {
  const [direction, setDirection] = useState<ScrollDirection>('none');
  const [isVisible, setIsVisible] = useState(true);
  
  const lastScrollY = useRef(0);
  const accumulatedScroll = useRef(0);
  const ticking = useRef(false);
  const isMobile = useRef(
    typeof window !== 'undefined' ? window.innerWidth < mobileBreakpoint : false
  );

  useEffect(() => {
    // Update mobile status on resize
    const handleResize = () => {
      isMobile.current = window.innerWidth < mobileBreakpoint;
    };

    // Main scroll handler
    const handleScroll = () => {
      if (ticking.current) return;
      
      ticking.current = true;
      
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDifference = currentScrollY - lastScrollY.current;
        
        // If on mobile and disabled, don't process
        if (disableOnMobile && isMobile.current) {
          // Always keep visible on mobile
          if (elementRef?.current && !isVisible) {
            gsap.to(elementRef.current, {
              transform: showTransform,
              duration: animationDuration,
              ease
            });
            setIsVisible(true);
          }
          
          lastScrollY.current = currentScrollY;
          ticking.current = false;
          return;
        }
        
        // Accumulate scroll distance
        accumulatedScroll.current += scrollDifference;
        
        // Only change direction after threshold is reached
        if (Math.abs(accumulatedScroll.current) >= threshold) {
          const newDirection = accumulatedScroll.current > 0 ? 'down' : 'up';
          
          if (newDirection !== direction) {
            setDirection(newDirection);
            
            // Apply transform animation if element ref provided
            if (elementRef?.current) {
              const shouldShow = newDirection === 'up' || currentScrollY < threshold;
              const newTransform = shouldShow ? showTransform : hideTransform;
              
              gsap.to(elementRef.current, {
                transform: newTransform,
                duration: animationDuration,
                ease
              });
              
              setIsVisible(shouldShow);
            }
            
            // Reset accumulated scroll
            accumulatedScroll.current = 0;
          }
        }
        
        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
    };
    
    // Always show on page load
    if (elementRef?.current) {
      gsap.set(elementRef.current, { transform: showTransform });
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    direction, 
    elementRef, 
    threshold, 
    animationDuration, 
    ease, 
    hideTransform, 
    showTransform, 
    disableOnMobile, 
    mobileBreakpoint,
    isVisible
  ]);
  
  return { direction, isVisible };
}