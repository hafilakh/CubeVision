# CubeVision

A browser-based web app that aims to teach people how to solve a real 3×3 Rubik's Cube, using a webcam and interactive visual guidance.

> **Project status: early development.** Only the homepage is built so far. Webcam scanning, the interactive 3D cube, and the solving lessons are planned but **not yet implemented**.

## Purpose

CubeVision is meant to teach the *method*, not just hand over a list of moves. The long-term goal is for a learner to become an independent solver who no longer needs the app.

## Current Features

These work today:

- Responsive dark-themed homepage
- Sticky navigation bar with a mobile menu
- Hero section with a reserved space for the future 3D cube
- Features overview section
- Layout that adapts from desktop to mobile

## Planned Features

These are **not built yet**:

- [ ] Manual six-face cube color entry and validation
- [ ] Interactive 3D cube (Three.js or React Three Fiber)
- [ ] Beginner-friendly layer-by-layer solving lessons
- [ ] Webcam-based cube scanning
- [ ] Camera-assisted move verification
- [ ] Guided, hint, and independent learning modes
- [ ] Learning progress saved in the browser

## Tech Stack

| Area | Technology |
|---|---|
| Framework | React |
| Language | JavaScript |
| Build tool | Vite |
| Styling | Plain CSS with CSS variables |
| Linting | ESLint |
| Version control | Git and GitHub |

Planned for later phases: Three.js or React Three Fiber (3D cube), the browser MediaDevices API (webcam), and browser localStorage (saved progress).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (a current LTS or newer version)
- [Git](https://git-scm.com/)

### Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/hafilakh/CubeVision.git
   ```

2. Move into the project folder:

   ```bash
   cd CubeVision
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the address shown in the terminal, usually `http://localhost:5173/`.

### Other useful commands

```bash
npm run lint    # check the code for problems
npm run build   # create a production build in the dist folder
```

## Project Structure

```text
CubeVision/
├── public/            Static files served as-is
├── src/
│   ├── components/
│   │   ├── Navbar.jsx     Navigation bar and mobile menu
│   │   ├── Hero.jsx       Main intro section and cube placeholder
│   │   └── Features.jsx   Planned features overview
│   ├── App.jsx            Top-level component that assembles the page
│   ├── App.css            Component and layout styles
│   ├── index.css          Global styles and design tokens
│   └── main.jsx           Entry point that mounts React into the page
├── index.html         The single HTML page React renders into
├── package.json       Project metadata, dependencies, and scripts
└── eslint.config.js   Linting rules
```