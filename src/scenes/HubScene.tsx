// src/scenes/HubScene.tsx

'use client';

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { useAppStore } from '@/lib/state/store';
import { useStageObjects } from '@/components/stage/StageProvider';
import gsap from 'gsap';

// === GLSL Fragment Shader ===
const frag = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

// Simple fBM or simplex noise (placeholder)
float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  return mix(mix(rand(i), rand(i + vec2(1.0, 0.0)), f.x),
             mix(rand(i + vec2(0.0, 1.0)), rand(i + vec2(1.0, 1.0)), f.x),
             f.y);
}
float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(st);
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 st = vUv * 3.0;
  float n = fbm(st + uTime * 0.05);
  vec3 col = mix(vec3(0.05, 0.0, 0.15), vec3(0.18, 0.05, 0.35), n);
  gl_FragColor = vec4(col, 1.0);
}
`;

// === Custom Shader Material ===
const NebulaMaterial = shaderMaterial(
  { uTime: 0, uResolution: new THREE.Vector2() },
  undefined,
  frag
);
extend({ NebulaMaterial });

function NebulaPlane({ reduced }: { reduced: boolean }) {
  const ref = useRef<any>();
  const { size } = useThree();

  useEffect(() => {
    if (ref.current) {
      ref.current.material.uResolution.set(size.width, size.height);
    }
  }, [size]);

  useFrame(({ clock }) => {
    if (!reduced && ref.current) {
      ref.current.material.uTime = clock.elapsedTime;
    }
  });

  return (
    <mesh ref={ref} position-z={-5}>
      <planeGeometry args={[20, 12, 1, 1]} />
      {/* @ts-ignore */}
      <nebulaMaterial transparent />
    </mesh>
  );
}

// === Main Scene Component ===
export default function HubScene() {
  const { invalidate } = useAppStore(s => s);
  const activeKey = useAppStore(s => s.activeSceneKey);
  const objects = useStageObjects();

  const spotLightRef = useRef<THREE.SpotLight>(null!);

  const zoneLookup: Record<string, THREE.Vector3> = {
    center: new THREE.Vector3(0, 1.2, 4),
    north: new THREE.Vector3(0, 3, 5),
    east: new THREE.Vector3(3, 1.5, 4),
    west: new THREE.Vector3(-3, 1.5, 4),
    south: new THREE.Vector3(0, -2, 4),
  };

  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  useEffect(() => {
    if (!reducedMotion) {
      const ticker = gsap.ticker.add(() => invalidate());
      return () => gsap.ticker.remove(ticker);
    }
  }, [invalidate, reducedMotion]);

  return (
    <Canvas
      className="absolute inset-0 -z-10"
      frameloop={reducedMotion ? 'demand' : 'always'}
      camera={{ position: [0, 0, 5], fov: 50 }}
      dpr={[1, 1.5]}
    >
      {/* Optional fallback */}
      {reducedMotion ? null : <NebulaPlane reduced={reducedMotion} />}

      <color attach="background" args={['#0c111b']} />
      <ambientLight intensity={0.6} />
      <spotLight
        ref={spotLightRef}
        position={[0, 5, 5]}
        angle={0.5}
        penumbra={0.8}
        intensity={1.2}
      />
      {/* Orbit spotlight dynamically */}
      <FrameUpdater
        ref={spotLightRef}
        target={zoneLookup[activeKey ?? 'center']}
        onFrame={invalidate}
      />
      {objects}
    </Canvas>
  );
}

// === FrameUpdater: Smooth spotlight targeting ===
const FrameUpdater = React.forwardRef<
  THREE.SpotLight,
  { target: THREE.Vector3; onFrame: () => void }
>(({ target, onFrame }, ref) => {
  useFrame((_, dt) => {
    if (ref && 'current' in ref && ref.current) {
      ref.current.position.lerp(target, 1 - Math.pow(0.001, dt));
      onFrame();
    }
  });
  return null;
});
FrameUpdater.displayName = 'FrameUpdater';
