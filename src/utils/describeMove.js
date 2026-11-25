// Turns a move like "R'" into a plain-English instruction.
// Pure JavaScript, no React, so it can be tested on its own.
import { FACE_NAMES } from './cubeValidator.js'

// centerColors is optional: { U: 'white', R: 'red', ... }
export function describeMove(move, centerColors = {}) {
  const match = /^([URFDLB])(['2])?$/.exec(move)
  if (!match) {
    throw new Error(`Unknown move "${move}".`)
  }

  const [, face, suffix] = match
  const color = centerColors[face]
  const faceText = color
    ? `${FACE_NAMES[face]} face (${color} center)`
    : `${FACE_NAMES[face]} face`

  if (suffix === "'") {
    return `Turn the ${faceText} a quarter turn counterclockwise.`
  }
  if (suffix === '2') {
    return `Turn the ${faceText} a half turn (180 degrees). Either direction works.`
  }
  return `Turn the ${faceText} a quarter turn clockwise.`
}