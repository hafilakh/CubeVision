import test from 'node:test'
import assert from 'node:assert/strict'
import Cube from 'cubejs'
import { validateCube } from './cubeValidator.js'
import {
  applyMove,
  applyMoves,
  createSolvedCube,
  scrambleMoves,
} from './cubeMoves.js'
import { cubeToFacelets, isSolvedCube, solveCube } from './cubeSolver.js'

const STANDARD = {
  U: 'white',
  D: 'yellow',
  F: 'green',
  B: 'blue',
  R: 'red',
  L: 'orange',
}

// A different but physically possible color layout.
const OTHER = {
  U: 'red',
  D: 'orange',
  F: 'white',
  B: 'yellow',
  R: 'blue',
  L: 'green',
}

const SOLVED_FACELETS =
  'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

const ALL_MOVES = ['U', 'R', 'F', 'D', 'L', 'B'].flatMap((face) => [
  face,
  `${face}'`,
  `${face}2`,
])

function modified(cube, change) {
  const copy = Object.fromEntries(
    Object.entries(cube).map(([id, stickers]) => [id, [...stickers]])
  )
  change(copy)
  return copy
}

const solved = createSolvedCube(STANDARD)

test('facelets: a solved cube becomes the standard solved string', () => {
  assert.equal(cubeToFacelets(solved), SOLVED_FACELETS)
})

test('facelets: other color layouts map through the centers', () => {
  assert.equal(cubeToFacelets(createSolvedCube(OTHER)), SOLVED_FACELETS)
})

test('facelets: every move matches the cubejs library exactly', () => {
  for (const move of ALL_MOVES) {
    const ours = cubeToFacelets(applyMove(solved, move))
    const theirs = new Cube().move(move).asString()
    assert.equal(ours, theirs, `move ${move} disagrees with cubejs`)
  }
})

test('facelets: duplicate center colors are rejected', () => {
  const cube = modified(solved, (c) => {
    c.D[4] = 'white'
  })
  assert.throws(() => cubeToFacelets(cube), /share the center color/)
})

test('solver: an already solved cube needs no moves', () => {
  const result = solveCube(solved)
  assert.equal(result.status, 'solved')
  assert.equal(result.alreadySolved, true)
  assert.deepEqual(result.moves, [])
})

test('solver: an incomplete cube is not solved', () => {
  const cube = modified(solved, (c) => {
    c.F[0] = null
  })
  const result = solveCube(cube)
  assert.equal(result.status, 'incomplete')
  assert.deepEqual(result.moves, [])
})

test('solver: wrong color counts are rejected', () => {
  const cube = modified(solved, (c) => {
    c.U[1] = 'red'
  })
  const result = solveCube(cube)
  assert.equal(result.status, 'invalid')
  assert.deepEqual(result.moves, [])
})

test('solver: a single flipped edge is rejected', () => {
  const cube = modified(solved, (c) => {
    c.U[7] = 'green'
    c.F[1] = 'white'
  })
  assert.equal(validateCube(cube).status, 'invalid')
  const result = solveCube(cube)
  assert.equal(result.status, 'invalid')
  assert.deepEqual(result.moves, [])
})

test('solver: a single legal move is solved', () => {
  const scrambled = applyMove(solved, 'R')
  const result = solveCube(scrambled)
  assert.equal(result.status, 'solved')
  assert.ok(result.moves.length >= 1)
  assert.ok(isSolvedCube(applyMoves(scrambled, result.moves)))
})

test('solver: legally scrambled cubes are solved and verified', () => {
  for (const seed of [1, 7, 42, 2026, 99999]) {
    const scrambled = applyMoves(solved, scrambleMoves(30, seed))
    assert.ok(!isSolvedCube(scrambled), 'scramble should change the cube')

    const result = solveCube(scrambled)
    assert.equal(result.status, 'solved', `seed ${seed}: ${result.message}`)
    assert.ok(result.moves.length > 0 && result.moves.length <= 22)
    for (const move of result.moves) {
      assert.match(move, /^[URFDLB](['2])?$/)
    }
    // Independent check, outside solveCube's own verification.
    assert.ok(isSolvedCube(applyMoves(scrambled, result.moves)))
  }
})

test('solver: works with a different color layout', () => {
  const other = createSolvedCube(OTHER)
  const scrambled = applyMoves(other, scrambleMoves(25, 123))
  const result = solveCube(scrambled)
  assert.equal(result.status, 'solved', result.message)
  assert.ok(isSolvedCube(applyMoves(scrambled, result.moves)))
})