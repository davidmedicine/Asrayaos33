/**
 * useOrbRenderer.ts
 * Custom hook encapsulating Three.js logic for Orb setup, animation, and state updates
 * Uses GSAP for complex animations and state transitions
 */

import { useEffect, useRef, useState, RefObject } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { getOrbThemeProfile } from '@/lib/theme/getOrbThemeProfile';
import { OrbConfig } from '@/types/agent';

type PulseType = 'success' | 'error' | 'info' | 'warning';

export function useOrbRenderer(
  canvasRef: RefObject<HTMLCanvasElement>,
  config: OrbConfig
) {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number>(0);
  const orbMeshRef = useRef<THREE.Mesh | null>(null);
  const uniformsRef = useRef<any>({
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) },
    turbulence: { value: 0.05 },
    pulseSpeed: { value: 0.5 },
    brightness: { value: 0.8 },
    colorPrimary: { value: new THREE.Color(0x9c6ade) },
    colorSecondary: { value: new THREE.Color(0xd4a9ff) },
    noiseScale: { value: config.noiseScale || 0.8 },
    rippleSpeed: { value: config.rippleSpeed || 2.0 },
    glowIntensity: { value: config.glowIntensity || 0.6 },
  });

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Create camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Create scene
    const newScene = new THREE.Scene();
    
    // Create orb mesh with shader material
    const orbGeometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Get theme profile colors from config
    const themeProfile = getOrbThemeProfile(config);
    uniformsRef.current.colorPrimary.value = new THREE.Color(themeProfile.primaryColor);
    uniformsRef.current.colorSecondary.value = new THREE.Color(themeProfile.secondaryColor);
    uniformsRef.current.noiseScale.value = config.noiseScale || 0.8;
    uniformsRef.current.rippleSpeed.value = config.rippleSpeed || 2.0;
    uniformsRef.current.glowIntensity.value = config.glowIntensity || 0.6;
    
    // Vertex shader code (placeholder - would be more complex in real implementation)
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    // Fragment shader code (placeholder - would be more complex in real implementation)
    const fragmentShader = `
      uniform float time;
      uniform vec2 resolution;
      uniform float turbulence;
      uniform float pulseSpeed;
      uniform float brightness;
      uniform vec3 colorPrimary;
      uniform vec3 colorSecondary;
      uniform float noiseScale;
      uniform float rippleSpeed;
      uniform float glowIntensity;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      
      // Simplex noise function would go here
      
      void main() {
        // Calculate noise based on position and time
        float noise = turbulence * sin(vUv.x * 10.0 * noiseScale + time * pulseSpeed) * 
                     cos(vUv.y * 8.0 * noiseScale + time * pulseSpeed * 0.8);
        
        // Calculate glow based on view angle
        float glow = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0) * glowIntensity;
        
        // Mix colors based on noise and glow
        vec3 color = mix(colorPrimary, colorSecondary, noise + glow) * brightness;
        
        // Output final color with alpha based on glow
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    
    const orbMaterial = new THREE.ShaderMaterial({
      uniforms: uniformsRef.current,
      vertexShader,
      fragmentShader,
      transparent: true,
    });
    
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    newScene.add(orb);
    orbMeshRef.current = orb;
    
    // Store uniforms for animation access
    newScene.userData.orbUniforms = uniformsRef.current;
    
    // Animation loop
    const animate = () => {
      uniformsRef.current.time.value += 0.01;
      renderer.render(newScene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    setScene(newScene);
    
    // Handle resize
    const handleResize = () => {
      if (!canvas || !renderer || !camera) return;
      
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
      uniformsRef.current.resolution.value.set(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      
      if (renderer) {
        renderer.dispose();
      }
      
      if (orbMeshRef.current) {
        orbMeshRef.current.geometry.dispose();
        (orbMeshRef.current.material as THREE.Material).dispose();
      }
    };
  }, [canvasRef]);
  
  // Function to update orb parameters based on config
  const updateOrbParams = (newConfig: OrbConfig) => {
    if (!scene || !uniformsRef.current) return;
    
    const themeProfile = getOrbThemeProfile(newConfig);
    
    // Use GSAP to animate the transition to new colors and parameters
    gsap.to(uniformsRef.current.colorPrimary.value, {
      r: new THREE.Color(themeProfile.primaryColor).r,
      g: new THREE.Color(themeProfile.primaryColor).g,
      b: new THREE.Color(themeProfile.primaryColor).b,
      duration: 0.8,
      ease: "power2.inOut"
    });
    
    gsap.to(uniformsRef.current.colorSecondary.value, {
      r: new THREE.Color(themeProfile.secondaryColor).r,
      g: new THREE.Color(themeProfile.secondaryColor).g,
      b: new THREE.Color(themeProfile.secondaryColor).b,
      duration: 0.8,
      ease: "power2.inOut"
    });
    
    gsap.to(uniformsRef.current, {
      noiseScale: newConfig.noiseScale || 0.8,
      rippleSpeed: newConfig.rippleSpeed || 2.0,
      glowIntensity: newConfig.glowIntensity || 0.6,
      duration: 0.8,
      ease: "power2.inOut"
    });
  };
  
  // Function to trigger a pulse animation
  const triggerPulse = (type: PulseType) => {
    if (!scene || !orbMeshRef.current) return;
    
    // Get color based on pulse type
    let pulseColor: THREE.Color;
    switch (type) {
      case 'success':
        pulseColor = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim());
        break;
      case 'error':
        pulseColor = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--color-error').trim());
        break;
      case 'info':
        pulseColor = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--color-info').trim());
        break;
      case 'warning':
        pulseColor = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--color-warning').trim());
        break;
    }
    
    // Store original colors
    const originalPrimary = uniformsRef.current.colorPrimary.value.clone();
    const originalSecondary = uniformsRef.current.colorSecondary.value.clone();
    const originalTurbulence = uniformsRef.current.turbulence.value;
    const originalGlow = uniformsRef.current.glowIntensity.value;
    
    // Create a timeline for the pulse animation
    const timeline = gsap.timeline();
    
    // Pulse effect
    timeline.to(uniformsRef.current, {
      turbulence: originalTurbulence * 3,
      glowIntensity: originalGlow * 2,
      duration: 0.3,
      ease: "power2.in"
    });
    
    timeline.to(uniformsRef.current.colorPrimary.value, {
      r: pulseColor.r,
      g: pulseColor.g,
      b: pulseColor.b,
      duration: 0.3,
      ease: "power2.in"
    }, "<");
    
    // Return to original state
    timeline.to(uniformsRef.current, {
      turbulence: originalTurbulence,
      glowIntensity: originalGlow,
      duration: 0.6,
      ease: "power2.out"
    });
    
    timeline.to(uniformsRef.current.colorPrimary.value, {
      r: originalPrimary.r,
      g: originalPrimary.g,
      b: originalPrimary.b,
      duration: 0.6,
      ease: "power2.out"
    }, "<");
    
    // Scale pulse
    timeline.to(orbMeshRef.current.scale, {
      x: 1.1, y: 1.1, z: 1.1,
      duration: 0.3,
      ease: "power2.in"
    }, 0);
    
    timeline.to(orbMeshRef.current.scale, {
      x: 1, y: 1, z: 1,
      duration: 0.6,
      ease: "elastic.out(1, 0.3)"
    });
    
    return timeline;
  };
  
  return { scene, triggerPulse, updateOrbParams };
}