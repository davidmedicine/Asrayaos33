/**
 * OrbRenderer.tsx
 * Core WebGL-based visualization for agent representation
 * Uses Three.js with GSAP for state transitions
 */

import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import * as THREE from 'three';
import { useOrbRenderer } from '@/hooks/useOrbRenderer';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { AgentState } from '@/types/agent';

interface OrbRendererProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  pulseOnMount?: boolean;
  showFeedback?: boolean;
  className?: string;
}

export function OrbRenderer({
  size = 'lg', 
  pulseOnMount = false,
  showFeedback = true,
  className = ''
}: OrbRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { activeAgent, agentState } = useInteractionContext();
  
  // Get orbConfig from activeAgent persona or fallback to default Oracle theme
  const orbConfig = activeAgent?.persona.orbConfig || {
    profile: 'nebula',
    noiseScale: 0.8,
    rippleSpeed: 2,
    glowIntensity: 0.6,
  };
  
  // Use the custom hook for Three.js setup and rendering
  const { scene, triggerPulse, updateOrbParams } = useOrbRenderer(canvasRef, orbConfig);
  
  // Handle state changes with GSAP animations
  useGSAP(() => {
    if (!scene) return;
    
    // Map agent state to visual parameters
    const stateParams = {
      thinking: { turbulence: 0.3, pulseSpeed: 0.7, brightness: 0.9 },
      listening: { turbulence: 0.1, pulseSpeed: 1.2, brightness: 1.1 },
      speaking: { turbulence: 0.2, pulseSpeed: 0.9, brightness: 1.0 },
      idle: { turbulence: 0.05, pulseSpeed: 0.5, brightness: 0.8 },
    };
    
    const targetParams = stateParams[agentState || 'idle'];
    
    // Animate to the new state
    gsap.to(scene.userData.orbUniforms, {
      turbulence: targetParams.turbulence,
      pulseSpeed: targetParams.pulseSpeed,
      brightness: targetParams.brightness,
      duration: 0.8,
      ease: "power2.inOut"
    });
    
    // Initial pulse animation if requested
    if (pulseOnMount) {
      triggerPulse('success');
    }
  }, { dependencies: [scene, agentState, pulseOnMount] });
  
  // Update Orb parameters when active agent changes
  useEffect(() => {
    if (activeAgent && scene) {
      updateOrbParams(activeAgent.persona.orbConfig);
    }
  }, [activeAgent, scene, updateOrbParams]);
  
  // Get size class based on prop
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-32 h-32',
    xl: 'w-64 h-64'
  };
  
  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full rounded-full"
        style={{ 
          boxShadow: `0 0 20px -2px var(--agent-glow-color)`, 
          transition: 'box-shadow var(--transition-medium)' 
        }}
      />
      
      {showFeedback && (
        <div className="absolute bottom-0 left-0 w-full text-center pb-2 text-sm font-medium text-text-agent-accent transition-opacity duration-300">
          {agentState === 'thinking' && <span>Thinking...</span>}
          {agentState === 'listening' && <span>Listening...</span>}
        </div>
      )}
    </div>
  );
}