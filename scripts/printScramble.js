// Prints a scrambled cube as colors, face by face, so you can type it in.
// Rows are read left to right, top to bottom, as shown in the app.
// Edit MOVES to try a different scramble, then run:
//   node scripts/printScramble.js
import { applyMoves, createSolvedCube } from '../src/utils/cubeMoves.js'
import { FACE_IDS } from '../src/utils/cubeValidator.js'

const COLORS = {
  U: 'white',
  D: 'yellow',
  F: 'green',
  B: 'blue',
  R: 'red',
  L: 'orange',
}

const MOVES = ['R', 'U', "F'", 'L2', 'D', 'B']

const cube = applyMoves(createSolvedCube(COLORS), MOVES)

console.log(`Scramble: ${MOVES.join(' ')}`)
console.log('')
for (const id of FACE_IDS) {
  console.log(`${id} face`)
  for (let row = 0; row < 3; row++) {
    console.log('  ' + cube[id].slice(row * 3, row * 3 + 3).join(', '))
  }
  console.log('')
}