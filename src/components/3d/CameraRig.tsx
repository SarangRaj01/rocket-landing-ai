import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CameraMode } from '../../state/simulationStore';

interface CameraRigProps {
  mode: CameraMode;
  rocketPos: [number, number, number];
}

export const CameraRig: React.FC<CameraRigProps> = ({ mode, rocketPos }) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (mode === 'TOP_DOWN') {
      camera.position.set(0, 24, 0.1);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  }, [mode, camera]);

  useFrame(() => {
    if (mode === 'CINEMATIC') {
      // Dynamic framing: smooth elevation tracking so descending rocket is always visible
      const lookY = Math.max(1.8, Math.min(9.0, rocketPos[1] * 0.45));
      const camY = Math.max(3.2, 2.5 + rocketPos[1] * 0.22);
      const camZ = Math.max(9.2, 8.8 + rocketPos[1] * 0.35);

      const targetVec = new THREE.Vector3(rocketPos[0] * 0.3, lookY, 0);
      const camVec = new THREE.Vector3(0, camY, camZ);

      camera.position.lerp(camVec, 0.05);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetVec, 0.06);
        controlsRef.current.update();
      }
    } else if (mode === 'FOLLOW') {
      // Smoothly follow rocket altitude and horizontal position
      const targetPos = new THREE.Vector3(
        rocketPos[0],
        Math.max(2.5, rocketPos[1] + 1.2),
        rocketPos[2] + 7.5
      );
      camera.position.lerp(targetPos, 0.08);

      const lookTarget = new THREE.Vector3(rocketPos[0], rocketPos[1], rocketPos[2]);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(lookTarget, 0.1);
        controlsRef.current.update();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={mode === 'ORBIT'}
      minDistance={3}
      maxDistance={45}
      maxPolarAngle={Math.PI / 2 - 0.02} // Prevent camera going below ground
      target={[0, 2.0, 0]}
    />
  );
};
