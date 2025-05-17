/**
 * themeUtils.ts
 * Utilities for applying agent themes to elements
 * v1.8 - Implementation with enhanced capabilities
 */

import type { CSSProperties } from 'react';
import { AsrayaAgentId } from '@/types/agent';
import { getAgentData, DEFAULT_AGENT_ID } from '@/lib/core/agentRegistry';

/**
 * Gets the theme class for an agent without DOM manipulation
 * @param agentId - The agent ID to get theme class for
 * @param fallbackAgentId - Optional fallback agent ID (defaults to DEFAULT_AGENT_ID)
 * @returns The theme class name
 */
export function getThemeClass(
  agentId: AsrayaAgentId | string | null | undefined,
  fallbackAgentId: AsrayaAgentId = DEFAULT_AGENT_ID
): string {
  return getAgentData(agentId, fallbackAgentId).themeClass;
}

/**
 * Applies the appropriate theme class to an HTML element based on the agent ID
 * @param element - The HTML element to apply the theme to
 * @param agentId - The agent ID to use for theming
 * @param fallbackAgentId - Optional fallback agent ID (defaults to DEFAULT_AGENT_ID)
 */
export function applyTheme(
  element: HTMLElement | null,
  agentId: AsrayaAgentId | string | null | undefined,
  fallbackAgentId: AsrayaAgentId = DEFAULT_AGENT_ID
): void {
  // Return early if no element provided
  if (!element) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ThemeUtils] applyTheme called with null element');
    }
    return;
  }
  
  // Get theme class from agent registry
  const themeClass = getThemeClass(agentId, fallbackAgentId);
  
  // Remove any existing theme classes
  const themeClasses = Array.from(element.classList)
    .filter(className => className.startsWith('theme-'));
  
  if (themeClasses.length > 0) {
    element.classList.remove(...themeClasses);
  }
  
  // Add the new theme class
  element.classList.add(themeClass);
  
  // Add data attribute for agent ID for easier debugging/styling
  element.setAttribute('data-agent-id', getAgentData(agentId, fallbackAgentId).id);
}

/**
 * Gets appropriate CSS variable value for an agent's primary color
 * @param agentId - The agent ID to get color variable for
 * @param fallbackAgentId - Optional fallback agent ID
 * @returns CSS variable for the agent's primary color
 */
export function getAgentColorVariable(
  agentId: AsrayaAgentId | string | null | undefined,
  fallbackAgentId: AsrayaAgentId = DEFAULT_AGENT_ID
): string {
  const agentData = getAgentData(agentId, fallbackAgentId);
  return agentData.colorTokens.primary;
}

/**
 * Gets appropriate CSS variable value for an agent's secondary color
 * @param agentId - The agent ID to get color variable for
 * @param fallbackAgentId - Optional fallback agent ID
 * @returns CSS variable for the agent's secondary color
 */
export function getAgentSecondaryColorVariable(
  agentId: AsrayaAgentId | string | null | undefined,
  fallbackAgentId: AsrayaAgentId = DEFAULT_AGENT_ID
): string {
  const agentData = getAgentData(agentId, fallbackAgentId);
  return agentData.colorTokens.secondary;
}

/**
 * Generates a dynamic glow effect for an agent
 * @param agentId - The agent ID
 * @param intensity - Glow intensity ('xs', 'sm', 'md', 'lg')
 * @param fallbackAgentId - Fallback agent ID
 * @returns CSS box-shadow value for the glow effect
 */
export function getAgentGlow(
  agentId: AsrayaAgentId | string | null | undefined,
  intensity: 'xs' | 'sm' | 'md' | 'lg' = 'sm',
  fallbackAgentId: AsrayaAgentId = DEFAULT_AGENT_ID
): string {
  const agentData = getAgentData(agentId, fallbackAgentId);
  const colorVar = agentData.colorTokens.primary;
  
  // Size mapping for different intensities
  const sizePx = {
    'xs': '0 0 6px 1px',
    'sm': '0 0 12px 3px',
    'md': '0 0 18px 5px',
    'lg': '0 0 24px 8px'
  };
  
  // Opacity mapping for different intensities
  const opacityPercentage = {
    'xs': '40%',
    'sm': '50%',
    'md': '60%',
    'lg': '70%'
  };
  
  return `${sizePx[intensity]} color-mix(in oklch, ${colorVar} ${opacityPercentage[intensity]}, transparent)`;
}

/**
 * Generates a React CSSProperties object with glow effect for an agent
 * @param agentId - The agent ID
 * @param intensity - Glow intensity ('xs', 'sm', 'md', 'lg')
 * @param fallbackAgentId - Fallback agent ID
 * @returns React.CSSProperties object with boxShadow property
 */
export function getAgentGlowStyle(
  agentId: AsrayaAgentId | string | null | undefined,
  intensity: 'xs' | 'sm' | 'md' | 'lg' = 'sm',
  fallbackAgentId: AsrayaAgentId = DEFAULT_AGENT_ID
): CSSProperties {
  return { boxShadow: getAgentGlow(agentId, intensity, fallbackAgentId) };
}

/**
 * Gets the avatar gradient for an agent
 * @param agentId - The agent ID
 * @param fallbackAgentId - Fallback agent ID
 * @returns CSS background gradient value
 */
export function getAgentAvatarGradient(
  agentId: AsrayaAgentId | string | null | undefined,
  fallbackAgentId: AsrayaAgentId = DEFAULT_AGENT_ID
): string {
  const agentData = getAgentData(agentId, fallbackAgentId);
  return agentData.colorTokens.avatarGradient;
}

/**
 * Gets the avatar gradient as a React CSSProperties object
 * @param agentId - The agent ID
 * @param fallbackAgentId - Fallback agent ID
 * @returns React.CSSProperties object with background property
 */
export function getAgentAvatarGradientStyle(
  agentId: AsrayaAgentId | string | null | undefined,
  fallbackAgentId: AsrayaAgentId = DEFAULT_AGENT_ID
): CSSProperties {
  return { background: getAgentAvatarGradient(agentId, fallbackAgentId) };
}