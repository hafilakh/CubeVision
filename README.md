# CubeVision

A browser-based tool that helps people learn to solve a real 3×3 Rubik's Cube. Enter the colors of your cube, check that the cube is physically possible, and get a computed solution with plain-English instructions for every move.

> **Project status: in active development.** Manual cube entry, cube validation, and automatic solving work today. A 3D cube, animated solution playback, webcam scanning, learning modes, and verification of physical moves are **planned and not yet implemented**.

## Purpose

CubeVision is meant to teach the *method*, not just hand over a list of moves. The long-term goal is for a learner to become an independent solver who no longer needs the app.

The current solver produces an efficient solution computed by a general algorithm. That is useful for getting a cube solved, but it is not the same as a beginner-friendly, layer-by-layer teaching method. Teaching lessons are a separate, planned feature.

## Current Features

- Responsive, dark-themed homepage with a sticky navigation bar and mobile menu
- Manual color entry for all six faces (Up, Down, Front, Back, Right, Left)
- Fixed center stickers that identify each face
- Six-color palette, Undo across faces, Reset face, and Reset all faces
- Progress tracking and live color counts
- Four-level cube validation with specific, readable error messages
- Automatic solving with Kociemba's two-phase algorithm
- Solver running in a Web Worker so the page stays responsive
- Numbered solution steps with plain-English move instructions
- Solutions verified in software by replaying every move before they are shown
- Automated tests for the validator, move utilities, solver, and move descriptions

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

## Technology Stack

| Area | Technology |
|---|---|
| Framework | React |
| Language | JavaScript |
| Build tool | Vite |
| Styling | Plain CSS with CSS variables |
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
│   │   ├── Features.jsx        Feature overview
│   │   ├── Hero.jsx            Main intro section
│   │   └── Navbar.jsx          Navigation bar and mobile menu
│   ├── utils/
│   │   ├── cubeMoves.js            Legal face turns on the cube state
│   │   ├── cubeSolver.js           Solver engine (validate, solve, verify)
│   │   ├── cubeSolver.worker.js    Web Worker entry point
│   │   ├── cubeSolver.test.js
│   │   ├── cubeValidator.js        Four-level cube validation
│   │   ├── cubeValidator.test.js
│   │   ├── describeMove.js         Plain-English move descriptions
│   │   ├── describeMove.test.js
│   │   └── solveCubeAsync.js       Promise wrapper around the worker
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

The automated tests cover the cube validator, the move utilities, the solver, and the move descriptions. The React interface has no automated tests yet, so it is checked manually in the browser.

## Production Build and Preview

```bash
npm run build
npm run preview
```

Open the address shown in the terminal, usually `http://localhost:4173/`. Testing the preview build matters because the development server and the production build bundle Web Workers differently.

## Scramble Testing Utility

`scripts/printScramble.js` applies a known sequence of moves to a solved cube and prints the resulting colors face by face, in the same order and orientation as the app. Use it to enter a known scrambled cube without working out 48 stickers by hand.

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

**Planned**

- [ ] Interactive 3D cube showing the entered cube
- [ ] Animated, step-by-step solution playback
- [ ] Beginner layer-by-layer lessons
- [ ] Guided, hint, and independent learning modes
- [ ] Learning progress saved in the browser
- [ ] Webcam-based cube scanning with manual correction
- [ ] Camera-assisted move verification with rescan fallback
- [ ] Public deployment

## Known Limitations

- There is no 3D view, solution animation, or webcam scanning yet. The cube panel on the homepage is a placeholder.
- Colors must be entered by hand, and the app cannot check them against a physical cube.
- Solutions come from a general-purpose algorithm and do not teach a beginner method.
- The first solve can take several seconds while the solver initializes.
- The user interface has no automated tests.
- A dependency security review has not been completed yet.

## Future Learning and Computer Vision Features

Planned work includes layer-by-layer lessons that explain why each step works, three learning modes (guided, hint-based, and independent), progress stored in the browser, and webcam features. Camera features will be designed to say so when they cannot see enough, and to fall back to manual confirmation or a rescan instead of guessing.