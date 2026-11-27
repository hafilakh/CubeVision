import { useEffect, useRef, useState } from 'react'

const KEY_STEP = Math.PI / 12
const KEY_ROTATIONS = {
  ArrowLeft: [-KEY_STEP, 0],
  ArrowRight: [KEY_STEP, 0],
  ArrowUp: [0, -KEY_STEP],
  ArrowDown: [0, KEY_STEP],
}

// Shows the cube it is given in 3D. It never changes the cube.
function CubeViewer({ cube }) {
  const stageRef = useRef(null)
  const sceneRef = useRef(null)
  const cubeRef = useRef(cube)
  const [status, setStatus] = useState('loading') // loading | ready | unavailable

  // Create the 3D scene once. Three.js is loaded only now, as its own file.
  useEffect(() => {
    let cancelled = false
    let scene = null

    import('../three/cubeScene.js')
      .then(({ CubeScene }) => {
        if (cancelled || !stageRef.current) return
        scene = new CubeScene(stageRef.current)
        sceneRef.current = scene
        scene.setCubeState(cubeRef.current)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable')
      })

    return () => {
      cancelled = true
      sceneRef.current = null
      if (scene) scene.dispose()
    }
  }, [])

  // Redraw whenever the entered cube changes.
  useEffect(() => {
    cubeRef.current = cube
    if (sceneRef.current) sceneRef.current.setCubeState(cube)
  }, [cube])

  function handleKeyDown(event) {
    const rotation = KEY_ROTATIONS[event.key]
    if (!rotation || !sceneRef.current) return
    event.preventDefault()
    sceneRef.current.rotateBy(...rotation)
  }

  return (
    <section className="cube-viewer" aria-labelledby="viewer-title">
      <div className="viewer-header">
        <h3 id="viewer-title">Your cube in 3D</h3>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => sceneRef.current?.resetView()}
          disabled={status !== 'ready'}
        >
          Reset view
        </button>
      </div>

      <div className="viewer-frame">
        <div
          ref={stageRef}
          className="viewer-stage"
          tabIndex={0}
          role="group"
          aria-label="Interactive 3D view of the cube you entered"
          aria-describedby="viewer-hint"
          onKeyDown={handleKeyDown}
        />
        {status === 'loading' && (
          <p className="viewer-message" role="status">
            Loading 3D view...
          </p>
        )}
        {status === 'unavailable' && (
          <p className="viewer-message" role="status">
            The 3D view is not available on this device or browser. You can
            still enter and validate colors with the face grids above.
          </p>
        )}
      </div>

      <p id="viewer-hint" className="viewer-hint">
        Drag to rotate, scroll or pinch to zoom, or use the arrow keys. This
        view only moves the camera. It mirrors the colors you entered, and
        gray stickers are not entered yet.
      </p>
    </section>
  )
}

export default CubeViewer