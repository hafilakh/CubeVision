import test from 'node:test'
import assert from 'node:assert/strict'
import { describeMove } from './describeMove.js'

test('a plain move is a clockwise quarter turn', () => {
  assert.match(describeMove('R'), /Right face a quarter turn clockwise\./)
})

test('a prime move is counterclockwise', () => {
  assert.match(describeMove("U'"), /Up face a quarter turn counterclockwise\./)
})

test('a 2 move is a half turn', () => {
  assert.match(describeMove('F2'), /Front face a half turn/)
})

test('the center color is included when given', () => {
  const text = describeMove('L', { L: 'orange' })
  assert.match(text, /Left face \(orange center\)/)
})

test('every standard move has a description', () => {
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    for (const suffix of ['', "'", '2']) {
      assert.ok(describeMove(face + suffix).length > 0)
    }
  }
})

test('unknown moves are rejected', () => {
  assert.throws(() => describeMove('X'), /Unknown move/)
  assert.throws(() => describeMove("R'2"), /Unknown move/)
  assert.throws(() => describeMove(''), /Unknown move/)
})