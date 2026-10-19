import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createCheckeredTexture } from '../../utils/textureGenerators';

interface RocketModelProps {
  position: [number, number, number];
  rotationEuler: [number, number, number]; // in degrees [pitch, yaw, roll]
  throttle: number;                        // 0 to 1
  rcsPitch: number;                        // -1 to 1
  rcsRoll: number;                         // -1 to 1
}

export const RocketModel: React.FC<RocketModelProps> = ({
  position,
  rotationEuler,
  throttle,
  rcsPitch,
  rcsRoll,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const mainFlameRef = useRef<THREE.Group>(null);
  const rcsLeftRef = useRef<THREE.Mesh>(null);
  const rcsRightRef = useRef<THREE.Mesh>(null);
  const rcsFrontRef = useRef<THREE.Mesh>(null);
  const rcsBackRef = useRef<THREE.Mesh>(null);

  const checkeredTexture = useMemo(() => createCheckeredTexture(), []);

  // Frame animation for flame flicker
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      groupRef.current.rotation.set(
        (rotationEuler[0] * Math.PI) / 180,
        (rotationEuler[1] * Math.PI) / 180,
        (rotationEuler[2] * Math.PI) / 180,
        'YXZ'
      );
    }

    // Main flame dynamics
    if (mainFlameRef.current) {
      if (throttle > 0.02) {
        mainFlameRef.current.visible = true;
        const flicker = 1.0 + (Math.random() - 0.5) * 0.25;
        const flameLength = (0.4 + throttle * 1.8) * flicker;
        mainFlameRef.current.scale.set(0.8 + throttle * 0.4, flameLength, 0.8 + throttle * 0.4);
      } else {
        mainFlameRef.current.visible = false;
      }
    }

    // RCS side jets
    if (rcsLeftRef.current) {
      const active = rcsRoll > 0.1;
      rcsLeftRef.current.visible = active;
      if (active) rcsLeftRef.current.scale.y = 0.5 + Math.abs(rcsRoll) * 0.8;
    }
    if (rcsRightRef.current) {
      const active = rcsRoll < -0.1;
      rcsRightRef.current.visible = active;
      if (active) rcsRightRef.current.scale.y = 0.5 + Math.abs(rcsRoll) * 0.8;
    }
    if (rcsFrontRef.current) {
      const active = rcsPitch > 0.1;
      rcsFrontRef.current.visible = active;
      if (active) rcsFrontRef.current.scale.y = 0.5 + Math.abs(rcsPitch) * 0.8;
    }
    if (rcsBackRef.current) {
      const active = rcsPitch < -0.1;
      rcsBackRef.current.visible = active;
      if (active) rcsBackRef.current.scale.y = 0.5 + Math.abs(rcsPitch) * 0.8;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. Main Fuselage Body: White Cylinder */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.58, 0.6, 2.1, 32]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.25} metalness={0.15} />
      </mesh>

      {/* 2. Checkered Band near top */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.582, 0.582, 0.35, 32]} />
        <meshStandardMaterial map={checkeredTexture} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* 3. Aerodynamic Nose Cone Dome */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.58, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* 4. Top Sensor / Antenna Needle */}
      <mesh position={[0, 2.05, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.2, 12]} />
        <meshStandardMaterial color="#333338" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.16, 0]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#ff5500" roughness={0.2} emissive="#ff4400" emissiveIntensity={0.5} />
      </mesh>

      {/* 5. Circular Blue Observation Porthole Window */}
      <group position={[0, 0.75, 0.58]}>
        {/* Outer chrome bezel */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.03, 16, 32]} />
          <meshStandardMaterial color="#2d3748" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Shiny blue glass lens */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.15, 32]} />
          <meshStandardMaterial
            color="#0066cc"
            roughness={0.1}
            metalness={0.8}
            emissive="#003366"
            emissiveIntensity={0.4}
          />
        </mesh>
      </group>

      {/* 6. Navy / Black Lower Band with Yellow Accent Stripe */}
      <mesh position={[0, -0.72, 0]} castShadow>
        <cylinderGeometry args={[0.602, 0.602, 0.22, 32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, -0.62, 0]}>
        <cylinderGeometry args={[0.604, 0.604, 0.04, 32]} />
        <meshStandardMaterial color="#ffb703" roughness={0.3} />
      </mesh>

      {/* 7. Rocket Engine Bell Nozzle */}
      <mesh position={[0, -1.02, 0]} castShadow>
        <coneGeometry args={[0.38, 0.45, 24, 1, true]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.4}
          metalness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Engine throat ring */}
      <mesh position={[0, -0.82, 0]}>
        <torusGeometry args={[0.22, 0.04, 12, 24]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* 8. Main Exhaust Flame & Core */}
      <group ref={mainFlameRef} position={[0, -1.25, 0]} visible={false}>
        {/* Inner bright yellow-white jet */}
        <mesh position={[0, -0.6, 0]}>
          <coneGeometry args={[0.22, 1.2, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Mid intense cyan/yellow flame */}
        <mesh position={[0, -0.8, 0]}>
          <coneGeometry args={[0.34, 1.6, 16]} />
          <meshBasicMaterial color="#ffdd33" transparent opacity={0.85} />
        </mesh>
        {/* Outer glowing orange flame plume */}
        <mesh position={[0, -1.05, 0]}>
          <coneGeometry args={[0.48, 2.1, 16]} />
          <meshBasicMaterial color="#ff5500" transparent opacity={0.5} />
        </mesh>
        {/* Dynamic flame point light illuminating ground */}
        <pointLight color="#ff7700" intensity={throttle * 12.0} distance={15} decay={2} />
      </group>

      {/* 9. Side RCS Thruster Blocks */}
      {/* Left Pod (+X) */}
      <mesh position={[0.62, 1.15, 0]}>
        <boxGeometry args={[0.1, 0.12, 0.12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>
      {/* Left Jet */}
      <mesh ref={rcsLeftRef} position={[0.75, 1.15, 0]} rotation={[0, 0, -Math.PI / 2]} visible={false}>
        <coneGeometry args={[0.08, 0.5, 12]} />
        <meshBasicMaterial color="#66ccff" transparent opacity={0.85} />
      </mesh>

      {/* Right Pod (-X) */}
      <mesh position={[-0.62, 1.15, 0]}>
        <boxGeometry args={[0.1, 0.12, 0.12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>
      {/* Right Jet */}
      <mesh ref={rcsRightRef} position={[-0.75, 1.15, 0]} rotation={[0, 0, Math.PI / 2]} visible={false}>
        <coneGeometry args={[0.08, 0.5, 12]} />
        <meshBasicMaterial color="#66ccff" transparent opacity={0.85} />
      </mesh>

      {/* Front Pod (+Z) */}
      <mesh position={[0, 1.15, 0.62]}>
        <boxGeometry args={[0.12, 0.12, 0.1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>
      {/* Front Jet */}
      <mesh ref={rcsFrontRef} position={[0, 1.15, 0.75]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[0.08, 0.5, 12]} />
        <meshBasicMaterial color="#66ccff" transparent opacity={0.85} />
      </mesh>

      {/* Back Pod (-Z) */}
      <mesh position={[0, 1.15, -0.62]}>
        <boxGeometry args={[0.12, 0.12, 0.1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>
      {/* Back Jet */}
      <mesh ref={rcsBackRef} position={[0, 1.15, -0.75]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[0.08, 0.5, 12]} />
        <meshBasicMaterial color="#66ccff" transparent opacity={0.85} />
      </mesh>

      {/* 10. Four Articulated Landing Legs with Struts and Footpads */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => {
        return (
          <group key={idx} rotation={[0, angle, 0]}>
            {/* Upper Hinge Bracket attached to fuselage */}
            <mesh position={[0.55, -0.55, 0]}>
              <boxGeometry args={[0.12, 0.16, 0.14]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} />
            </mesh>

            {/* Main Diagonal Leg Strut extending down and out */}
            {/* Starts at (0.55, -0.55, 0) and reaches (1.35, -1.25, 0) */}
            <group position={[0.95, -0.9, 0]} rotation={[0, 0, -Math.PI / 4.4]}>
              {/* Outer tubular strut */}
              <mesh castShadow>
                <cylinderGeometry args={[0.045, 0.04, 1.1, 16]} />
                <meshStandardMaterial color="#f8f9fa" metalness={0.3} roughness={0.3} />
              </mesh>
              {/* Silver hydraulic telescopic piston rod */}
              <mesh position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.6, 16]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
              </mesh>
            </group>

            {/* Horizontal Support Cross-Strut connecting to engine base */}
            <mesh position={[0.65, -0.98, 0]} rotation={[0, 0, -Math.PI / 8]}>
              <cylinderGeometry args={[0.025, 0.025, 0.75, 12]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} />
            </mesh>

            {/* Footpad at the base: wide circular dish with beveled edge */}
            <group position={[1.35, -1.25, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.22, 0.24, 0.06, 24]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.4} metalness={0.2} />
              </mesh>
              {/* Footpad ball joint */}
              <mesh position={[0, 0.06, 0]}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#334155" metalness={0.9} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};
