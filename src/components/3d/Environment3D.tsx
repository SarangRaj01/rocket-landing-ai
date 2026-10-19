import React from 'react';
import * as THREE from 'three';

export const Environment3D: React.FC = () => {
  return (
    <group>
      {/* 1. Sunset Sky Dome with Gradient Vertex Colors */}
      <mesh position={[0, -5, 0]}>
        <sphereGeometry args={[95, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshBasicMaterial
          side={THREE.BackSide}
          color="#3b2d54" // Twilight purple
        />
      </mesh>

      {/* Horizon Warm Sunset Glow Band */}
      <mesh position={[0, 4, -40]}>
        <planeGeometry args={[160, 25]} />
        <meshBasicMaterial
          color="#f97316"
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* 2. Low Sun on the Horizon (left side) */}
      <mesh position={[-38, 7, -35]}>
        <circleGeometry args={[6.5, 32]} />
        <meshBasicMaterial color="#ffe4b5" transparent opacity={0.8} />
      </mesh>

      {/* 3. Aerospace Control & Operations Facility Building (Right side) */}
      <group position={[9.5, 0, -4.5]} rotation={[0, -0.3, 0]}>
        {/* Main Hangar / Operations Building */}
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[9.5, 5.0, 7.5]} />
          <meshStandardMaterial color="#47474a" roughness={0.7} metalness={0.2} />
        </mesh>

        {/* Roof Parapet Trim */}
        <mesh position={[0, 5.1, 0]}>
          <boxGeometry args={[9.7, 0.2, 7.7]} />
          <meshStandardMaterial color="#2d2d30" roughness={0.6} />
        </mesh>

        {/* Lit Windows: Warm glowing rectangular panels */}
        {/* Front window strip 1 */}
        <mesh position={[-2.2, 2.6, 3.76]}>
          <planeGeometry args={[1.6, 1.2]} />
          <meshStandardMaterial
            color="#fff0aa"
            emissive="#ffcc44"
            emissiveIntensity={1.4}
            roughness={0.2}
          />
        </mesh>
        {/* Front window strip 2 */}
        <mesh position={[0.2, 2.6, 3.76]}>
          <planeGeometry args={[1.6, 1.2]} />
          <meshStandardMaterial
            color="#fff0aa"
            emissive="#ffcc44"
            emissiveIntensity={1.4}
            roughness={0.2}
          />
        </mesh>
        {/* Front window strip 3 */}
        <mesh position={[2.6, 2.6, 3.76]}>
          <planeGeometry args={[1.6, 1.2]} />
          <meshStandardMaterial
            color="#fff0aa"
            emissive="#ffcc44"
            emissiveIntensity={1.4}
            roughness={0.2}
          />
        </mesh>

        {/* Rooftop Satellite Dish Antenna */}
        <group position={[1.8, 5.2, -0.5]}>
          {/* Mounting post */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.8, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} />
          </mesh>
          {/* Parabolic Dish */}
          <mesh position={[0, 1.1, 0]} rotation={[0.4, 0.2, 0.3]}>
            <sphereGeometry args={[0.9, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.35]} />
            <meshStandardMaterial
              color="#e2e8f0"
              metalness={0.8}
              roughness={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Feed horn */}
          <mesh position={[0.15, 1.5, 0.2]} rotation={[0.4, 0.2, 0.3]}>
            <cylinderGeometry args={[0.03, 0.03, 0.45, 8]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>

        {/* Rooftop HVAC unit */}
        <mesh position={[-2.5, 5.45, 0]}>
          <boxGeometry args={[1.4, 0.7, 1.2]} />
          <meshStandardMaterial color="#333336" metalness={0.6} />
        </mesh>

        {/* Security / Safety Railing along roof edge */}
        <mesh position={[0, 5.4, 3.7]}>
          <boxGeometry args={[9.4, 0.4, 0.05]} />
          <meshStandardMaterial color="#1e2430" metalness={0.8} />
        </mesh>
      </group>

      {/* 4. Distant Aerospace Silhouettes and Low Hills */}
      {/* Distant hangar block 1 */}
      <mesh position={[-18, 1.8, -18]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[14, 3.6, 6]} />
        <meshStandardMaterial color="#1f232b" roughness={0.9} />
      </mesh>
      {/* Distant communication tower */}
      <mesh position={[-25, 6, -22]}>
        <cylinderGeometry args={[0.1, 0.5, 12, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} />
      </mesh>
      {/* Tower warning light */}
      <mesh position={[-25, 12.1, -22]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#ff2222" />
      </mesh>

      {/* Silhouetted Desert Trees / Shrubs in background */}
      {[-12, -8, 4, 15, -20, 20].map((x, i) => (
        <mesh key={i} position={[x, 0.5 + (i % 3) * 0.2, -14 - (i % 4) * 2]}>
          <coneGeometry args={[0.9 + (i % 2) * 0.4, 2.2 + (i % 3) * 0.5, 8]} />
          <meshStandardMaterial color="#151b1e" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};
