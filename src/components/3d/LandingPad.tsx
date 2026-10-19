import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createLandingPadTexture } from '../../utils/textureGenerators';

export const LandingPad: React.FC = () => {
  const padTexture = useMemo(() => createLandingPadTexture(), []);

  // Runway boundary lights around pad perimeter (16 lights)
  const perimeterLights = useMemo(() => {
    const lights: { x: number; z: number; angle: number }[] = [];
    const count = 16;
    const radius = 3.95;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      lights.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        angle,
      });
    }
    return lights;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Surrounding Ground Plane (Airfield / Desert Terrain) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#2d2824" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* 2. Elevated Concrete Landing Platform */}
      <mesh position={[0, 0.04, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[4.25, 4.35, 0.08, 64]} />
        <meshStandardMaterial
          map={padTexture}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Beveled Outer Curb Ring lying flat */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.25, 0.04, 12, 64]} />
        <meshStandardMaterial color="#4a4a4c" roughness={0.7} />
      </mesh>

      {/* 3. Runway Boundary Lights on Outer Ring */}
      {perimeterLights.map((light, idx) => (
        <group key={idx} position={[light.x, 0.08, light.z]}>
          {/* Base fixture */}
          <mesh>
            <cylinderGeometry args={[0.07, 0.09, 0.05, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          {/* Glowing dome lens */}
          <mesh position={[0, 0.03, 0]}>
            <sphereGeometry args={[0.05, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial
              color="#fff8e7"
              emissive="#ffcc66"
              emissiveIntensity={1.8}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* 4. Small Orange Safety Traffic Cone (exact detail from reference screenshot!) */}
      <group position={[0.65, 0.08, -0.9]} rotation={[0, 0.4, 0]}>
        {/* Square black rubber base */}
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.26, 0.02, 0.26]} />
          <meshStandardMaterial color="#111116" roughness={0.9} />
        </mesh>
        {/* Orange tapered cone body */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <coneGeometry args={[0.09, 0.42, 16]} />
          <meshStandardMaterial color="#ff5500" roughness={0.4} />
        </mesh>
        {/* White reflective safety stripe */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.065, 0.075, 0.08, 16]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};
