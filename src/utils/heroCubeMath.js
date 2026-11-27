// Small pure helpers for the homepage cube. No browser or WebGL code,
// so they can be unit-tested in Node.

// Fluid Bloom colors as [red, green, blue] from 0 to 1:
// cyan, purple, blue, pink, green.
export const PALETTE = [
  [0.05, 0.85, 1.0],
  [0.62, 0.25, 1.0],
  [0.15, 0.35, 1.0],
  [1.0, 0.25, 0.65],
  [0.1, 0.95, 0.55],
]

// A smooth color for any number. Whole numbers are palette colors, and
// numbers in between blend two neighbors. The palette wraps around.
export function paletteColor(phase) {
  const count = PALETTE.length
  const wrapped = ((phase % count) + count) % count
  const index = Math.floor(wrapped)
  const blend = wrapped - index
  const from = PALETTE[index]
  const to = PALETTE[(index + 1) % count]
  return from.map((value, i) => value + (to[i] - value) * blend)
}

// Converts a pointer position on screen to 0-1 coordinates inside an
// element. u runs left to right, v runs bottom to top (like a texture).
export function pointerToUv(clientX, clientY, rect) {
  const clamp = (value) => Math.min(1, Math.max(0, value))
  return {
    u: clamp((clientX - rect.left) / rect.width),
    v: clamp(1 - (clientY - rect.top) / rect.height),
  }
}

// Points along a dragged line, evenly spaced, ending at `to` (the start
// point is not included). Used so fast drags leave a continuous trail.
export function trailSteps(from, to, spacing, maxSteps) {
  const distance = Math.hypot(to.u - from.u, to.v - from.v)
  if (distance === 0) return []
  const count = Math.min(maxSteps, Math.max(1, Math.ceil(distance / spacing)))
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / count
    return {
      u: from.u + (to.u - from.u) * t,
      v: from.v + (to.v - from.v) * t,
    }
  })
}

// When the cube is already at its zoom limit in the direction the wheel is
// turning, the page should scroll instead. Otherwise the cube would trap
// the scroll wheel. deltaY < 0 means zoom in, deltaY > 0 means zoom out.
export function shouldLetPageScroll(
  deltaY,
  distance,
  minDistance,
  maxDistance,
  tolerance = 0.05
) {
  if (deltaY < 0) return distance <= minDistance + tolerance
  if (deltaY > 0) return distance >= maxDistance - tolerance
  return false
}