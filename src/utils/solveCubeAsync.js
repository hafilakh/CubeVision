// Browser-side wrapper: sends work to the worker and returns Promises.
let worker = null
let nextId = 1
const pending = new Map()

function rejectAll(message) {
  pending.forEach(({ reject }) => reject(new Error(message)))
  pending.clear()
}

function getWorker() {
  if (worker) return worker

  worker = new Worker(new URL('./cubeSolver.worker.js', import.meta.url), {
    type: 'module',
  })

  worker.onmessage = (event) => {
    const { id, result, error } = event.data
    const request = pending.get(id)
    if (!request) return
    pending.delete(id)
    if (error) request.reject(new Error(error))
    else request.resolve(result)
  }

  worker.onerror = (event) => {
  console.error('Solver worker error:', event)
  console.error('Error message:', event.message)
  console.error('Error file:', event.filename)
  console.error('Error line:', event.lineno)

  rejectAll(event.message || 'The solver worker crashed.')
  worker.terminate()
  worker = null
}

  return worker
}

function request(message) {
  return new Promise((resolve, reject) => {
    const id = nextId++
    try {
      const activeWorker = getWorker()
      pending.set(id, { resolve, reject })
      activeWorker.postMessage({ id, ...message })
    } catch (error) {
      pending.delete(id)
      reject(error)
    }
  })
}

// Optional: call early so the 4-5 second setup finishes before the user clicks Solve.
export function warmUpSolver() {
  return request({ type: 'warmup' })
}

export function solveCubeAsync(cube) {
  return request({ type: 'solve', cube })
}