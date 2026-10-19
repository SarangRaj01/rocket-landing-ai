# 🚀 Rocket Landing AI — 3D Reinforcement Learning Simulator

<div align="center">

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Rapier 3D](https://img.shields.io/badge/Rapier_Physics-WASM-orange?style=for-the-badge&logo=rust&logoColor=white)](https://rapier.rs/)
[![PPO RL](https://img.shields.io/badge/RL_Algorithm-PPO_Continuous-00FF66?style=for-the-badge)](https://spinningup.openai.com/en/latest/algorithms/ppo.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**An interactive 3D Web application where an AI agent learns to balance an upright rocket and perform safe, autonomous landings on a circular pad using continuous Proximal Policy Optimization (PPO) reinforcement learning.**

[Features](#-key-features) • [Quickstart](#-quickstart) • [How It Works](#-how-it-works) • [Physics & RL](#-physics--reinforcement-learning-math) • [Controls](#-mission-control--keybindings)

</div>

---

## 🎬 Demo & Video Preview

> **Record your own demo with 1-click**: The simulator includes a built-in **`REC DEMO`** button in the top navigation bar that records crystal-clear 60FPS video directly from the WebGL canvas and saves a ready-to-share `.webm` file!

```
               ▲ [Rocket Altitude: 15m]
              / \
             | O |  <-- Blue Observation Porthole
             |===|  <-- Checkered Livery
             |   |
             /| |\  <-- Articulated Landing Legs
            / |_| \
           *   |   * <-- Side RCS Thrusters
              ( )   <-- Main Engine Exhaust Flame
               v
     ═════════════════════
     ( ( ( [PAD (+)] ) ) )  <-- Circular Concrete Landing Target
```

---

## ✨ Key Features

- **Genuine Reinforcement Learning (PPO)**:
  - Real actor-critic neural networks running in TypeScript/WASM.
  - Continuous Gaussian action policy with Generalized Advantage Estimation (GAE) and clipped surrogate loss.
  - No scripted movements, no pre-baked animations — the rocket genuinely learns through physical trial and error.
- **Deterministic 60Hz Physics (Rapier 3D WASM)**:
  - True rigid-body mass ($1000\,\text{kg}$), moment of inertia, gravity ($g = -9.81\,\text{m/s}^2$), thrust vectoring (up to $2.44\times$ TWR), and local frame RCS torques.
  - Multi-collider landing legs with four distinct footpads, contact manifolds, friction, and bounce restitution.
- **High-Fidelity 3D Visual Experience**:
  - Custom 3D rocket model featuring white aerodynamic hull, rounded nosecone, checkered band, blue observation porthole, and articulated hydraulic landing struts.
  - Dynamic flame plumes: Bright cyan core, outer orange flame cone, and dynamic real-time ground illumination.
  - Circular concrete pad with concentric target rings, segmented yellow hazard stripes, runway boundary lights, and safety traffic cone.
  - Prominent 3D digital scoreboard with steel stanchions, green LED score typography, and horizontal neon accent line.
  - Atmospheric sunset twilight sky with warm directional lighting and background aerospace operations facility.
- **Telemetry HUD & Outcome Detection**:
  - Real-time digital meters: Altitude (AGL), vertical velocity ($v_y$), horizontal drift speed, tilt angle, throttle %, and fuel remaining.
  - Precise landing validation: Touchdown requires tilt $< 12^\circ$, descent speed $< 1.8\,\text{m/s}$, drift $< 1.0\,\text{m/s}$, and remaining settled continuously for $\ge 25$ frames.
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

## 🔬 Physics & Reinforcement Learning Math

### 1. Observation Vector $\mathbf{s} \in \mathbb{R}^{15}$
The agent observes its full state in the world frame normalized for neural network stability:
$$\mathbf{s} = \begin{bmatrix} \frac{x}{10}, & \frac{y - 1.25}{15}, & \frac{z}{10}, & \frac{v_x}{10}, & \frac{v_y}{10}, & \frac{v_z}{10}, & \sin(\theta_p), & \cos(\theta_p), & \sin(\theta_r), & \cos(\theta_r), & \frac{\omega_x}{5}, & \frac{\omega_y}{5}, & \frac{\omega_z}{5}, & c_{\text{pad}}, & \frac{d_{\text{pad}}}{10} \end{bmatrix}^T$$

### 2. Action Vector $\mathbf{a} \in \mathbb{R}^3$
- **$a_0 \in [0, 1]$**: Main thruster throttle applied along the rocket's local $+Y$ axis:
  $$\vec{F}_{\text{main}} = a_0 \cdot F_{\text{max}} \cdot \mathbf{R} \begin{bmatrix} 0 \\ 1 \\ 0 \end{bmatrix}$$
- **$a_1 \in [-1, 1]$**: Pitch RCS torque applied along local $X$ axis.
- **$a_2 \in [-1, 1]$**: Roll RCS torque applied along local $Z$ axis.

### 3. PPO Clipped Objective
The policy network parameters $\theta$ are updated by maximizing the clipped surrogate objective:
$$L^{\text{CLIP}}(\theta) = \hat{\mathbb{E}}_t \left[ \min\left(r_t(\theta) \hat{A}_t, \, \text{clip}(r_t(\theta), 1 - \epsilon, 1 + \epsilon) \hat{A}_t\right) \right]$$
where:
$$r_t(\theta) = \frac{\pi_\theta(a_t | s_t)}{\pi_{\theta_{\text{old}}}(a_t | s_t)}, \quad \epsilon = 0.2$$

### 4. Transparent Reward Function
$$R_{\text{step}} = R_{\text{upright}} + R_{\text{dist}} + R_{\text{ang}} + R_{\text{drift}} + R_{\text{descent}} + R_{\text{proximity}} + R_{\text{fuel}} + R_{\text{terminal}}$$

| Component | Formula | Objective |
| :--- | :--- | :--- |
| **Upright Alignment** | $+0.6 \cdot \cos(\theta_{\text{tilt}})$ | Keep rocket perfectly vertical |
| **Pad Proximity** | $-0.08 \cdot \sqrt{x^2 + z^2}$ | Penalize drifting away from target |
| **Angular Velocity** | $-0.06 \cdot \|\vec{\omega}\|^2$ | Prevent spinning and oscillations |
| **Horizontal Drift** | $-0.12 \cdot (v_x^2 + v_z^2)$ | Arrest horizontal momentum |
| **Descent Shaping** | $-0.08 \cdot |v_y - v_{\text{target}}(y)|$ | Encourage soft descent ($0.8$–$1.8\,\text{m/s}$) |
| **Terminal Landing** | $+220 \text{ base} + 50 \text{ accuracy} + 30 \text{ softness}$ | Huge reward for safe upright touchdown |
| **Terminal Crash** | $-120$ | Heavy penalty for high impact ($>3.8\,\text{m/s}$) or tilt ($>42^\circ$) |

---

## 🎮 Mission Control & Keybindings

| Control | Action | Description |
| :--- | :--- | :--- |
| **PAUSE / RESUME** | Freeze Physics | Pause or resume real-time physics and training |
| **TRAINING MODE** | Stochastic Policy | Policy explores with Gaussian noise and updates weights |
| **EVALUATION MODE** | Deterministic Policy | Policy executes mean action ($\sigma = 0$) with frozen weights |
| **0.5x – 10x SPEED** | Physics Time Scale | Accelerate physics simulation for rapid training |
| **PRETRAINED** | Load Master Model | Instantly load a 1,250-episode trained agent (~94% success rate) |
| **REC DEMO** | Canvas Recorder | Capture 60FPS video directly to `.webm` file |
| **WIND DISTURBANCE** | Weather Simulator | Apply dynamic horizontal wind gusts (0–100%) |
| **MOTION TRAIL** | 3D Flight Ribbon | Display rocket's spatial flight path |
| **SAVE / LOAD** | Model Checkpoints | Download or upload neural network weights as `.json` |

---

## 📁 Repository Structure

```
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
