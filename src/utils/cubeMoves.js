// Legal face turns for the facelet format used by cubeValidator.js.
// Used by the tests now, and reusable for the 3D cube and solver later.
import { FACE_IDS } from './cubeValidator.js'

// n = direction the face points, r = view-right, d = view-down
// (all as seen from outside the cube; x is right, y is up, z is toward you).
const GEOMETRY = {
  U: { n: [0, 1, 0], r: [1, 0, 0], d: [0, 0, 1] },
  D: { n: [0, -1, 0], r: [1, 0, 0], d: [0, 0, -1] },
  F: { n: [0, 0, 1], r: [1, 0, 0], d: [0, -1, 0] },
  B: { n: [0, 0, -1], r: [-1, 0, 0], d: [0, -1, 0] },
  R: { n: [1, 0, 0], r: [0, 0, -1], d: [0, -1, 0] },
  L: { n: [-1, 0, 0], r: [0, 0, 1], d: [0, -1, 0] },
}

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// Clockwise quarter turn (seen from outside) = -90 degrees about the axis.
function rotateClockwise(vector, axis) {
  const side = cross(axis, vector)
  const along = dot(axis, vector)
  return vector.map((_, i) => -side[i] + axis[i] * along)
}

const keyOf = (position, normal) => `${position.join(',')}|${normal.join(',')}`

// Flat list of all 54 stickers, in FACE_IDS order, 9 per face.
const FACELETS = FACE_IDS.flatMap((face) => {
  const { n, r, d } = GEOMETRY[face]
  return Array.from({ length: 9 }, (_, index) => {
    const col = (index % 3) - 1
    const row = Math.floor(index / 3) - 1
    const position = n.map((v, i) => v + col * r[i] + row * d[i])
    return { position, normal: n }
  })
})

const FLAT_INDEX = new Map(
  FACELETS.map((f, flat) => [keyOf(f.position, f.normal), flat])
)

// QUARTER_TURN[face][i] = where the sticker at flat position i ends up.
const QUARTER_TURN = Object.fromEntries(
  FACE_IDS.map((face) => {
    const axis = GEOMETRY[face].n
    const destination = FACELETS.map((f, flat) => {
      if (dot(f.position, axis) !== 1) return flat // not in this layer
      return FLAT_INDEX.get(
        keyOf(rotateClockwise(f.position, axis), rotateClockwise(f.normal, axis))
      )
    })
    return [face, destination]
  })
)

function toFlat(cube) {
  return FACE_IDS.flatMap((id) => cube[id])
}

function fromFlat(flat) {
  return Object.fromEntries(
    FACE_IDS.map((id, k) => [id, flat.slice(k * 9, k * 9 + 9)])
  )
}

export function createSolvedCube(faceColors) {
  return Object.fromEntries(
    FACE_IDS.map((id) => [id, Array(9).fill(faceColors[id])])
  )
}

// Move names: 'R' (clockwise), "R'" (counterclockwise), 'R2' (half turn).
export function applyMove(cube, move) {
  const face = move[0]
  const turns = move.endsWith("'") ? 3 : move.endsWith('2') ? 2 : 1
  let flat = toFlat(cube)
  for (let t = 0; t < turns; t++) {
    const next = Array(54)
    flat.forEach((color, source) => {
      next[QUARTER_TURN[face][source]] = color
    })
    flat = next
  }
  return fromFlat(flat)
}

export function applyMoves(cube, moves) {
  return moves.reduce((state, move) => applyMove(state, move), cube)
}

// Repeatable "random" scramble (same seed gives the same moves).
export function scrambleMoves(length, seed) {
  const faces = ['U', 'R', 'F', 'D', 'L', 'B']
  const suffixes = ['', "'", '2']
  const moves = []
  let state = seed
  const next = (limit) => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state % limit
  }
  while (moves.length < length) {
    const face = faces[next(6)]
    if (moves.length > 0 && moves[moves.length - 1][0] === face) continue
    moves.push(face + suffixes[next(3)])
  }
  return moves
}