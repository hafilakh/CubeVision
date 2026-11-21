// Pure cube-validation logic. No React in this file.
//
// Cube format (same as CubeInput): { U: [9], R: [9], F: [9], D: [9], L: [9], B: [9] }
// Each face is 9 stickers, numbered 0-8 left to right, top to bottom,
// viewed from OUTSIDE the cube as in an unfolded net:
//   U: Back at top | D: Front at top | R, F, L, B: Up at top.
// A sticker is a color name, or null if not entered yet.

export const FACE_IDS = ['U', 'R', 'F', 'D', 'L', 'B']
export const FACE_NAMES = {
  U: 'Up',
  R: 'Right',
  F: 'Front',
  D: 'Down',
  L: 'Left',
  B: 'Back',
}
export const CENTER_INDEX = 4
export const STICKERS_PER_COLOR = 9
export const COLOR_NAMES = ['white', 'yellow', 'red', 'orange', 'blue', 'green']

// Which face touches each edge of a face's 3x3 grid (for the UI).
export const FACE_VIEWS = {
  U: { top: 'B', bottom: 'F', left: 'L', right: 'R' },
  R: { top: 'U', bottom: 'D', left: 'F', right: 'B' },
  F: { top: 'U', bottom: 'D', left: 'L', right: 'R' },
  D: { top: 'F', bottom: 'B', left: 'L', right: 'R' },
  L: { top: 'U', bottom: 'D', left: 'B', right: 'F' },
  B: { top: 'U', bottom: 'D', left: 'R', right: 'L' },
}

const OPPOSITE = { U: 'D', D: 'U', F: 'B', B: 'F', R: 'L', L: 'R' }

// ---- Cubie tables --------------------------------------------------------
// Each slot lists [face, stickerIndex] pairs. Corner slots are in CLOCKWISE
// order, starting with the sticker on the U or D face.

const CORNER_SLOTS = [
  [['U', 8], ['R', 0], ['F', 2]], // URF
  [['U', 6], ['F', 0], ['L', 2]], // UFL
  [['U', 0], ['L', 0], ['B', 2]], // ULB
  [['U', 2], ['B', 0], ['R', 2]], // UBR
  [['D', 2], ['F', 8], ['R', 6]], // DFR
  [['D', 0], ['L', 8], ['F', 6]], // DLF
  [['D', 6], ['B', 8], ['L', 6]], // DBL
  [['D', 8], ['R', 8], ['B', 6]], // DRB
]

// The solved colors of each corner piece, in the same clockwise order.
const CORNER_COLORS = [
  ['U', 'R', 'F'],
  ['U', 'F', 'L'],
  ['U', 'L', 'B'],
  ['U', 'B', 'R'],
  ['D', 'F', 'R'],
  ['D', 'L', 'F'],
  ['D', 'B', 'L'],
  ['D', 'R', 'B'],
]

const EDGE_SLOTS = [
  [['U', 5], ['R', 1]], // UR
  [['U', 7], ['F', 1]], // UF
  [['U', 3], ['L', 1]], // UL
  [['U', 1], ['B', 1]], // UB
  [['D', 5], ['R', 7]], // DR
  [['D', 1], ['F', 7]], // DF
  [['D', 3], ['L', 7]], // DL
  [['D', 7], ['B', 7]], // DB
  [['F', 5], ['R', 3]], // FR
  [['F', 3], ['L', 5]], // FL
  [['B', 5], ['L', 3]], // BL
  [['B', 3], ['R', 5]], // BR
]

const EDGE_COLORS = [
  ['U', 'R'], ['U', 'F'], ['U', 'L'], ['U', 'B'],
  ['D', 'R'], ['D', 'F'], ['D', 'L'], ['D', 'B'],
  ['F', 'R'], ['F', 'L'], ['B', 'L'], ['B', 'R'],
]

const CORNER_NAMES = CORNER_COLORS.map((letters) => letters.join(''))
const EDGE_NAMES = EDGE_COLORS.map((letters) => letters.join(''))

// ---- Small helpers -------------------------------------------------------

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// 'URF' -> 'Up-Right-Front'
function slotName(name) {
  return name
    .split('')
    .map((letter) => FACE_NAMES[letter])
    .join('-')
}

