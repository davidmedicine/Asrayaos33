/**
 * getOrbThemeProfile.ts
 * Utility function to retrieve RESOLVED Orb visual parameters
 * based on OrbConfig overrides and CURRENT theme colors.
 */

import { OrbConfig } from '@/types/agent';

export interface OrbThemeProfile {
  primaryColor: string;    // Resolved color string (e.g., '#8b5cf6' or 'oklch(...)')
  secondaryColor: string;  // Resolved color string
  noiseScale: number;
  rippleSpeed: number;
  glowIntensity: number;
  // Add other resolved parameters
}

// Define default NUMERIC values per profile type
const ORB_PROFILE_DEFAULTS = {
  nebula: { noiseScale: 0.8, rippleSpeed: 2.0, glowIntensity: 0.6 },
  crystal: { noiseScale: 0.5, rippleSpeed: 1.5, glowIntensity: 0.8 },
  flame: { noiseScale: 1.2, rippleSpeed: 3.0, glowIntensity: 0.7 },
  custom: { noiseScale: 0.8, rippleSpeed: 2.0, glowIntensity: 0.6 }, // Fallback for custom
};

/**
 * Calculates the final Orb theme profile by merging profile defaults,
 * agent-specific overrides (config), and current theme colors.
 *
 * @param config - The specific OrbConfig override from the active agent.
 * @param currentPrimaryColor - The RESOLVED primary color from the current theme (CSS variable).
 * @param currentSecondaryColor - The RESOLVED secondary color from the current theme (CSS variable).
 * @param defaultNoiseScale - Fallback noise scale from CSS vars.
 * @param defaultRippleSpeed - Fallback ripple speed from CSS vars.
 * @param defaultGlowIntensity - Fallback glow intensity from CSS vars.
 */
export function getOrbThemeProfile(
    config: OrbConfig | undefined | null,
    currentPrimaryColor: string,
    currentSecondaryColor: string,
    // Pass defaults read from CSS vars by the caller
    defaultNoiseScale: number = 0.8,
    defaultRippleSpeed: number = 2.0,
    defaultGlowIntensity: number = 0.6
): OrbThemeProfile {
    // Determine base numeric profile
    const profileName = config?.profile || 'nebula'; // Default profile
    const baseNumericProfile = ORB_PROFILE_DEFAULTS[profileName as keyof typeof ORB_PROFILE_DEFAULTS] || ORB_PROFILE_DEFAULTS.nebula;

    // Determine final values, prioritizing agent config overrides
    const finalProfile: OrbThemeProfile = {
        // Colors: Use theme colors unless explicitly overridden in config
        primaryColor: config?.color1 || currentPrimaryColor,
        secondaryColor: config?.color2 || currentSecondaryColor,
        // Numerics: Use agent config override, fallback to profile default, fallback to global default
        noiseScale: config?.noiseScale ?? baseNumericProfile.noiseScale ?? defaultNoiseScale,
        rippleSpeed: config?.rippleSpeed ?? baseNumericProfile.rippleSpeed ?? defaultRippleSpeed,
        glowIntensity: config?.glowIntensity ?? baseNumericProfile.glowIntensity ?? defaultGlowIntensity,
    };

    return finalProfile;
}