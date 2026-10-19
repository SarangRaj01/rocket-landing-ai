import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment3D } from './Environment3D';
import { LandingPad } from './LandingPad';
import { Scoreboard3D } from './Scoreboard3D';
import { RocketModel } from './RocketModel';
import { MotionTrail } from './MotionTrail';
import { CameraRig } from './CameraRig';
import { useSimulationStore } from '../../state/simulationStore';

export const SimulationCanvas: React.FC = () => {
  const telemetry = useSimulationStore((s) => s.telemetry);
  const currentEpisodeScore = useSimulationStore((s) => s.currentEpisodeScore);
  const stats = useSimulationStore((s) => s.stats);
  const cameraMode = useSimulationStore((s) => s.cameraMode);
  const showMotionTrail = useSimulationStore((s) => s.showMotionTrail);
  const motionTrailPoints = useSimulationStore((s) => s.motionTrailPoints);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Canvas
        shadows
        camera={{ position: [0, 3.2, 8.8], fov: 48 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        {/* Sky / Scene Ambient & Sunset Illumination */}
        <color attach="background" args={['#241a35']} />
        <ambientLight color="#8a7ca8" intensity={0.8} />

        {/* Warm Golden Sunset Directional Light with Shadows */}
        <directionalLight
          position={[-18, 12, -12]}
          color="#ffaa66"
          intensity={2.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={60}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={20}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0005}
        />

        {/* Hemisphere Sky / Ground bounce light */}
        <hemisphereLight
          args={['#ffc085', '#241a18', 0.6]}
        />

        {/* Fill light from front-right */}
        <directionalLight
          position={[10, 8, 12]}
          color="#7aa2f7"
          intensity={0.6}
        />

        {/* 3D Scene Elements */}
        <Environment3D />
        <LandingPad />

        <Scoreboard3D
          score={currentEpisodeScore}
          episode={stats.totalEpisodes}
          bestReward={stats.bestReward}
          successRate={stats.successRateRecent}
        />

        <RocketModel
          position={telemetry.position}
          rotationEuler={telemetry.rotationEuler}
          throttle={telemetry.throttle}
          rcsPitch={telemetry.rcsPitch}
          rcsRoll={telemetry.rcsRoll}
        />

        <MotionTrail points={motionTrailPoints} visible={showMotionTrail} />

        <CameraRig mode={cameraMode} rocketPos={telemetry.position} />
      </Canvas>
    </div>
  );
};