function permutationParity(permutation) {
  let inversions = 0
  for (let i = 0; i < permutation.length; i++) {
    for (let j = i + 1; j < permutation.length; j++) {
      if (permutation[i] > permutation[j]) inversions++
    }
  }
  return inversions % 2
}

// ---- Level 1: completeness ----------------------------------------------

export function getMissingByFace(cube) {
  return FACE_IDS.map((id) => ({
    id,
    name: FACE_NAMES[id],
    count: cube[id].filter((sticker) => sticker === null).length,
  })).filter((face) => face.count > 0)
}

function completenessProblems(cube) {
  return getMissingByFace(cube).map(
    (face) => `${face.name} face: ${plural(face.count, 'sticker')} not entered yet.`
  )
}

// ---- Level 2: color counts ----------------------------------------------

function countProblems(cube) {
  const problems = []

  const centerOwner = {}
  FACE_IDS.forEach((id) => {
    const color = cube[id][CENTER_INDEX]
    if (centerOwner[color]) {
      problems.push(
        `The ${FACE_NAMES[centerOwner[color]]} and ${FACE_NAMES[id]} faces both have a ${color} center. Each face needs its own color.`
      )
    } else {
      centerOwner[color] = id
    }
  })

  const allStickers = FACE_IDS.flatMap((id) => cube[id])
  COLOR_NAMES.forEach((color) => {
    const count = allStickers.filter((sticker) => sticker === color).length
    if (count !== STICKERS_PER_COLOR) {
      problems.push(
        `${capitalize(color)} appears ${plural(count, 'time')} but should appear exactly ${STICKERS_PER_COLOR} times.`
      )
    }
  })

  allStickers.forEach((sticker) => {
    if (!COLOR_NAMES.includes(sticker)) {
      problems.push(`Unknown color "${sticker}" found.`)
    }
  })

  return [...new Set(problems)]
}

// ---- Level 3: real pieces -----------------------------------------------

function identifyCorner(letters) {
  if (new Set(letters).size < 3) {
    return { error: 'a real corner never repeats a color' }
  }
  const hasOpposite = letters.some((letter) => letters.includes(OPPOSITE[letter]))
  if (hasOpposite) {
    return { error: 'opposite-face colors (like white and yellow) can never share a corner' }
  }

  // Exactly one sticker is on the U or D face.
  const twist = letters.findIndex((letter) => letter === 'U' || letter === 'D')
  const ordered = [
    letters[twist],
    letters[(twist + 1) % 3],
    letters[(twist + 2) % 3],
  ]
  const piece = CORNER_COLORS.findIndex(
    (colors) => colors.join('') === ordered.join('')
  )
  if (piece === -1) {
    return { error: 'these colors are in a mirror-image order that no real corner has' }
  }
  return { piece, twist }
}

function identifyEdge(letters) {
  const [first, second] = letters
  if (first === second) {
    return { error: 'a real edge never repeats a color' }
  }
  if (OPPOSITE[first] === second) {
    return { error: 'opposite-face colors (like white and yellow) can never share an edge' }
  }
  const direct = EDGE_COLORS.findIndex(
    (colors) => colors[0] === first && colors[1] === second
  )
  if (direct !== -1) return { piece: direct, flip: 0 }

  const flipped = EDGE_COLORS.findIndex(
    (colors) => colors[0] === second && colors[1] === first
  )
  return { piece: flipped, flip: 1 }
}

function duplicateAndMissingProblems(pieceAt, pieceNames, kind, faceToColor) {
  const problems = []
  const seen = Array(pieceNames.length).fill(0)
  pieceAt.forEach((piece) => {
    seen[piece]++
  })
  seen.forEach((times, piece) => {
    const colors = pieceNames[piece]
      .split('')
      .map((letter) => faceToColor[letter])
      .join('-')
    if (times > 1) {
      problems.push(
        `The ${colors} ${kind} piece appears ${times} times (it should appear once).`
      )
    }
    if (times === 0) {
      problems.push(`The ${colors} ${kind} piece is missing.`)
    }
  })
  return problems
}

