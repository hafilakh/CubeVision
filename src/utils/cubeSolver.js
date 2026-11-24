// Solver engine. Pure JavaScript, no React.
// Wraps the cubejs library (Kociemba's two-phase algorithm).
import Cube from 'cubejs'
import { CENTER_INDEX, FACE_IDS, validateCube } from './cubeValidator.js'
import { applyMoves } from './cubeMoves.js'

const MOVE_PATTERN = /^[URFDLB](['2])?$/

let solverReady = false

// Builds cubejs's lookup tables. Takes about 4-5 seconds the first time,
// and does nothing on later calls.
export function initSolver() {
  if (!solverReady) {
    Cube.initSolver()
    solverReady = true
  }
}

// Turns our cube ({ U: [9], R: [9], ... } of color names) into the
// 54-letter facelet string cubejs expects, in U R F D L B order.
// Each color becomes the letter of the face whose center has that color.
export function cubeToFacelets(cube) {
  const colorToLetter = {}
  FACE_IDS.forEach((id) => {
    const centerColor = cube[id][CENTER_INDEX]
    if (colorToLetter[centerColor]) {
      throw new Error(`Two faces share the center color "${centerColor}".`)
    }
    colorToLetter[centerColor] = id
  })

  return FACE_IDS.flatMap((id) => cube[id])
    .map((color) => {
      const letter = colorToLetter[color]
      if (!letter) {
        throw new Error(`Sticker color "${color}" matches no face center.`)
      }
      return letter
    })
    .join('')
}

// True when every face is a single color.
export function isSolvedCube(cube) {
  return FACE_IDS.every((id) =>
    cube[id].every((color) => color === cube[id][CENTER_INDEX])
  )
}

function failure(status, message, validation) {
  return { status, moves: [], alreadySolved: false, message, validation }
}

// Returns { status, moves, alreadySolved, message, validation }.
// status is 'solved' (a verified solution exists, moves may be empty),
// 'incomplete', 'invalid' or 'error'.
export function solveCube(cube) {
  const validation = validateCube(cube)

  if (validation.status === 'incomplete') {
    return failure(
      'incomplete',
      'Enter every sticker before solving.',
      validation
    )
  }
  if (validation.status === 'invalid') {
    return failure(
      'invalid',
      'This cube cannot be solved because it is not a possible cube. Fix the problems found by validation first.',
      validation
    )
  }

  if (isSolvedCube(cube)) {
    return {
      status: 'solved',
      moves: [],
      alreadySolved: true,
      message: 'The cube is already solved.',
      validation,
    }
  }

  let moves
  try {
    initSolver()
    const text = Cube.fromString(cubeToFacelets(cube)).solve()
    if (typeof text !== 'string') {
      return failure('error', 'The solver did not return a solution.', validation)
    }
    moves = text.trim() === '' ? [] : text.trim().split(/\s+/)
  } catch (error) {
    return failure('error', `The solver failed: ${error.message}`, validation)
  }

  if (!moves.every((move) => MOVE_PATTERN.test(move))) {
    return failure(
      'error',
      'The solver returned moves in an unexpected format.',
      validation
    )
  }

  // Never trust the solver blindly: replay the moves on our own cube.
  if (!isSolvedCube(applyMoves(cube, moves))) {
    return failure(
      'error',
      'The solution failed verification, so it was discarded.',
      validation
    )
  }

  return {
    status: 'solved',
    moves,
    alreadySolved: false,
    message: `Solution found: ${moves.length} moves.`,
    validation,
  }
}