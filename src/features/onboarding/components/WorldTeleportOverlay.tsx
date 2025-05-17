// === File: asrayaos3.4/src/features/onboarding/components/WorldTeleportOverlay.tsx ===

'use client';

/**
 * WorldTeleportOverlay.tsx
 * Full-screen overlay component displaying a GSAP-powered "teleport" animation.
 * Used during significant transitions, like onboarding completion. Includes optional audio cues.
 * (v10.9 - Final Version)
 */

import React, { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
// Note: Ensure CustomEase plugin is registered globally for efficiency.
// import { CustomEase } from 'gsap/CustomEase';

// For audio cues (Ensure 'howler' is installed: npm install howler @types/howler)
import { Howl } from 'howler';
// For sound settings (Assume exists and provides settings)
import { useVoiceStore } from '@/lib/state/store'; // Adjust path as needed

// --- Constants for Animation Parameters ---
const FADE_IN_DURATION = 0.7;
const ORB_GROW_DURATION = 1.8;
const ORB_SCALE = 25;
const BLUR_DURATION = 1.1;
const BLUR_AMOUNT = '16px'; // Consider using theme variable: var(--gsap-teleport-blur, 16px)
const PARTICLE_COUNT = 30;
const PARTICLE_ANIM_DURATION = 1.1;
const PARTICLE_FADE_OUT_DURATION = 0.7;
const PARTICLE_MIN_SIZE = 2;
const PARTICLE_MAX_SIZE = 5;
const PARTICLE_MIN_DIST = 120;
const PARTICLE_MAX_DIST = 220;
const PULSE_DURATION = 0.7;
// Corrected CSS variable fallback uses a direct color value
const PULSE_SHADOW = '0 0 100px 50px var(--agent-color-primary-glow, oklch(60% 0.18 282 / 0.6))'; // Example fallback OKLCH
const FADE_OUT_DURATION = 0.6;
const EASE_MYSTICAL = 'mysticalOut'; // Custom ease alias (must be registered globally)

// --- Sound Assets (paths relative to public folder) ---
// Ensure these sound files exist in your /public/sounds directory
const SOUND_TELEPORT_START = '/sounds/teleport_start.wav';
const SOUND_TELEPORT_END = '/sounds/teleport_end.wav';

interface WorldTeleportOverlayProps {
   isActive: boolean; // Controls the visibility and triggers the animation
   onComplete: () => void; // Callback when the animation finishes
 }

/**
 * Renders a full-screen teleport animation sequence using GSAP when isActive is true.
 * Plays audio cues based on settings and calls onComplete when finished.
 */
export const WorldTeleportOverlay: React.FC<WorldTeleportOverlayProps> = ({
   isActive,
   onComplete
}) => {
   const overlayRef = useRef<HTMLDivElement>(null);
   const orbRef = useRef<HTMLDivElement>(null);
   const particlesRef = useRef<HTMLDivElement>(null);
   // Get sound setting from store (Connects to Suggestion #2)
   const playSounds = useVoiceStore(state => state.settings?.promptToneEnabled ?? true); // Default to true if setting not found

   // Helper for playing sounds
   const playSound = useCallback((src: string, volume: number) => {
       if (!playSounds || typeof window === 'undefined') return; // Respect user setting & SSR guard
       try {
           const sound = new Howl({ src: [src], volume });
           sound.play();
           // Note: Howler handles cleanup automatically for short sounds usually.
       } catch (e) {
           console.error(`Failed to create/play sound: ${src}`, e);
       }
   }, [playSounds]); // Dependency includes the setting

   // Note on GSAP Context vs useGSAP Hook:
   // While useGSAP() is clean here, useEffect + gsap.context() offers robust scoping
   // and cleanup via ctx.revert(), useful for more complex nested animations.

   useGSAP(() => {
     // Only run animation when activated and refs are available
     if (!isActive || !overlayRef.current || !orbRef.current || !particlesRef.current) return;

     // Ensure CustomEase is available (Check + Fallback)
     let currentEase = "power2.out";
     // @ts-ignore - Check if CustomEase is globally available on window via GSAP registration
     if (typeof window.CustomEase === 'function' && CustomEase.get(EASE_MYSTICAL)) {
         currentEase = EASE_MYSTICAL;
     } else if (process.env.NODE_ENV === 'development') {
         console.warn(`GSAP CustomEase '${EASE_MYSTICAL}' not found/registered. Using fallback ease. Register globally.`);
     }

     // --- Play Start Sound ---
     playSound(SOUND_TELEPORT_START, 0.7);

     // --- Particle Creation ---
     // Future Optimization for Testability: Extract this logic into createParticleElement().
     const particles = Array.from({ length: PARTICLE_COUNT }).map(() => {
       const particle = document.createElement('div');
       const size = Math.random() * (PARTICLE_MAX_SIZE - PARTICLE_MIN_SIZE) + PARTICLE_MIN_SIZE;
       // Uses --gsap-particle-color defined in theme, falls back to agent secondary
       particle.className = 'absolute rounded-full bg-[var(--gsap-particle-color,var(--agent-color-secondary))] opacity-0 pointer-events-none';
       particle.style.width = `${size}px`; particle.style.height = `${size}px`;
       particle.style.left = '50%'; particle.style.top = '50%';
       particle.style.transform = 'translate(-50%, -50%)';
       if (particlesRef.current) { particlesRef.current.appendChild(particle); }
       else { console.error("Particle container ref not available."); }
       return particle;
     });

     // --- Animation Timeline ---
     // Future Optimization for Testability: Extract timeline logic to buildTeleportTimeline().
     const tl = gsap.timeline({
       onComplete: () => {
         particles.forEach(p => p?.remove());
         playSound(SOUND_TELEPORT_END, 0.6); // Play end sound
         onComplete();
       }
     });

     // Log duration for debugging
     if (process.env.NODE_ENV === 'development') {
        // Use setTimeout to log after timeline is fully defined
        setTimeout(() => {
            if(tl.isActive()) { // Check if timeline still exists before logging
                 console.debug('[WorldTeleportOverlay] Animation duration:', tl.duration().toFixed(2) + 's');
            }
        }, 0);
        // Note on Exporting Duration: If needed externally, tl.duration() could be passed
        // up via an onStart callback prop: onStart?: (duration: number) => void;
     }

     // --- Define Animation Sequence ---
     tl.to(overlayRef.current, { opacity: 1, duration: FADE_IN_DURATION, ease: "power2.inOut" })
       .to(orbRef.current, { scale: ORB_SCALE, opacity: 0.85, duration: ORB_GROW_DURATION, ease: currentEase }, `-=${FADE_IN_DURATION * 0.5}`)
       .to(overlayRef.current, { backdropFilter: `blur(${BLUR_AMOUNT})`, duration: BLUR_DURATION, ease: "power2.inOut" }, `-=${ORB_GROW_DURATION * 0.9}`)
       .to(particles, {
           xPercent: (i) => {
               const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
               const distance = Math.random() * (PARTICLE_MAX_DIST - PARTICLE_MIN_DIST) + PARTICLE_MIN_DIST;
               return (Math.cos(angle) * distance) / (parseFloat(particles[i].style.width || '1') / 2) * 50; // Adjust for element size
           },
           yPercent: (i) => {
               const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
               const distance = Math.random() * (PARTICLE_MAX_DIST - PARTICLE_MIN_DIST) + PARTICLE_MIN_DIST;
               return (Math.sin(angle) * distance) / (parseFloat(particles[i].style.height || '1') / 2) * 50; // Adjust for element size
           },
           opacity: 0.9, stagger: 0.01, duration: PARTICLE_ANIM_DURATION, ease: "power3.out"
       }, `-=${BLUR_DURATION * 0.8}`)
       .to(particles, { opacity: 0, duration: PARTICLE_FADE_OUT_DURATION, ease: "power2.in", stagger: 0.005 }, `-=${PARTICLE_FADE_OUT_DURATION * 0.5}`)
       .to(orbRef.current, { boxShadow: PULSE_SHADOW, duration: PULSE_DURATION, ease: "power4.in", repeat: 1, yoyo: true }, `-=${PARTICLE_FADE_OUT_DURATION * 1.2}`)
       .to(overlayRef.current, {
           backgroundColor: "var(--bg-surface, white)", // Use theme variable fallback
           backdropFilter: "blur(0px)", duration: FADE_OUT_DURATION, ease: "power2.inOut"
         }, "+=0.1");

     // --- GSAP Cleanup Function ---
     return () => {
       tl.kill(); // Kill the timeline instance to prevent errors on fast unmount
       particles.forEach(p => p?.remove()); // Ensure particles are removed
     };
   }, [isActive, onComplete, playSounds, playSound]); // Added playSounds/playSound to dependencies

   // Render null if not active (prevents unnecessary rendering)
   if (!isActive) return null;

   // Render portal visuals (teleport)
   return (
     <div
       ref={overlayRef}
       data-teleport-overlay="true" // For debugging/styling/testing
       // Optional: Add noise texture via CSS utility class
       className="fixed inset-0 z-[150] flex items-center justify-center opacity-0 bg-bg-body/80 dark:bg-bg-body/90 bg-noise" // Starts transparent
       style={{ backdropFilter: 'blur(0px)' }} // Starts with no blur
       aria-hidden="true" // Hide decorative overlay from screen readers
     >
       {/* Central Orb */}
       <div
         ref={orbRef}
         className="w-12 h-12 rounded-full bg-[var(--agent-color-primary)] opacity-90 shadow-xl origin-center scale-100"
         style={{ boxShadow: '0 0 0px 0px transparent' }} // Initial state for GSAP
       />
       {/* Particle Container */}
       <div
         ref={particlesRef}
         className="absolute inset-0 pointer-events-none" // Particles don't intercept clicks
       />
     </div>
   );
 };

// Ensure file ends with a newline