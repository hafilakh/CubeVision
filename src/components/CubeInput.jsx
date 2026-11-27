import { useRef, useState } from 'react'
import { solveCubeAsync, warmUpSolver } from '../utils/solveCubeAsync'
import CubeViewer from './CubeViewer'
import {
  FACE_NAMES,
  FACE_VIEWS,
  getMissingByFace,
  validateCube,
} from '../utils/cubeValidator'
import { describeMove } from '../utils/describeMove'

const CENTER_INDEX = 4
const EDITABLE_PER_FACE = 8
const STICKERS_PER_COLOR = 9

const COLORS = [
  { name: 'white', label: 'White' },
  { name: 'yellow', label: 'Yellow' },
  { name: 'red', label: 'Red' },
  { name: 'orange', label: 'Orange' },
  { name: 'blue', label: 'Blue' },
  { name: 'green', label: 'Green' },
]

// Face-to-color mapping. To use a different orientation, edit the
// `color` values here. Each face needs a different, valid color name.
const FACES = [
  { id: 'U', name: 'Up', color: 'white' },
  { id: 'D', name: 'Down', color: 'yellow' },
  { id: 'F', name: 'Front', color: 'green' },
  { id: 'B', name: 'Back', color: 'blue' },
  { id: 'R', name: 'Right', color: 'red' },
  { id: 'L', name: 'Left', color: 'orange' },
]

const TOTAL_EDITABLE = FACES.length * EDITABLE_PER_FACE

const LEVEL_STATUS_TEXT = {
  passed: 'Passed',
  failed: 'Failed',
  skipped: 'Not checked',
}

function createEmptyFace(centerColor) {
  const face = Array(9).fill(null)
  face[CENTER_INDEX] = centerColor
  return face
}

function createEmptyCube() {
  return Object.fromEntries(
    FACES.map((face) => [face.id, createEmptyFace(face.color)])
  )
}

function getColorLabel(name) {
  const match = COLORS.find((color) => color.name === name)
  return match ? match.label : name
}

function countColored(stickers) {
  return stickers.filter(
    (color, index) => index !== CENTER_INDEX && color !== null
  ).length
}

function describeSticker(faceName, index, color) {
  const row = Math.floor(index / 3) + 1
  const column = (index % 3) + 1
  const state = color ? getColorLabel(color) : 'empty'
  const locked = index === CENTER_INDEX ? ', center, locked' : ''
  return `${faceName} face, row ${row}, column ${column}: ${state}${locked}`
}

// { U: 'white', R: 'red', ... } read from the six fixed centers.
function getCenterColors(cube) {
  return Object.fromEntries(
    FACES.map((face) => [
      face.id,
      getColorLabel(cube[face.id][CENTER_INDEX]).toLowerCase(),
    ])
  )
}

