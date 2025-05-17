// src/scenes/HubScene.tsx
export default function HubScene() {
    const { invalidate } = useAppStore(state => state);          // rendererSlice
    const activeKey        = useAppStore(s => s.activeSceneKey); // stageSlice
    const objects          = useStageObjects();                  // provided by StageProvider
  
    /* Example: soft spotlight that tracks the “focused” zone */
    useFrame((_, dt) => {
      spotLightRef.current.position.lerp(
        zoneLookup[activeKey ?? "center"],   // vec3 target per zone
        1 - Math.pow(0.001, dt)
      );
      invalidate();                           // make sure demand-loop repaints
    });
  
    return (
      <>
        <color attach="background" args={['#0c111b']} />
        <ambientLight intensity={0.6} />
        <spotLight
          ref={spotLightRef}
          position={[0, 5, 5]}
          angle={0.5}
          penumbra={0.8}
          intensity={1.2}
        />
        {/* panel contributions */}
        {objects}
      </>
    );
  }
  