function analyzePieces(cube, colorToFace, faceToColor) {
  const problems = []
  const cornerPiece = []
  const cornerTwist = []
  const edgePiece = []
  const edgeFlip = []

  CORNER_SLOTS.forEach((slots, position) => {
    const colors = slots.map(([face, index]) => cube[face][index])
    const letters = colors.map((color) => colorToFace[color])
    const found = identifyCorner(letters)
    if (found.error) {
      problems.push(
        `The ${slotName(CORNER_NAMES[position])} corner shows ${colors.join(', ')}: ${found.error}.`
      )
    } else {
      cornerPiece[position] = found.piece
      cornerTwist[position] = found.twist
    }
  })

  EDGE_SLOTS.forEach((slots, position) => {
    const colors = slots.map(([face, index]) => cube[face][index])
    const letters = colors.map((color) => colorToFace[color])
    const found = identifyEdge(letters)
    if (found.error) {
      problems.push(
        `The ${slotName(EDGE_NAMES[position])} edge shows ${colors.join(', ')}: ${found.error}.`
      )
    } else {
      edgePiece[position] = found.piece
      edgeFlip[position] = found.flip
    }
  })

  // Duplicates are only meaningful once every slot holds a real piece.
  if (problems.length === 0) {
    problems.push(
      ...duplicateAndMissingProblems(cornerPiece, CORNER_NAMES, 'corner', faceToColor),
      ...duplicateAndMissingProblems(edgePiece, EDGE_NAMES, 'edge', faceToColor)
    )
  }

  return { problems, cornerPiece, cornerTwist, edgePiece, edgeFlip }
}

// ---- Level 4: orientation and permutation rules --------------------------

function parityProblems({ cornerPiece, cornerTwist, edgePiece, edgeFlip }) {
  const problems = []

  const twistTotal = cornerTwist.reduce((sum, twist) => sum + twist, 0)
  if (twistTotal % 3 !== 0) {
    problems.push(
      'Corner twists do not cancel out. On a real cube you cannot twist a single corner on its own, so at least one corner is twisted in place.'
    )
  }

  const flipTotal = edgeFlip.reduce((sum, flip) => sum + flip, 0)
  if (flipTotal % 2 !== 0) {
    problems.push(
      'Edge flips do not cancel out. On a real cube you cannot flip a single edge on its own, so at least one edge is flipped in place.'
    )
  }

  if (permutationParity(cornerPiece) !== permutationParity(edgePiece)) {
    problems.push(
      'Edges and corners are out of step. A real cube cannot have exactly two pieces swapped, so this usually means two pieces are swapped.'
    )
  }

  return problems
}

// ---- Public API ----------------------------------------------------------

const LEVEL_TITLES = [
  { id: 'completeness', title: 'All 48 editable stickers entered' },
  { id: 'counts', title: 'Exactly nine stickers of each color' },
  { id: 'pieces', title: 'Every edge and corner is a real piece, once each' },
  { id: 'parity', title: 'Twist, flip and swap rules' },
]

function buildResult(status, levelProblems) {
  const levels = LEVEL_TITLES.map((level, i) => {
    const problems = levelProblems[i]
    let levelStatus = 'skipped'
    if (problems) levelStatus = problems.length === 0 ? 'passed' : 'failed'
    return { ...level, status: levelStatus, problems: problems || [] }
  })
  return { status, levels }
}

// Returns { status: 'incomplete' | 'invalid' | 'valid', levels: [...] }.
// Levels run in order and stop at the first level that fails, because
// later levels give confusing results when earlier ones are broken.
export function validateCube(cube) {
  const completeness = completenessProblems(cube)
  if (completeness.length > 0) return buildResult('incomplete', [completeness])

  const counts = countProblems(cube)
  if (counts.length > 0) return buildResult('invalid', [[], counts])

  const colorToFace = {}
  const faceToColor = {}
  FACE_IDS.forEach((id) => {
    const color = cube[id][CENTER_INDEX]
    colorToFace[color] = id
    faceToColor[id] = color
  })

  const pieces = analyzePieces(cube, colorToFace, faceToColor)
  if (pieces.problems.length > 0) {
    return buildResult('invalid', [[], [], pieces.problems])
  }

  const parity = parityProblems(pieces)
  if (parity.length > 0) return buildResult('invalid', [[], [], [], parity])

  return buildResult('valid', [[], [], [], []])
}