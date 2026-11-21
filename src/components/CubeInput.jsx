import { useState } from 'react'

const CENTER_INDEX = 4
const FACE_CENTER_COLOR = 'white'

const COLORS = [
  { name: 'white', label: 'White' },
  { name: 'yellow', label: 'Yellow' },
  { name: 'red', label: 'Red' },
  { name: 'orange', label: 'Orange' },
  { name: 'blue', label: 'Blue' },
  { name: 'green', label: 'Green' },
]

function createEmptyFace() {
  const face = Array(9).fill(null)
  face[CENTER_INDEX] = FACE_CENTER_COLOR
  return face
}

function getColorLabel(name) {
  const match = COLORS.find((color) => color.name === name)
  return match ? match.label : name
}

function describeSticker(index, color) {
  const row = Math.floor(index / 3) + 1
  const column = (index % 3) + 1
  const state = color ? getColorLabel(color) : 'empty'
  const locked = index === CENTER_INDEX ? ', center, locked' : ''
  return `Row ${row}, column ${column}: ${state}${locked}`
}

function CubeInput() {
  const [stickers, setStickers] = useState(createEmptyFace)
  const [selectedColor, setSelectedColor] = useState('red')
  // History is a list of earlier versions of the whole face.
  const [history, setHistory] = useState([])

  const coloredCount = stickers.filter(
    (color, index) => index !== CENTER_INDEX && color !== null
  ).length

  function paintSticker(index) {
    if (index === CENTER_INDEX) return
    if (stickers[index] === selectedColor) return // not a real change

    const nextStickers = stickers.map((color, i) =>
      i === index ? selectedColor : color
    )

    setHistory((current) => [...current, stickers])
    setStickers(nextStickers)
  }

  function resetFace() {
    if (coloredCount === 0) return // already empty, nothing to save

    setHistory((current) => [...current, stickers])
    setStickers(createEmptyFace())
  }

  function undo() {
    if (history.length === 0) return

    const previousFace = history[history.length - 1]

    setStickers(previousFace)
    setHistory((current) => current.slice(0, -1))
  }

  return (
    <section className="cube-input" id="enter-cube">
      <div className="cube-input-inner">
        <h2>Enter your cube colors</h2>
        <p className="cube-input-intro">
          Hold your cube with the white-centered face toward you, then tell
          CubeVision the color of each sticker.
        </p>

        <div className="cube-input-layout">
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
                  aria-label={describeSticker(index, color)}
                />
              )
            })}
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
              {coloredCount} of 8 editable stickers colored
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
                disabled={coloredCount === 0}
              >
                Reset face
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CubeInput