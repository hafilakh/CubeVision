import { useEffect, useRef, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const KEY_STEP = Math.PI / 12

const KEY_ROTATIONS = {
  ArrowLeft: [-KEY_STEP, 0],
  ArrowRight: [KEY_STEP, 0],
  ArrowUp: [0, -KEY_STEP],
  ArrowDown: [0, KEY_STEP],
}

function HeroCube() {
  const stageRef = useRef(null)
  const sceneRef = useRef(null)
  const [status, setStatus] = useState('loading')

  const [effectsOn, setEffectsOn] = useState(
    () => !window.matchMedia(REDUCED_MOTION_QUERY).matches
  )

  const effectsRef = useRef(effectsOn)

  useEffect(() => {
    let cancelled = false
    let scene = null

    import('../three/heroCubeScene.js')
      .then(({ HeroCubeScene }) => {
        if (cancelled || !stageRef.current) return

        scene = new HeroCubeScene(stageRef.current, {
          effectsEnabled: effectsRef.current,
        })

        sceneRef.current = scene
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

  useEffect(() => {
    effectsRef.current = effectsOn

    if (sceneRef.current) {
      sceneRef.current.setEffectsEnabled(effectsOn)
    }
  }, [effectsOn])

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY)

    function handleChange(event) {
      setEffectsOn(!event.matches)
    }

    query.addEventListener('change', handleChange)

    return () => query.removeEventListener('change', handleChange)
  }, [])

  function handleKeyDown(event) {
    const scene = sceneRef.current
    if (!scene) return

    const rotation = KEY_ROTATIONS[event.key]

    if (rotation) {
      event.preventDefault()
      scene.rotateBy(...rotation)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      scene.bloomAtCenter()
    }
  }

  return (
    <div className="hero-cube">
      <div className="cube-stage">
        <div
          ref={stageRef}
          className="hero-cube-canvas"
          tabIndex={0}
          role="group"
          aria-label="Decorative interactive 3D cube. Drag to rotate, click to release colors, arrow keys rotate and Enter releases color. It does not affect your cube."
          onKeyDown={handleKeyDown}
        />

        {status === 'loading' && (
          <p className="hero-cube-message" role="status">
            Loading 3D cube...
          </p>
        )}

        {status === 'unavailable' && (
          <p className="hero-cube-message" role="status">
            The interactive cube is not available on this device or browser.
            Everything else on the page still works.
          </p>
        )}
      </div>

      <p className="hero-cube-hint">
        <span className="hint-desktop">
          Touch to release color · Drag to explore · Scroll to zoom
        </span>

        <span className="hint-touch">
          Touch to release color · Drag sideways to rotate · Pinch to zoom
        </span>
      </p>
    </div>
  )
}

export default HeroCube