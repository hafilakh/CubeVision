# CubeVision

A browser-based tool that helps people learn to solve a real 3×3 Rubik's Cube. Enter the colors of your cube, check that the cube is physically possible, view it in 3D, and get a computed solution with plain-English instructions for every move.

> **Project status: in active development.** Manual cube entry, validation, automatic solving, and an interactive 3D view work today. Animated solution playback, layer-by-layer lessons, webcam scanning, and verification of physical moves are **planned and not yet implemented**.

## Purpose

CubeVision is meant to teach the *method*, not just hand over a list of moves. The long-term goal is for a learner to become an independent solver who no longer needs the app.

The current solver produces an efficient solution computed by a general algorithm. That is useful for getting a cube solved, but it is not a beginner-friendly, layer-by-layer teaching method. Teaching lessons are a separate, planned feature.

## Current Features

- Responsive, dark-themed homepage with a sticky navigation bar and mobile menu
- **Fluid Bloom** homepage cube: a decorative, interactive glossy black cube where touch releases flowing colored ink (independent of the solving cube)
- Manual color entry for all six faces (Up, Down, Front, Back, Right, Left)
- Fixed center stickers that identify each face
- Six-color palette, Undo across faces, Reset face, and Reset all faces
- Progress tracking and live color counts
- Four-level cube validation with specific, readable error messages
- Interactive 3D view (Three.js) of the cube you entered, with rotation, zoom, and Reset view
- Automatic solving with Kociemba's two-phase algorithm
- Solver running in a Web Worker so the page stays responsive
- Numbered solution steps with plain-English move instructions
- Solutions verified in software by replaying every move before they are shown
- Automated tests for the validator, move utilities, 3D layout, solver, move descriptions, and homepage cube helpers

## How It Works

### Manual cube input

1. Choose a face with the face selector.
2. Pick a color from the palette.
3. Click stickers to match your physical cube. Each face is viewed from outside the cube: the Up face with the Back side at the top, the Down face with the Front side at the top, and the other four faces with Up at the top. The app shows which neighboring face touches each edge of the selected face.
4. Switch faces freely. Colors on every face are kept.
5. Use Undo, Reset face, or Reset all faces. Reset actions can be undone.

Entry progress counts entered stickers only. It does not mean the cube is valid.

### Four-level validation

| Level | What it checks |
|---|---|
| 1. Completeness | All 48 editable stickers are entered |
| 2. Color counts | Exactly nine stickers of each color, centers included |
| 3. Real pieces | Every edge and corner is a possible piece, appearing exactly once, with no impossible color combinations |
| 4. Twist, flip, and swap rules | Corner twists, edge flips, and permutation parity are consistent |

Checks run in order and stop at the first level that fails. A cube is reported as valid only when all four levels pass. Passing validation means the entered colors could belong to a legal cube. It cannot show that you entered what your physical cube really looks like.

### Interactive 3D view

The 3D view draws the cube you entered. The 54 stickers have fixed positions taken from the same geometry the move utilities use, so the picture cannot drift away from the cube state. Entered colors appear immediately, and stickers you have not entered are shown in gray. Rotating or zooming moves only the camera and never changes the cube.

### Automatic solving

After a cube passes validation, the solver:

