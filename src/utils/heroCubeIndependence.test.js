import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const HOMEPAGE_CUBE_FILES = [
  './heroCubeMath.js',
  '../three/fluidEffect.js',
  '../three/heroCubeScene.js',
  '../components/HeroCube.jsx',
]

// Anything that would connect the decorative cube to the user's cube,
// the solver, or saved data.
const FORBIDDEN = [
  'CubeInput',
  'cubeSolver',
  'solveCubeAsync',
  'validateCube',
  'localStorage',
  'sessionStorage',
]

test('the homepage cube never touches the solving cube, solver, or storage', () => {
  for (const file of HOMEPAGE_CUBE_FILES) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    for (const word of FORBIDDEN) {
      assert.ok(!source.includes(word), `${file} must not mention ${word}`)
    }
  }
})