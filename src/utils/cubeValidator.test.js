import test from 'node:test'
import assert from 'node:assert/strict'
import { validateCube } from './cubeValidator.js'
import {
  applyMove,
  applyMoves,
  createSolvedCube,
  scrambleMoves,
} from './cubeMoves.js'

const COLORS = {
  U: 'white',
  D: 'yellow',
  F: 'green',
  B: 'blue',
  R: 'red',
  L: 'orange',
}

// Copy a cube, then let `change` edit the copy.
function modified(cube, change) {
  const copy = Object.fromEntries(
    Object.entries(cube).map(([id, stickers]) => [id, [...stickers]])
  )
  change(copy)
  return copy
}

function failedLevel(result) {
  return result.levels.find((level) => level.status === 'failed')
}

const solved = createSolvedCube(COLORS)

test('a solved cube is valid', () => {
  const result = validateCube(solved)
  assert.equal(result.status, 'valid')
  assert.ok(result.levels.every((level) => level.status === 'passed'))
})

test('move helper: four turns of the same face return to solved', () => {
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    assert.deepEqual(applyMoves(solved, [face, face, face, face]), solved)
  }
})

test('move helper: a move followed by its inverse returns to solved', () => {
  assert.deepEqual(applyMoves(solved, ['R', "R'"]), solved)
  assert.deepEqual(applyMoves(solved, ['F2', 'F2']), solved)
})

test('every single legal move gives a valid cube', () => {
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    for (const suffix of ['', "'", '2']) {
      const result = validateCube(applyMove(solved, face + suffix))
      assert.equal(result.status, 'valid', `${face}${suffix} should be valid`)
    }
  }
})

test('cubes scrambled with legal moves are valid', () => {
  for (const seed of [1, 7, 42, 2026, 99999]) {
    const moves = scrambleMoves(30, seed)
    const scrambled = applyMoves(solved, moves)
    assert.notDeepEqual(scrambled, solved, 'scramble should change the cube')
    const result = validateCube(scrambled)
    assert.equal(result.status, 'valid', `seed ${seed}: ${moves.join(' ')}`)
  }
})

test('an incomplete cube is reported with the faces that are missing stickers', () => {
  const cube = modified(solved, (c) => {
    c.F[0] = null
    c.F[1] = null
    c.U[8] = null
  })
  const result = validateCube(cube)
  assert.equal(result.status, 'incomplete')
  const text = failedLevel(result).problems.join(' ')
  assert.match(text, /Front face: 2 stickers/)
  assert.match(text, /Up face: 1 sticker /)
})

test('wrong color counts are reported', () => {
  const cube = modified(solved, (c) => {
    c.U[1] = 'red' // one white sticker became red
  })
  const result = validateCube(cube)
  assert.equal(result.status, 'invalid')
  assert.equal(failedLevel(result).id, 'counts')
  const text = failedLevel(result).problems.join(' ')
  assert.match(text, /White appears 8 times/)
  assert.match(text, /Red appears 10 times/)
})

test('duplicate and missing pieces are reported when counts are correct', () => {
  const cube = modified(solved, (c) => {
    c.B[1] = 'red' // UB edge now looks like UR
    c.R[7] = 'blue' // DR edge now looks like DB
  })
  const result = validateCube(cube)
  assert.equal(result.status, 'invalid')
  assert.equal(failedLevel(result).id, 'pieces')
  const text = failedLevel(result).problems.join(' ')
  assert.match(text, /white-red edge piece appears 2 times/)
  assert.match(text, /yellow-blue edge piece appears 2 times/)
  assert.match(text, /white-blue edge piece is missing/)
  assert.match(text, /yellow-red edge piece is missing/)
})

test('opposite colors on one edge are rejected', () => {
  const cube = modified(solved, (c) => {
    c.F[1] = 'yellow' // UF edge: white + yellow
    c.D[1] = 'green' // keeps all color counts at nine
  })
  const result = validateCube(cube)
  assert.equal(result.status, 'invalid')
  assert.equal(failedLevel(result).id, 'pieces')
  assert.match(failedLevel(result).problems.join(' '), /opposite/)
})

test('a single flipped edge is rejected', () => {
  const cube = modified(solved, (c) => {
    c.U[7] = 'green' // UF edge flipped in place
    c.F[1] = 'white'
  })
  const result = validateCube(cube)
  assert.equal(result.status, 'invalid')
  assert.equal(failedLevel(result).id, 'parity')
  assert.match(failedLevel(result).problems.join(' '), /Edge flips/)
})

test('a single twisted corner is rejected', () => {
  const cube = modified(solved, (c) => {
    c.U[8] = 'red' // URF corner twisted in place
    c.R[0] = 'green'
    c.F[2] = 'white'
  })
  const result = validateCube(cube)
  assert.equal(result.status, 'invalid')
  assert.equal(failedLevel(result).id, 'parity')
  assert.match(failedLevel(result).problems.join(' '), /Corner twists/)
})

test('swapping only two edges is rejected', () => {
  const cube = modified(solved, (c) => {
    c.F[1] = 'red' // UF position now holds the UR piece
    c.R[1] = 'green' // UR position now holds the UF piece
  })
  const result = validateCube(cube)
  assert.equal(result.status, 'invalid')
  assert.equal(failedLevel(result).id, 'parity')
  assert.match(failedLevel(result).problems.join(' '), /out of step/)
})