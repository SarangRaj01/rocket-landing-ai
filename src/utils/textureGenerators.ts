import * as THREE from 'three';

/**
 * Generates high-res procedural checkerboard band texture for the rocket fuselage
 */
export function createCheckeredTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const cols = 16;
  const rows = 4;
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#111116' : '#f5f5f7';
      ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
    }
  }

  // Thin orange borders on top and bottom of band
  ctx.fillStyle = '#ff7b00';
  ctx.fillRect(0, 0, canvas.width, 4);
  ctx.fillRect(0, canvas.height - 4, canvas.width, 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates the concrete circular landing pad texture with concentric rings,
 * yellow segmented hazard markings, and central crosshair
 */
export function createLandingPadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const center = canvas.width / 2;

  // Base concrete concrete color with fine grain
  ctx.fillStyle = '#8b8b8d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Concrete noise / texture
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Outer concrete expansion joint circle
  ctx.strokeStyle = '#555558';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(center, center, center * 0.94, 0, Math.PI * 2);
  ctx.stroke();

  // Outer solid white circle marking
  ctx.strokeStyle = '#f0f0f4';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(center, center, center * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // Yellow Segmented Safety Hazard Ring
  ctx.save();
  ctx.lineWidth = 22;
  const segments = 24;
  const segRadius = center * 0.72;
  for (let i = 0; i < segments; i++) {
    const startAngle = (i / segments) * Math.PI * 2;
    const endAngle = startAngle + (Math.PI * 2) / (segments * 1.8);
    ctx.strokeStyle = i % 2 === 0 ? '#ffb703' : '#2b2d42';
    ctx.beginPath();
    ctx.arc(center, center, segRadius, startAngle, endAngle);
    ctx.stroke();
  }
  ctx.restore();

  // Inner solid white circle
  ctx.strokeStyle = '#f0f0f4';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(center, center, center * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  // Central Crosshair Target (+)
  ctx.strokeStyle = '#f0f0f4';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  const armLen = center * 0.28;

  // Horizontal arm
  ctx.beginPath();
  ctx.moveTo(center - armLen, center);
  ctx.lineTo(center + armLen, center);
  ctx.stroke();

  // Vertical arm
  ctx.beginPath();
  ctx.moveTo(center, center - armLen);
  ctx.lineTo(center, center + armLen);
  ctx.stroke();

  // Center bullseye dot
  ctx.fillStyle = '#ff3333';
  ctx.beginPath();
  ctx.arc(center, center, 8, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates dynamic high-res canvas texture for the 3D scoreboard display
 */
export function updateScoreboardCanvas(
  canvas: HTMLCanvasElement,
  score: number,
  episode: number,
  best: number,
  successRate: number
): void {
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep matte black background
  ctx.fillStyle = '#08090c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle dark grid pattern
  ctx.strokeStyle = '#12151c';
  ctx.lineWidth = 2;
  for (let x = 0; x < canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Top header text "SCORE"
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 52px "Courier New", monospace, sans-serif';
  ctx.textAlign = 'left';
  ctx.letterSpacing = '6px';
  ctx.fillText('SCORE', 90, 110);

  // Large bright digital green score
  const scoreSign = score >= 0 ? '+' : '';
  const scoreText = `${scoreSign}${Math.round(score)}`;

  ctx.fillStyle = '#00ff66';
  ctx.shadowColor = '#00ff66';
  ctx.shadowBlur = 25;
  ctx.font = '900 170px "Impact", "Arial Black", sans-serif';
  ctx.fillText(scoreText, 80, 280);
  ctx.shadowBlur = 0; // reset shadow

  // Thin green horizontal accent line beneath the score
  ctx.fillStyle = '#00e65c';
  ctx.shadowColor = '#00ff66';
  ctx.shadowBlur = 10;
  ctx.fillRect(80, 310, 860, 6);
  ctx.shadowBlur = 0;

  // Bottom secondary indicators
  ctx.font = 'bold 32px "Courier New", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`EPISODE: ${episode}`, 80, 380);
  ctx.fillText(`BEST: ${best > 0 ? '+' : ''}${Math.round(best)}`, 440, 380);
  ctx.fillText(`SUCCESS: ${Math.round(successRate)}%`, 720, 380);

  // Live status pulse indicator dot
  ctx.fillStyle = '#00ff66';
  ctx.beginPath();
  ctx.arc(920, 100, 10, 0, Math.PI * 2);
  ctx.fill();
}
