import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PALETTE,
  paletteColor,
  pointerToUv,
  shouldLetPageScroll,
  trailSteps,
} from './heroCubeMath.js'

function close(a, b) {
  return Math.abs(a - b) < 1e-9
}

test('paletteColor returns the palette colors at whole numbers', () => {
  PALETTE.forEach((color, index) => {
    assert.deepEqual(paletteColor(index), color)
  })
})

test('paletteColor wraps around the palette, including negatives', () => {
  assert.deepEqual(paletteColor(PALETTE.length), PALETTE[0])
  assert.deepEqual(paletteColor(-PALETTE.length), PALETTE[0])
  assert.deepEqual(paletteColor(PALETTE.length + 2), PALETTE[2])
})

test('paletteColor blends neighbors halfway at .5', () => {
  const middle = paletteColor(0.5)
  for (let i = 0; i < 3; i++) {
    assert.ok(close(middle[i], (PALETTE[0][i] + PALETTE[1][i]) / 2))
  }
})

test('paletteColor channels always stay between 0 and 1', () => {
  for (let phase = -3; phase < 12; phase += 0.37) {
    for (const channel of paletteColor(phase)) {
      assert.ok(channel >= 0 && channel <= 1)
    }
  }
})

const rect = { left: 100, top: 50, width: 200, height: 100 }

test('pointerToUv maps the center and corners', () => {
  assert.deepEqual(pointerToUv(200, 100, rect), { u: 0.5, v: 0.5 })
  assert.deepEqual(pointerToUv(100, 50, rect), { u: 0, v: 1 })
  assert.deepEqual(pointerToUv(300, 150, rect), { u: 1, v: 0 })
})

test('pointerToUv clamps positions outside the element', () => {
  assert.deepEqual(pointerToUv(0, 0, rect), { u: 0, v: 1 })
  assert.deepEqual(pointerToUv(1000, 1000, rect), { u: 1, v: 0 })
})

test('trailSteps gives nothing when the pointer did not move', () => {
  assert.deepEqual(trailSteps({ u: 0.3, v: 0.3 }, { u: 0.3, v: 0.3 }, 0.02, 8), [])
})

test('trailSteps spaces points evenly and ends at the target', () => {
  const steps = trailSteps({ u: 0, v: 0 }, { u: 0.1, v: 0 }, 0.02, 8)
  assert.equal(steps.length, 5)
  assert.ok(close(steps[0].u, 0.02))
  assert.ok(close(steps[4].u, 0.1))
})

test('trailSteps caps the number of points for very fast drags', () => {
  const steps = trailSteps({ u: 0, v: 0 }, { u: 1, v: 0 }, 0.01, 8)
  assert.equal(steps.length, 8)
  assert.ok(close(steps[7].u, 1))
})

test('wheel: the page scrolls only at the zoom limits', () => {
  assert.equal(shouldLetPageScroll(-100, 5.5, 5.5, 10.5), true) // at closest, scrolling up
  assert.equal(shouldLetPageScroll(100, 10.5, 5.5, 10.5), true) // at farthest, scrolling down
  assert.equal(shouldLetPageScroll(100, 9, 5.5, 10.5), false) // can still zoom out
  assert.equal(shouldLetPageScroll(-100, 9, 5.5, 10.5), false) // can still zoom in
  assert.equal(shouldLetPageScroll(-100, 10.5, 5.5, 10.5), false) // zooming in from the far limit
  assert.equal(shouldLetPageScroll(0, 5.5, 5.5, 10.5), false)
})