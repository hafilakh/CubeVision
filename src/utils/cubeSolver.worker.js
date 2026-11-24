// Runs the solver off the main thread so the page never freezes.
import { initSolver, solveCube } from './cubeSolver.js'

self.onmessage = (event) => {
  const { id, type, cube } = event.data

  try {
    if (type === 'warmup') {
      initSolver()
      self.postMessage({ id, result: null })
      return
    }
    self.postMessage({ id, result: solveCube(cube) })
  } catch (error) {
    self.postMessage({ id, error: error.message })
  }
}