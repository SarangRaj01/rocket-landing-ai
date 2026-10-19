import React, { useMemo } from 'react';
import * as THREE from 'three';

interface MotionTrailProps {
  points: [number, number, number][];
  visible: boolean;
}

export const MotionTrail: React.FC<MotionTrailProps> = ({ points, visible }) => {
  const lineGeometry = useMemo(() => {
    if (!visible || points.length < 2) return null;
    const pathPoints = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const geometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    return geometry;
  }, [points, visible]);

  if (!visible || !lineGeometry) return null;

  return (
    <primitive object={new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: '#00ff88',
        transparent: true,
        opacity: 0.75,
        linewidth: 2,
      })
    )} />
  );
};
