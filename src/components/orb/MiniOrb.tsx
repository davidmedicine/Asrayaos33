/**
 * MiniOrb.tsx
 * A small visual representation of the Orb state for UI elements like AgentChipDisplay.
 * Uses CSS/SVG implementation instead of WebGL for better performance at small sizes.
 */

import { useEffect, useState, useMemo } from 'react';
import { useInteractionContext } from '@/hooks/useInteractionContext';

interface MiniOrbProps {
  agentId?: string; // Optional override for active agent
  state?: 'idle' | 'thinking' | 'streaming' | 'listening' | 'error'; // Optional override for state
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function MiniOrb({
  agentId,
  state: stateProp,
  size = 'sm',
  className = ''
}: MiniOrbProps) {
  const { activeAgent, agents, agentOrbState } = useInteractionContext();
  
  // Use provided agent ID or fall back to active agent
  const agent = agentId 
    ? agents.find(a => a.id === agentId) 
    : activeAgent;
  
  // Use provided state or fall back to context state
  const state = stateProp || agentOrbState;
  
  // Get primary and secondary colors from agent theme
  const [primaryColor, setPrimaryColor] = useState('var(--agent-color-primary)');
  const [secondaryColor, setSecondaryColor] = useState('var(--agent-color-secondary)');
  
  // Effect to read computed CSS variables for colors
  useEffect(() => {
    if (document) {
      const computedStyle = getComputedStyle(document.documentElement);
      setPrimaryColor(computedStyle.getPropertyValue('--agent-color-primary').trim());
      setSecondaryColor(computedStyle.getPropertyValue('--agent-color-secondary').trim());
    }
  }, [agent?.id]); // More direct reactivity based on agent change
  
  // Determine size class
  const sizeClass = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8'
  }[size];
  
  // Derive animation and appearance based on state using standard Tailwind
  const stateClasses = useMemo(() => {
    switch (state) {
      case 'thinking':
        return 'animate-pulse opacity-100';
      case 'streaming':
        return 'animate-pulse opacity-100';
      case 'listening':
        return 'animate-pulse opacity-100';
      case 'error':
        return 'opacity-90 border border-[var(--color-error)]';
      case 'idle':
      default:
        return 'opacity-80';
    }
  }, [state]);
  
  // Generate radial gradient with agent theme colors
  const gradientStyle = useMemo(() => ({
    background: `radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor} 100%)`
  }), [primaryColor, secondaryColor]);
  
  // Generate shadow style based on state
  const shadowStyle = useMemo(() => ({
    boxShadow: state === 'error'
      ? `0 0 6px 1px color-mix(in oklch, var(--color-error) 70%, transparent)`
      : `0 0 6px 0px color-mix(in oklch, ${primaryColor} 50%, transparent)`
  }), [state, primaryColor]);
  
  return (
    <div 
      className={`rounded-full ${sizeClass} ${stateClasses} transition-all duration-300 ease-[var(--ease-standard)] ${className}`}
      style={{
        ...gradientStyle,
        ...shadowStyle
      }}
      aria-label={`Agent state: ${state}`}
    />
  );
}