1. Converts the cube into a 54-character facelet string in U, R, F, D, L, B order.
2. Computes a solution with [cubejs](https://github.com/ldez/cubejs), an implementation of Kociemba's two-phase algorithm.
3. Replays the solution on the entered cube using the project's own move utilities.
4. Shows the solution only if the replay ends with a solved cube.

Already-solved cubes are reported as such, and incomplete or invalid cubes are rejected before the solver runs. The first solve can take several seconds while the solver prepares its lookup tables.

### Web Worker architecture

```text
CubeInput (React)
   │  solveCubeAsync(cube)
   ▼
solveCubeAsync.js ──── message ───▶ cubeSolver.worker.js
                                       │ solveCube(cube)
                                       │   validate → facelets → cubejs → verify
   ◀──────────── result ───────────────┘
```

The solver runs in a module Web Worker, so the heavy setup and search never block the interface. Results are tied to the exact cube they were computed for, so a late answer is never shown after the cube changes.

### Beginner-friendly move instructions

Each move is shown with a number and a plain-English sentence, for example "Turn the Right face a quarter turn clockwise." Clockwise and counterclockwise always mean as seen when looking straight at the face being turned.

### Fluid Bloom homepage cube

The homepage shows a glossy black cube. Click or touch it and colored ink spreads over and around it, blending and drifting like dye in water before fading away. Dragging rotates the cube and leaves a trail, the mouse wheel and pinch gestures zoom within limits, and Reset view restores the starting angle.

The effect is computed on the GPU: dye is stored in two small textures and carried along a smooth, slowly changing swirl pattern each frame. It is purely decorative. It has no connection to the cube you enter, the validator, the solver, or any saved data, and an automated test guards that separation. Effects can be paused with a button, and they start paused when your system requests reduced motion. A vertical swipe on a phone still scrolls the page, and the mouse wheel scrolls the page once the cube reaches its zoom limit.

## Technology Stack

| Area | Technology |
|---|---|
| Framework | React |
| Language | JavaScript |
| Build tool | Vite |
| Styling | Plain CSS with CSS variables |
| 3D graphics | Three.js 0.183.2 (WebGL) |
| Solver | cubejs 1.3.2 (Kociemba's two-phase algorithm) |
| Dependency patching | patch-package |
| Linting | ESLint |
| Testing | Node.js built-in test runner |
| Version control | Git and GitHub |

## Project Structure

```text
CubeVision/
├── patches/
│   └── cubejs+1.3.2.patch      Compatibility patch applied after install
├── public/                     Static files served as-is
├── scripts/
│   └── printScramble.js        Prints a scrambled cube as colors for testing
├── src/
│   ├── components/
│   │   ├── CubeInput.jsx       Six-face entry, validation, and solver interface
│   │   ├── CubeViewer.jsx      3D view of the entered cube
│   │   ├── Features.jsx        Feature overview
│   │   ├── Hero.jsx            Main intro section
│   │   ├── HeroCube.jsx        Decorative Fluid Bloom cube on the homepage
│   │   └── Navbar.jsx          Navigation bar and mobile menu
│   ├── three/
│   │   ├── cubeScene.js        Three.js scene for the entered cube
│   │   ├── fluidEffect.js      GPU dye simulation for Fluid Bloom
│   │   └── heroCubeScene.js    Three.js scene for the homepage cube
│   ├── utils/
│   │   ├── cubeLayout.js           3D position of every sticker
│   │   ├── cubeMoves.js            Legal face turns on the cube state
│   │   ├── cubeSolver.js           Solver engine (validate, solve, verify)
│   │   ├── cubeSolver.worker.js    Web Worker entry point
│   │   ├── cubeValidator.js        Four-level cube validation
│   │   ├── describeMove.js         Plain-English move descriptions
│   │   ├── heroCubeMath.js         Helpers for the homepage cube
│   │   ├── solveCubeAsync.js       Promise wrapper around the worker
│   │   └── *.test.js               Automated tests for the files above
│   ├── App.css
│   ├── App.jsx
│   ├── index.css               Global styles and design tokens
│   └── main.jsx
├── eslint.config.js
├── index.html
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (a current LTS version)
- [Git](https://git-scm.com/)
- A browser with WebGL 2 for the 3D features

### Install

```bash
git clone https://github.com/hafilakh/CubeVision.git
cd CubeVision
npm install
```

`npm install` also applies the cubejs compatibility patch automatically (see the technical note below).

On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd` instead of `npm`.

### Run locally

```bash
npm run dev
```

Open the address shown in the terminal, usually `http://localhost:5173/`.

## Available Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm test` | Run the automated tests |
| `npm run lint` | Check the code with ESLint |
| `npm run build` | Create a production build in `dist` |
| `npm run preview` | Serve the production build locally |

## Testing

```bash
npm test
npm run lint
```

The automated tests cover the cube validator, the move utilities, the 3D sticker layout, the solver, the move descriptions, and the homepage cube helpers. The React interface and the WebGL scenes have no automated tests, so they are checked manually in the browser.

## Production Build and Preview

```bash
npm run build
npm run preview
```

Open the address shown in the terminal, usually `http://localhost:4173/`. Testing the preview build matters because the development server and the production build bundle Web Workers and lazy-loaded code differently.

## Scramble Testing Utility

`scripts/printScramble.js` applies a known sequence of moves to a solved cube and prints the resulting colors face by face, in the same order and orientation as the app. Use it to enter a known scrambled cube without working out 48 stickers by hand, then validate and solve it.

```bash
node scripts/printScramble.js
```

To try a different scramble, edit the `MOVES` list at the top of the script.

## Technical Note: cubejs Compatibility Patch

cubejs 1.3.2 contains a line that reads `this.Cube`. Inside a module Web Worker, top-level `this` is undefined, so the worker crashed. The project patches that line with [patch-package](https://github.com/ds300/patch-package):

```text
Cube = (this && this.Cube) || require('./cube');
```

The patch lives in `patches/cubejs+1.3.2.patch` and is applied automatically by the `postinstall` script. If the cubejs version changes, the patch must be regenerated.

## Roadmap

**Completed**

- [x] Responsive homepage
- [x] Manual six-face color entry with Undo and Reset
- [x] Four-level cube validation
- [x] Automatic solver in a Web Worker
- [x] Beginner-friendly move instructions
- [x] Interactive 3D view of the entered cube
- [x] Fluid Bloom homepage cube

**Planned**

- [ ] Visual validation: highlight invalid stickers and pieces in the grids and 3D view, with grouped, easier-to-read guidance
- [ ] Animated, step-by-step solution playback
- [ ] Beginner layer-by-layer lessons
- [ ] Webcam-based cube scanning with manual correction
- [ ] Camera-assisted move verification with rescan fallback
- [ ] Guided, hint, and independent learning modes with progress saved in the browser
- [ ] Performance, accessibility, and testing pass, then public deployment

## Known Limitations

- There is no solution animation or webcam scanning yet.
- Colors must be entered by hand, and the app cannot check them against a physical cube.
- Validation messages can be long and technical for badly mixed-up input. Visual highlighting is planned.
- Solutions come from a general-purpose algorithm and do not teach a beginner method.
- The first solve can take several seconds while the solver initializes.
- The 3D code is a large lazy-loaded file, and the build reports a chunk-size warning.
- The 3D features need WebGL 2. Without it, the cube areas show a message and the rest of the app still works.
- The user interface and the WebGL scenes have no automated tests.
- A dependency security review has not been completed yet.

## Future Learning and Computer Vision Features

Planned work includes layer-by-layer lessons that explain why each step works, three learning modes (guided, hint-based, and independent), progress stored in the browser, and webcam features. Camera features will be designed to say so when they cannot see enough, and to fall back to manual confirmation or a rescan instead of guessing.