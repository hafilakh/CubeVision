import { useRef, useState } from 'react'

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

function CubeInput() {
  // All six faces live in one object: { U: [9], D: [9], F: [9], ... }
  const [cube, setCube] = useState(createEmptyCube)
  const [selectedFaceId, setSelectedFaceId] = useState(FACES[0].id)
  const [selectedColor, setSelectedColor] = useState('red')
  // Each entry: { cube: <whole cube before an action>, faceId: <face it changed> }
  const [history, setHistory] = useState([])
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

  return (
    <section className="cube-input" id="enter-cube">
      <div className="cube-input-inner">
        <h2>Enter your cube colors</h2>
        <p className="cube-input-intro">
          Choose a face, pick a color, then click each sticker to match your
          physical cube. Each face&apos;s center is fixed.
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
          </div>
        </div>
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