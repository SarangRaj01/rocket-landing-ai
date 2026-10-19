import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { updateScoreboardCanvas } from '../../utils/textureGenerators';

interface Scoreboard3DProps {
  score: number;
  episode: number;
  bestReward: number;
  successRate: number;
}

export const Scoreboard3D: React.FC<Scoreboard3DProps> = ({
  score,
  episode,
  bestReward,
  successRate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    updateScoreboardCanvas(c, score, episode, bestReward, successRate);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return { canvas: c, texture: tex };
  }, []);

  useEffect(() => {
    canvasRef.current = canvas;
    textureRef.current = texture;
  }, [canvas, texture]);

  // Update canvas texture whenever score or stats change
  useEffect(() => {
    if (canvasRef.current && textureRef.current) {
      updateScoreboardCanvas(canvasRef.current, score, episode, bestReward, successRate);
      textureRef.current.needsUpdate = true;
    }
  }, [score, episode, bestReward, successRate]);

  return (
    // Positioned on the left side of the pad, angled slightly inward toward camera
    <group position={[-5.8, 0, -2.8]} rotation={[0, 0.45, 0]}>
      {/* 1. Left Vertical Steel Stanchion Post */}
      <mesh position={[-2.2, 2.0, 0]} castShadow>
        <boxGeometry args={[0.18, 4.0, 0.18]} />
        <meshStandardMaterial color="#1e2430" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Left Concrete Foundation Footing */}
      <mesh position={[-2.2, 0.1, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.25, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* 2. Right Vertical Steel Stanchion Post */}
      <mesh position={[2.2, 2.0, 0]} castShadow>
        <boxGeometry args={[0.18, 4.0, 0.18]} />
        <meshStandardMaterial color="#1e2430" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Right Concrete Foundation Footing */}
      <mesh position={[2.2, 0.1, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.25, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* Rear Support Diagonal Struts */}
      <mesh position={[-2.2, 1.8, -0.9]} rotation={[0.45, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.6, 12]} />
        <meshStandardMaterial color="#1e2430" metalness={0.8} />
      </mesh>
      <mesh position={[2.2, 1.8, -0.9]} rotation={[0.45, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.6, 12]} />
        <meshStandardMaterial color="#1e2430" metalness={0.8} />
      </mesh>

      {/* 3. Scoreboard Main Chassis / Backing */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[5.2, 2.6, 0.25]} />
        <meshStandardMaterial color="#0a0b0e" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Dark Outer Frame Bezel */}
      <mesh position={[0, 3.2, 0.1]}>
        <boxGeometry args={[5.28, 2.68, 0.06]} />
        <meshStandardMaterial color="#181c24" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* 4. Display Screen Face with Dynamic Canvas Texture */}
      <mesh position={[0, 3.2, 0.135]}>
        <planeGeometry args={[5.0, 2.45]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.2}
          metalness={0.1}
          emissive="#ffffff"
          emissiveMap={texture}
          emissiveIntensity={0.65}
        />
      </mesh>

      {/* Subtle green ambient glow emanating from the scoreboard numbers */}
      <pointLight position={[0, 3.2, 1.2]} color="#00ff66" intensity={1.5} distance={7} decay={2} />
    </group>
  );
};
