# 🚀 Rocket Landing AI — 3D Reinforcement Learning Simulator

<div align="center">

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Rapier 3D](https://img.shields.io/badge/Rapier_Physics-WASM-orange?style=for-the-badge&logo=rust&logoColor=white)](https://rapier.rs/)
[![PPO RL](https://img.shields.io/badge/RL_Algorithm-PPO_Continuous-00FF66?style=for-the-badge)](https://spinningup.openai.com/en/latest/algorithms/ppo.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

### **An interactive 3D Web application where an AI agent learns to balance and land a rocket using continuous Proximal Policy Optimization (PPO) reinforcement learning.**

</div>

---

## 🎬 Demo & Video Preview

> **Record your own demo with 1-click**: The simulator includes a built-in **`REC DEMO`** button in the top navigation bar that records crystal-clear 60FPS video directly from the WebGL canvas and saves a ready-to-share `.webm` video file!

```text
               ▲ [Altitude: 15m]
              / \
             | O |   <-- Blue Observation Porthole
             |===|   <-- Checkered Livery Band
             |   |
             /| |\   <-- Articulated Landing Struts
            / |_| \
           *   |   * <-- Side RCS Thrusters
              ( )    <-- Main Engine Exhaust Flame
               v
     ═════════════════════
     ( ( ( [PAD (+)] ) ) )   <-- Circular Concrete Landing Target
```

---

## ✨ Key Features

- **Genuine Reinforcement Learning (PPO)**:
  - Real Actor-Critic neural networks running in TypeScript/WASM.
  - Continuous Gaussian action policy with Generalized Advantage Estimation (GAE) and clipped surrogate loss.
  - No scripted movements, no pre-baked animations — the rocket genuinely learns through physical trial and error.

- **Deterministic 60Hz Physics (Rapier 3D WASM)**:
  - True rigid-body mass (1000 kg), moment of inertia, gravity (-9.81 m/s²), thrust vectoring (up to 2.44x TWR), and local frame RCS torques.
  - Multi-collider landing legs with four distinct footpads, contact manifolds, friction, and bounce restitution.

- **High-Fidelity 3D Visual Experience**:
  - Custom 3D rocket model featuring white aerodynamic hull, rounded nosecone, checkered band, blue observation porthole, and articulated hydraulic landing struts.
  - Dynamic flame plumes: Bright cyan core, outer orange flame cone, and dynamic real-time ground illumination.
  - Circular concrete pad with concentric target rings, segmented yellow hazard stripes, runway boundary lights, and safety traffic cone.
  - Prominent 3D digital scoreboard with steel stanchions, green LED score typography, and horizontal neon accent line.
  - Atmospheric sunset twilight sky with warm directional lighting and background aerospace operations facility.

- **Telemetry HUD & Outcome Detection**:
  - Real-time digital meters: Altitude (AGL), vertical velocity, horizontal drift speed, tilt angle, throttle %, and fuel remaining.
  - Precise landing validation: Touchdown requires tilt < 12°, descent speed < 1.8 m/s, drift < 1.0 m/s, and remaining settled continuously for at least 25 frames.

- **Analytics & Debugger**:
  - Built-in **Recharts** dashboard tracking Episode Reward vs. 10-episode Moving Average (SMA), touchdown velocity, and tilt history.
  - Step reward decomposition inspector showing individual reward components in real time.

- **Model Persistence**:
  - Export and import neural network weights as standard `.json` checkpoints.
  - Includes a verified **Pretrained Master Agent** checkpoint for instant demonstration.

- **Built-in 60FPS Video Recorder**:
  - Export crisp demo videos directly from your browser without third-party software.

---

## ⚡ Quickstart

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/rocket-landing-ai.git
cd rocket-landing-ai

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open your browser at **`http://127.0.0.1:3000/`**.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🔬 Physics & Reinforcement Learning Formulation

### 1. Observation Vector (15 Dimensions)
The agent observes normalized kinematics in the world and body frame:

| Index | Variable | Description | Range |
| :--- | :--- | :--- | :--- |
| `0` | `relX` | X Position relative to pad center | [-1.5, 1.5] |
| `1` | `relY` | Altitude above landing pad | [0.0, 1.5] |
| `2` | `relZ` | Z Position relative to pad center | [-1.5, 1.5] |
| `3-5` | `vx, vy, vz` | Linear velocities in X, Y, Z | [-1.0, 1.0] |
| `6-7` | `sinPitch, cosPitch` | Pitch angle orientation | [-1.0, 1.0] |
| `8-9` | `sinRoll, cosRoll` | Roll angle orientation | [-1.0, 1.0] |
| `10-12` | `angVelX, Y, Z` | Pitch, Yaw, Roll angular rates | [-1.0, 1.0] |
| `13` | `contactState` | Ground / Pad contact indicator | {0, 1} |
| `14` | `distanceToPad` | Distance to pad center target | [0.0, 2.0] |

### 2. Action Vector (3 Continuous Actuators)

- **`a0` (Throttle)**: Main thruster throttle in `[0, 1]` applied along local +Y axis (up to 24,000 N force).
- **`a1` (Pitch Torque)**: Pitch attitude RCS torque in `[-1, 1]` (up to 5,500 N·m).
- **`a2` (Roll Torque)**: Roll attitude RCS torque in `[-1, 1]` (up to 5,500 N·m).

### 3. PPO Clipped Surrogate Loss

The policy parameters are optimized using the clipped surrogate objective:

```
L_CLIP(θ) = E [ min( r_t(θ) * A_t,  clip(r_t(θ), 1 - ε, 1 + ε) * A_t ) ]
```

where the probability ratio is `r_t(θ) = π_θ(a_t | s_t) / π_old(a_t | s_t)` and `ε = 0.2`.

### 4. Reward Function Breakdown

| Component | Shaping Formula | Objective |
| :--- | :--- | :--- |
| **Upright Alignment** | `+0.6 * cos(tiltAngle)` | Keep rocket strictly vertical |
| **Pad Proximity** | `-0.08 * distanceToPad` | Guide rocket toward center |
| **Angular Rate** | `-0.06 * ||angVel||²` | Eliminate spinning and oscillation |
| **Horizontal Drift** | `-0.12 * (vx² + vz²)` | Arrest lateral drift speed |
| **Descent Shaping** | `-0.08 * |vy - targetVy|` | Maintain controlled deceleration |
| **Ground Bonus** | `+0.5 * proximity` | Reward stability near the ground |
| **Successful Landing** | `+220 base + 50 accuracy + 30 softness` | Terminal touchdown reward |
| **Crash Penalty** | `-120` | Penalty for hard impact or tipping over |

---

## 🎮 Mission Control & Keybindings

| Control | Action | Description |
| :--- | :--- | :--- |
| **PAUSE / RESUME** | Freeze Physics | Pause or resume real-time physics and training |
| **TRAINING MODE** | Stochastic Policy | Policy explores with Gaussian noise and updates weights |
| **EVALUATION MODE** | Deterministic Policy | Policy executes mean action (σ = 0) with frozen weights |
| **0.5x – 10x SPEED** | Physics Time Scale | Accelerate physics simulation for rapid training |
| **PRETRAINED** | Load Master Model | Instantly load a 1,250-episode trained agent (~94% success rate) |
| **REC DEMO** | Canvas Recorder | Capture 60FPS video directly to `.webm` file |
| **WIND DISTURBANCE** | Weather Simulator | Apply dynamic horizontal wind gusts (0–100%) |
| **MOTION TRAIL** | 3D Flight Ribbon | Display rocket spatial flight path |
| **SAVE / LOAD** | Model Checkpoints | Download or upload neural network weights as `.json` |

---

## 📁 Repository Structure

```text
rocket-landing-ai/
├── public/
├── src/
│   ├── components/
│   │   ├── 3d/
│   │   │   ├── CameraRig.tsx          # Dynamic cinematic & follow camera
│   │   │   ├── Environment3D.tsx      # Sunset sky, hangar, lighting & terrain
│   │   │   ├── LandingPad.tsx         # Circular concrete platform & lights
│   │   │   ├── MotionTrail.tsx        # 3D spatial flight trajectory line
│   │   │   ├── RocketModel.tsx        # Procedural 3D rocket & dynamic flames
│   │   │   ├── Scoreboard3D.tsx       # 3D digital scoreboard with LED canvas
│   │   │   └── SimulationCanvas.tsx   # Three.js Canvas setup
│   │   └── ui/
│   │       ├── AnalyticsModal.tsx     # Recharts learning graphs & history
│   │       ├── ControlPanel.tsx       # Mission control dock
│   │       ├── DebugPanel.tsx         # Real-time RL & kinematics debugger
│   │       ├── Header.tsx             # Navigation, badges & video recorder
│   │       └── TelemetryHUD.tsx       # Flight telemetry gauges & banners
│   ├── physics/
│   │   └── RocketPhysics.ts           # Rapier 3D WASM physics world & colliders
│   ├── rl/
│   │   ├── PPOAgent.ts                # Neural networks, Gaussian policy & Adam
│   │   ├── PretrainedCheckpoint.ts    # Converged master model weights
│   │   ├── RewardFunction.ts          # Transparent reward shaping logic
│   │   ├── SimulationController.ts    # Central coordinator & loop
│   │   └── trainingWorker.ts          # Background training Web Worker
│   ├── state/
│   │   └── simulationStore.ts         # Zustand global state & telemetry streaming
│   ├── types/
│   │   └── simulation.ts              # TypeScript interfaces & types
│   ├── utils/
│   │   ├── textureGenerators.ts       # Canvas textures for pad & scoreboard
│   │   └── videoRecorder.ts           # 60FPS WebGL canvas video capture
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
