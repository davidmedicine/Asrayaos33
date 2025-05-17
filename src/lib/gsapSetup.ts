// File: src/lib/gsapSetup.ts (or equivalent path)

/**
 * GSAP Setup Module (Updated for Modern GSAP)
 * --------------------------------------------------------------------------
 * Purpose:
 * - Imports GSAP core and necessary plugins (now mostly free).
 * - Registers all required plugins globally using `gsap.registerPlugin()`.
 *   This MUST run **once** early in the application lifecycle.
 * - Defines and registers custom effects (e.g., particle effects).
 * - Exports the `gsap` core object and relevant plugin objects/constructors.
 * - Exports associated types for improved type safety.
 *
 * IMPORTANT:
 * - Ensure your project usage complies with GSAP's standard license terms.
 *   (https://gsap.com/standard-license/)
 *   A commercial license (e.g., Business Green) might still be required depending
 *   on how you use GSAP in your project (e.g., paid apps, SaaS, multiple sites).
 * - Avoid registering plugins multiple times.
 * --------------------------------------------------------------------------
 */

// Core GSAP
import { gsap } from 'gsap';

// Import GSAP Plugins (directly from the main package)
import { Flip } from 'gsap/Flip';
import { Observer } from 'gsap/Observer';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { PixiPlugin } from 'gsap/PixiPlugin'; // Example: Include if you use PixiJS
// Note: Particles plugin logic is often custom or relies on Physics2D,
// rather than being a standalone import like the others.
// GSAP's 'effects' are used for reusable animations like particles.

// --- Plugin Registration ---
// Register plugins globally ONCE.
try {
    gsap.registerPlugin(
        Flip,
        Observer,
        ScrollSmoother,
        SplitText,
        CustomEase,
        DrawSVGPlugin,
        Physics2DPlugin,
        PixiPlugin // Example registration
        // Note: Particles isn't a plugin to register like this; it's built using effects API + Physics2DPlugin
    );

    // --- Custom GSAP Effect Registration (Example: "embers") ---
    // Define reusable effects here. Requires Physics2DPlugin for physics-based particles.
    // Check if Physics2DPlugin is available before defining physics-based effects
    if (Physics2DPlugin) {
        gsap.registerEffect({
            name: "embers",
            effect: (targets: Element[], config: Record<string, any>) => {
                const { numParticles = 25, color = ["hsl(20, 100%, 60%)", "hsl(35, 100%, 55%)", "hsl(50, 100%, 50%)"], duration = 1.0, container = document.body } = config;
                const bounds = targets[0].getBoundingClientRect(); // Use first target for emitter position
                const containerBounds = container === document.body ? { top: 0, left: 0 } : container.getBoundingClientRect();

                // Calculate emitter position relative to the container or body
                const emitterX = bounds.left + bounds.width / 2 - containerBounds.left;
                const emitterY = bounds.top + bounds.height / 2 - containerBounds.top;

                let particles: HTMLDivElement[] = []; // Ensure particles array is typed
                for (let i = 0; i < numParticles; i++) {
                    let particle = document.createElement("div");
                    particle.style.cssText = `position:absolute; left:0; top:0; width:6px; height:6px; border-radius:50%; background-color:${gsap.utils.random(color)}; pointer-events:none; opacity:0; transform: translate(${emitterX}px, ${emitterY}px);`; // Set initial position via transform
                    container.appendChild(particle); // Append to specified container or body
                    particles.push(particle);
                }

                // Return a GSAP timeline for the effect
                const tl = gsap.timeline({
                    onComplete: () => {
                        // Clean up particles from DOM after animation
                        particles.forEach(p => p.remove());
                        particles = []; // Clear array reference
                    }
                });

                tl.to(particles, {
                    duration: duration,
                    opacity: 1, // Fade in quickly
                    repeat: 1, // Fade in, then fade out via yoyo
                    yoyo: true,
                    ease: "power1.in",
                    stagger: 0.03,
                }, 0); // Staggered fade in/out at the start

                tl.to(particles, {
                    duration: duration, // Match fade duration
                    physics2D: {
                        velocity: "random(120, 250)",
                        angle: "random(240, 300)", // Upward cone
                        gravity: 350,
                    },
                    scale: 0, // Scale down to disappear
                    ease: "sine.out", // Ease out for movement
                    stagger: 0.03,
                }, 0); // Run movement concurrently with fade

                return tl;
            },
            defaults: { duration: 1.0, numParticles: 25, color: ["hsl(20, 100%, 60%)", "hsl(35, 100%, 55%)", "hsl(50, 100%, 50%)"], container: document.body },
            extendTimeline: true,
        });
        console.log('GSAP Custom Effect registered: embers');
    } else {
        console.warn('GSAP Physics2DPlugin not available. Skipping physics-based "embers" effect registration.');
    }


    console.log('GSAP Plugins registered globally:', gsap.config().plugins);

} catch (error) {
    console.error("GSAP Plugin Registration Error:", error);
}


// --- Exports for Application Use ---

// Export constructor/objects for direct use
export {
    gsap,
    Flip,
    Observer,
    ScrollSmoother,
    SplitText,
    CustomEase,
    DrawSVGPlugin,
    Physics2DPlugin,
    PixiPlugin // Example export
    // Particles is not exported directly; use via gsap.effects.effectName
};

// Export types for enhanced type safety
// Note: Types might be directly available under the main 'gsap' namespace now,
// or still within specific plugin type definitions. Check your GSAP version's types.
export type { SplitText as SplitTextType } from 'gsap/SplitText';
export type { Flip as FlipType } from 'gsap/Flip';
export type { Observer as ObserverType } from 'gsap/Observer';
export type { ScrollSmoother as ScrollSmootherType } from 'gsap/ScrollSmoother';
export type { CustomEase as CustomEaseType } from 'gsap/CustomEase';
export type { DrawSVGPlugin as DrawSVGPluginType } from 'gsap/DrawSVGPlugin';
export type { Physics2DPlugin as Physics2DPluginType } from 'gsap/Physics2DPlugin';
export type { PixiPlugin as PixiPluginType } from 'gsap/PixiPlugin';


// --- End of GSAP Setup ---