function CubeInput() {
  // All six faces live in one object: { U: [9], D: [9], F: [9], ... }
  const [cube, setCube] = useState(createEmptyCube)
  const [selectedFaceId, setSelectedFaceId] = useState(FACES[0].id)
  const [selectedColor, setSelectedColor] = useState('red')
  // Each entry: { cube: <whole cube before an action>, faceId: <face it changed> }
  const [history, setHistory] = useState([])
  // { cube: <the cube that was checked>, result: <validator output> }
  const [validation, setValidation] = useState(null)
  // { cube: <the cube being solved>, status: 'loading' | 'done' | 'failed',
  //   outcome?: <solver output>, message?: <text> }
  const [solution, setSolution] = useState(null)
  const confirmRef = useRef(null)

  // Everything below is calculated from state, never stored separately.
  const selectedFace = FACES.find((face) => face.id === selectedFaceId)
  const stickers = cube[selectedFaceId]
  const faceCount = countColored(stickers)
  const totalCount = FACES.reduce(
    (sum, face) => sum + countColored(cube[face.id]),
    0
  )
  const allStickers = FACES.flatMap((face) => cube[face.id])
  const colorCounts = COLORS.map((color) => ({
    ...color,
    count: allStickers.filter((sticker) => sticker === color.name).length,
  }))
  const overfilled = colorCounts.filter(
    (color) => color.count > STICKERS_PER_COLOR
  )

  const missingByFace = getMissingByFace(cube)
  const isComplete = missingByFace.length === 0
  // A result only counts if it was computed for the cube on screen now.
  // Any edit creates a new cube object, so old results disappear by themselves.
  const result =
    validation && validation.cube === cube ? validation.result : null
  const resultIsStale = validation !== null && result === null

  // Same idea for solutions. A solver answer that arrives after the cube
  // changed is stored, but never shown, because its cube no longer matches.
  const solveEntry = solution && solution.cube === cube ? solution : null
  const isSolving = solveEntry !== null && solveEntry.status === 'loading'
  const canSolve = result !== null && result.status === 'valid' && !isSolving

  const view = FACE_VIEWS[selectedFaceId]
  function describeNeighbor(side) {
    const neighborId = view[side]
    const centerColor = cube[neighborId][CENTER_INDEX]
    return `${FACE_NAMES[neighborId]} (${getColorLabel(centerColor).toLowerCase()})`
  }

  function saveSnapshot(faceId) {
    setHistory((current) => [...current, { cube, faceId }])
  }

  function paintSticker(index) {
    if (index === CENTER_INDEX) return
    if (stickers[index] === selectedColor) return // not a real change

    const nextFace = stickers.map((color, i) =>
      i === index ? selectedColor : color
    )

    saveSnapshot(selectedFaceId)
    setCube({ ...cube, [selectedFaceId]: nextFace })
  }

  function resetFace() {
    if (faceCount === 0) return // already empty, nothing to save

    saveSnapshot(selectedFaceId)
    setCube({
      ...cube,
      [selectedFaceId]: createEmptyFace(selectedFace.color),
    })
  }

  function resetAll() {
    if (totalCount === 0) return

    saveSnapshot(null) // null means "no single face was affected"
    setCube(createEmptyCube())
  }

  function undo() {
    if (history.length === 0) return

    const lastEntry = history[history.length - 1]

    setCube(lastEntry.cube)
    if (lastEntry.faceId) setSelectedFaceId(lastEntry.faceId)
    setHistory((current) => current.slice(0, -1))
  }

  function handleValidate() {
    if (!isComplete) return
    const outcome = validateCube(cube)
    setValidation({ cube, result: outcome })
    // Start the solver's one-time setup early, so Solve feels faster.
    if (outcome.status === 'valid') {
      warmUpSolver().catch(() => {})
    }
  }

  async function handleSolve() {
    if (!canSolve) return

    const requestCube = cube // remember which cube this request is for
    setSolution({ cube: requestCube, status: 'loading' })

    try {
      const outcome = await solveCubeAsync(requestCube)
      // Only keep the answer if this request is still the current one.
      setSolution((current) =>
        current && current.cube === requestCube
          ? { cube: requestCube, status: 'done', outcome }
          : current
      )
    } catch (error) {
      setSolution((current) =>
        current && current.cube === requestCube
          ? { cube: requestCube, status: 'failed', message: error.message }
          : current
      )
    }
  }

  function openResetAllDialog() {
    confirmRef.current?.showModal()
  }

  function closeResetAllDialog() {
    confirmRef.current?.close()
  }

  function confirmResetAll() {
    resetAll()
    closeResetAllDialog()
  }

  function renderSolution() {
    if (!solveEntry) return null

    if (solveEntry.status === 'loading') {
      return (
        <div className="solve-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>
            Calculating the solution. The first solve can take several seconds
            while the solver sets itself up.
          </span>
        </div>
      )
    }

    if (solveEntry.status === 'failed') {
      return (
        <div className="solution is-error" role="alert">
          <h4>The solver ran into a problem</h4>
          <p className="solution-note">
            {solveEntry.message} Try again, or reload the page if it keeps
            happening.
          </p>
        </div>
      )
    }

    const outcome = solveEntry.outcome

    if (outcome.status !== 'solved') {
      return (
        <div className="solution is-error" role="alert">
          <h4>No solution was produced</h4>
          <p className="solution-note">{outcome.message}</p>
        </div>
      )
    }

    if (outcome.alreadySolved) {
      return (
        <div className="solution" role="region" aria-label="Solution">
          <h4>Already solved</h4>
          <p className="solution-note">
            Your cube is already solved, so no moves are needed.
          </p>
        </div>
      )
    }

    const centers = getCenterColors(cube)
    return (
      <div className="solution" role="region" aria-label="Solution">
        <h4>
          Solution found: {outcome.moves.length}{' '}
          {outcome.moves.length === 1 ? 'move' : 'moves'}
        </h4>
        <p className="solution-line">{outcome.moves.join(' ')}</p>
        <p className="solution-note">
          Hold the cube with the {centers.U} center on top and the{' '}
          {centers.F} center facing you. Clockwise and counterclockwise always
          mean as you look straight at the face being turned.
        </p>
        <ol className="solution-steps">
          {outcome.moves.map((move, index) => (
            <li key={`${index}-${move}`} className="solution-step">
              <span className="step-number">{index + 1}</span>
              <span className="step-move">{move}</span>
              <span className="step-text">{describeMove(move, centers)}</span>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <section className="cube-input" id="enter-cube">
      <div className="cube-input-inner">
        <h2>Enter your cube colors</h2>
        <p className="cube-input-intro">
          Choose a face, pick a color, then click each sticker to match your
          physical cube. Look at every face from outside the cube: Up with the
          Back side at the top, Down with the Front side at the top, and every
          other face with Up at the top. Each face&apos;s center is fixed.
        </p>

        <div className="face-selector" role="group" aria-label="Cube faces">
          {FACES.map((face) => {
            const count = countColored(cube[face.id])
            const isSelected = face.id === selectedFaceId
            return (
              <button
                key={face.id}
                type="button"
                className={`face-tab ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelectedFaceId(face.id)}
                aria-pressed={isSelected}
                aria-label={`${face.name} face, ${getColorLabel(
                  face.color
                )} center, ${count} of ${EDITABLE_PER_FACE} stickers colored`}
              >
                <span className="face-tab-head">
                  <span
                    className={`face-tab-dot cell-${face.color}`}
                    aria-hidden="true"
                  />
                  {face.name} ({face.id})
                </span>
                <span className="face-tab-bar" aria-hidden="true">
                  <span
                    className="face-tab-fill"
                    style={{ width: `${(count / EDITABLE_PER_FACE) * 100}%` }}
                  />
                </span>
                <span className="face-tab-count" aria-hidden="true">
                  {count} / {EDITABLE_PER_FACE}
                </span>
              </button>
            )
          })}
        </div>

        <div className="cube-input-layout">
          <div className="face-panel">
            <h3 className="face-title">
              {selectedFace.name} face ({selectedFace.id}) ·{' '}
              {getColorLabel(selectedFace.color)} center
            </h3>
            <p className="face-orientation">
              Top edge touches {describeNeighbor('top')}, bottom{' '}
              {describeNeighbor('bottom')}, left {describeNeighbor('left')},
              right {describeNeighbor('right')}.
            </p>
            <div className="face-grid">
              {stickers.map((color, index) => {
                const isCenter = index === CENTER_INDEX
                return (
                  <button
                    key={index}
                    type="button"
                    className={`sticker ${
                      color ? `cell-${color}` : 'sticker-empty'
                    } ${isCenter ? 'sticker-locked' : ''}`}
                    onClick={() => paintSticker(index)}
                    aria-disabled={isCenter}
                    aria-label={describeSticker(selectedFace.name, index, color)}
                  />
                )
              })}
            </div>
          </div>

          <div className="controls">
            <h3>Color palette</h3>
            <div className="palette" role="group" aria-label="Color palette">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  className={`swatch cell-${color.name} ${
                    selectedColor === color.name ? 'is-selected' : ''
                  }`}
                  onClick={() => setSelectedColor(color.name)}
                  aria-pressed={selectedColor === color.name}
                  aria-label={color.label}
                  title={color.label}
                />
              ))}
            </div>

            <p className="selected-readout">
              Selected color: <strong>{getColorLabel(selectedColor)}</strong>
            </p>

            <p className="face-status" aria-live="polite">
              This face: {faceCount} of {EDITABLE_PER_FACE} stickers entered
            </p>
            <p className="face-status" aria-live="polite">
              All faces: {totalCount} of {TOTAL_EDITABLE} stickers entered
            </p>
            <p className="progress-note">
              Progress counts entered stickers. It does not check that the
              cube is valid.
            </p>

            <div className="face-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={undo}
                disabled={history.length === 0}
              >
                Undo
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={resetFace}
                disabled={faceCount === 0}
              >
                Reset face
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={openResetAllDialog}
                disabled={totalCount === 0}
              >
                Reset all faces
              </button>
            </div>

            <h3 className="counts-title">Color counts</h3>
            <ul className="color-counts">
              {colorCounts.map((color) => (
                <li
                  key={color.name}
                  className={`color-count ${
                    color.count > STICKERS_PER_COLOR ? 'is-over' : ''
                  }`}
                >
                  <span
                    className={`count-dot cell-${color.name}`}
                    aria-hidden="true"
                  />
                  {color.label}
                  <span className="count-value">
                    {color.count} / {STICKERS_PER_COLOR}
                  </span>
                </li>
              ))}
            </ul>
            <div aria-live="polite">
              {overfilled.map((color) => (
                <p key={color.name} className="count-warning">
                  Warning: {color.label} has {color.count} stickers. A cube
                  has exactly {STICKERS_PER_COLOR} of each color.
                </p>
              ))}
            </div>

            <div className="validation">
              <h3 className="counts-title">Check the cube</h3>
              <button
                type="button"
                className="btn-primary"
                onClick={handleValidate}
                disabled={!isComplete}
              >
                Validate cube
              </button>

              {!isComplete && (
                <p className="validation-hint">
                  Enter every sticker first. Still missing:{' '}
                  {missingByFace
                    .map((face) => `${face.name} ${face.count}`)
                    .join(', ')}
                  .
                </p>
              )}

              {resultIsStale && (
                <p className="validation-hint">
                  The cube changed since the last check. Validate again.
                </p>
              )}

              {result && (
                <div
                  className={`validation-result is-${result.status}`}
                  role="status"
                >
                  <h4>
                    {result.status === 'valid'
                      ? 'Valid: every check passed'
                      : result.status === 'invalid'
                        ? 'Invalid: this cannot be a real cube yet'
                        : 'Incomplete: some stickers are missing'}
                  </h4>
                  <ol className="validation-levels">
                    {result.levels.map((level) => (
                      <li key={level.id} className={`level is-${level.status}`}>
                        <span className="level-title">
                          {level.title}
                          <span className="level-status">
                            {LEVEL_STATUS_TEXT[level.status]}
                          </span>
                        </span>
                        {level.problems.length > 0 && (
                          <ul className="level-problems">
                            {level.problems.map((problem) => (
                              <li key={problem}>{problem}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ol>
                  {result.status === 'valid' ? (
                    <p className="validation-note">
                      These checks show the colors you entered could belong to
                      a legal cube that can be solved. They cannot show that
                      you entered what your physical cube really looks like.
                    </p>
                  ) : (
                    <p className="validation-note">
                      Checks stop at the first level that fails, because later
                      results would be unreliable. Fix the problems, then
                      validate again.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="solve">
              <h3 className="counts-title">Solve the cube</h3>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSolve}
                disabled={!canSolve}
              >
                {isSolving ? 'Solving...' : 'Solve cube'}
              </button>

              {!isSolving && !(result && result.status === 'valid') && (
                <p className="solve-hint">
                  Validate the cube first. Solving is available once every
                  check passes.
                </p>
              )}

              {renderSolution()}
            </div>
          </div>
        </div>

        <CubeViewer cube={cube} />
      </div>

      <dialog
        ref={confirmRef}
        className="confirm-dialog"
        aria-labelledby="confirm-title"
      >
        <h3 id="confirm-title">Reset all faces?</h3>
        <p>
          This clears all {TOTAL_EDITABLE} editable stickers on every face.
          The six centers stay fixed. You can undo this.
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={closeResetAllDialog}
          >
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={confirmResetAll}>
            Reset all faces
          </button>
        </div>
      </dialog>
    </section>
  )
}

export default CubeInput