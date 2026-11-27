import test from 'node:test'
import assert from 'node:assert/strict'
import { getStickerPlacements } from './cubeLayout.js'

const placements = getStickerPlacements()

// Compares element by element with ===, so 0 and -0 count as equal.
function same(a, b) {
  return a.length === b.length && a.every((value, i) => value === b[i])
}

function find(faceId, index) {
  return placements.find((p) => p.faceId === faceId && p.index === index)
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

test('there are 54 stickers, nine on each face', () => {
  assert.equal(placements.length, 54)
  for (const faceId of ['U', 'R', 'F', 'D', 'L', 'B']) {
    assert.equal(placements.filter((p) => p.faceId === faceId).length, 9)
  }
})

test('every sticker sits on the outside surface of the cube', () => {
  for (const p of placements) {
    assert.ok(p.position.every((value) => Math.abs(value) <= 1))
    assert.equal(dot(p.position, p.normal), 1)
  }
})

test('no two stickers share the same spot and direction', () => {
  const keys = new Set(
    placements.map((p) => `${p.position.join(',')}|${p.normal.join(',')}`)
  )
  assert.equal(keys.size, 54)
})

test('each face points the way its name says', () => {
  assert.ok(same(find('U', 4).normal, [0, 1, 0]))
  assert.ok(same(find('D', 4).normal, [0, -1, 0]))
  assert.ok(same(find('F', 4).normal, [0, 0, 1]))
  assert.ok(same(find('B', 4).normal, [0, 0, -1]))
  assert.ok(same(find('R', 4).normal, [1, 0, 0]))
  assert.ok(same(find('L', 4).normal, [-1, 0, 0]))
})

test('each center sticker sits in the middle of its face', () => {
  for (const faceId of ['U', 'R', 'F', 'D', 'L', 'B']) {
    const center = find(faceId, 4)
    assert.ok(same(center.position, center.normal))
  }
})

test('the three stickers of the Up-Right-Front corner share one piece', () => {
  assert.ok(same(find('U', 8).position, [1, 1, 1]))
  assert.ok(same(find('R', 0).position, [1, 1, 1]))
  assert.ok(same(find('F', 2).position, [1, 1, 1]))
})

test('orientation convention: where sticker 0 of each face sits', () => {
  // Up is viewed with Back at the top, Down with Front at the top,
  // and the side faces with Up at the top.
  assert.ok(same(find('U', 0).position, [-1, 1, -1])) // up, left, back
  assert.ok(same(find('D', 0).position, [-1, -1, 1])) // down, left, front
  assert.ok(same(find('F', 0).position, [-1, 1, 1])) // up, left, front
  assert.ok(same(find('B', 0).position, [1, 1, -1])) // up, right, back
  assert.ok(same(find('R', 0).position, [1, 1, 1])) // up, front, right
  assert.ok(same(find('L', 0).position, [-1, 1, -1])) // up, back, left
})