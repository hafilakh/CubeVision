// The decorative homepage cube: a glossy black Rubik's Cube that responds
// to touch with Fluid Bloom.
//
// It is purely visual. It has no colors of its own to save, and it is not
// connected to the cube the user enters. All it shares is the fixed layout
// (where the 54 sticker spots are).
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BackSide,
  Color,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Shape,
  SphereGeometry,
  Spherical,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { getStickerPlacements } from '../utils/cubeLayout.js'
import {
  PALETTE,
  paletteColor,
  pointerToUv,
  shouldLetPageScroll,
  trailSteps,
} from '../utils/heroCubeMath.js'
import { FluidEffect } from './fluidEffect.js'

// ---- Tunables: change these to adjust the look ----------------------------
const CUBIE_SIZE = 0.96
const BODY_RADIUS = 0.07
const BODY_COLOR = 0x0d0f16 // the plastic body between stickers
const STICKER_COLOR = 0x08090d // the glossy black stickers
const STICKER_SIZE = 0.8
const STICKER_RADIUS = 0.12
const STICKER_DEPTH = 0.01
const STICKER_BEVEL = 0.012
const ENV_INTENSITY = 1.4 // strength of the colored reflections
const HOME_POSITION = [4.9, 3.9, 6.5]
const MIN_DISTANCE = 5.5
const MAX_DISTANCE = 10.5
const FLUID_LIFETIME_MS = 12000 // simulation runs this long after a touch
const IDLE_SPIN_DELAY_MS = 2500
// 'pan-y' lets a vertical swipe scroll the page and a sideways drag rotate
// the cube. Use 'none' if you want full two-axis rotation by touch instead.
const TOUCH_ACTION = 'pan-y'

function createStickerGeometry() {
  const half = STICKER_SIZE / 2
  const r = STICKER_RADIUS
  const shape = new Shape()
  shape.moveTo(-half + r, -half)
  shape.lineTo(half - r, -half)
  shape.quadraticCurveTo(half, -half, half, -half + r)
  shape.lineTo(half, half - r)
  shape.quadraticCurveTo(half, half, half - r, half)
  shape.lineTo(-half + r, half)
  shape.quadraticCurveTo(-half, half, -half, half - r)
  shape.lineTo(-half, -half + r)
  shape.quadraticCurveTo(-half, -half, -half + r, -half)
  return new ExtrudeGeometry(shape, {
    depth: STICKER_DEPTH,
    bevelEnabled: true,
    bevelThickness: STICKER_BEVEL,
    bevelSize: STICKER_BEVEL,
    bevelSegments: 2,
    curveSegments: 8,
  })
}

// A dark studio with bright cyan, purple and blue panels. The cube's glossy
// surfaces reflect these, which gives the colored edge highlights.
function createEnvironment(renderer) {
  const envScene = new Scene()
  const geometries = []
  const materials = []

  const dome = new Mesh(
    new SphereGeometry(20, 32, 16),
    new MeshBasicMaterial({ color: 0x06070c, side: BackSide })
  )
  geometries.push(dome.geometry)
  materials.push(dome.material)
  envScene.add(dome)

  const panels = [
    { color: 0x2fd6ff, brightness: 5, position: [-9, 5, 4], size: [7, 4] },
    { color: 0x8f5bff, brightness: 5, position: [9, 3, 3], size: [7, 4] },
    { color: 0x3a6bff, brightness: 4, position: [0, -6, 9], size: [10, 3] },
    { color: 0xffffff, brightness: 2.2, position: [0, 10, 0], size: [8, 5] },
    { color: 0x2fd6ff, brightness: 4, position: [-5, 2, -10], size: [6, 3] },
    { color: 0x8f5bff, brightness: 4, position: [6, 0, -9], size: [6, 3] },
  ]
  for (const panel of panels) {
    const mesh = new Mesh(
      new PlaneGeometry(panel.size[0], panel.size[1]),
      new MeshBasicMaterial({
        color: new Color(panel.color).multiplyScalar(panel.brightness),
        side: DoubleSide,
      })
    )
    mesh.position.set(...panel.position)
    mesh.lookAt(0, 0, 0)
    geometries.push(mesh.geometry)
    materials.push(mesh.material)
    envScene.add(mesh)
  }

  const generator = new PMREMGenerator(renderer)
  const target = generator.fromScene(envScene, 0.03)
  generator.dispose()
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  return target
}

export class HeroCubeScene {
  constructor(container, { effectsEnabled = true } = {}) {
    this.container = container
    this.effectsEnabled = effectsEnabled
    this.autoSpin = effectsEnabled
    this.disposed = false
    this.running = false
    this.visible = true
    this.dirty = true
    this.frame = 0
    this.time = 0
    this.last = 0
    this.lastInteraction = -Infinity
    this.fluidActiveUntil = 0
    this.fluidDirty = false
    this.phase = 0
    this.pointers = new Set()
    this.lastPoint = null
    this.geometries = []
    this.materials = []

    try {
      this.init()
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  init() {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.autoClear = false
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.container.appendChild(this.renderer.domElement)

    this.scene = new Scene()
    this.camera = new PerspectiveCamera(40, 1, 0.1, 100)

    this.envTarget = createEnvironment(this.renderer)
    this.scene.environment = this.envTarget.texture
    this.scene.environmentIntensity = ENV_INTENSITY

    this.addLights()
    this.buildCube()
    this.setupControls()
    this.fluid = new FluidEffect(this.renderer)
    this.setupEvents()
    this.resetView()
    this.resize()
    this.start()
  }

  addLights() {
    this.scene.add(new AmbientLight(0xffffff, 0.12))

    const cyan = new DirectionalLight(0x2fd6ff, 1.1)
    cyan.position.set(-6, 3, -5)
    const purple = new DirectionalLight(0x8f5bff, 1.1)
    purple.position.set(6, -1, -5)
    const key = new DirectionalLight(0xffffff, 0.45)
    key.position.set(3, 7, 6)
    this.scene.add(cyan, purple, key)
  }

  buildCube() {
    const bodyGeometry = new RoundedBoxGeometry(
      CUBIE_SIZE,
      CUBIE_SIZE,
      CUBIE_SIZE,
      3,
      BODY_RADIUS
    )
    const stickerGeometry = createStickerGeometry()
    const bodyMaterial = new MeshPhysicalMaterial({
      color: BODY_COLOR,
      roughness: 0.4,
      metalness: 0.25,
      clearcoat: 0.5,
      clearcoatRoughness: 0.25,
    })
    const stickerMaterial = new MeshPhysicalMaterial({
      color: STICKER_COLOR,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
    })
    this.geometries.push(bodyGeometry, stickerGeometry)
    this.materials.push(bodyMaterial, stickerMaterial)

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const body = new Mesh(bodyGeometry, bodyMaterial)
          body.position.set(x, y, z)
          this.scene.add(body)
        }
      }
    }

    // Stickers use only the fixed layout. No colors are involved.
    const forward = new Vector3(0, 0, 1)
    for (const placement of getStickerPlacements()) {
      const normal = new Vector3(...placement.normal)
      const sticker = new Mesh(stickerGeometry, stickerMaterial)
      sticker.position
        .set(...placement.position)
        .addScaledVector(normal, CUBIE_SIZE / 2 + STICKER_BEVEL)
      sticker.quaternion.setFromUnitVectors(forward, normal)
      this.scene.add(sticker)
    }
  }

  setupControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.8
    controls.minDistance = MIN_DISTANCE
    controls.maxDistance = MAX_DISTANCE
    controls.autoRotateSpeed = 0.8
    controls.addEventListener('change', this.markDirty)
    this.controls = controls
    this.renderer.domElement.style.touchAction = TOUCH_ACTION
  }

  setupEvents() {
    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerEnd)
    canvas.addEventListener('pointercancel', this.onPointerEnd)
    // Capture phase on the parent, so we can step aside before the cube's
    // own controls grab the wheel.
    this.container.addEventListener('wheel', this.onWheel, {
      capture: true,
      passive: true,
    })

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.container)

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting
        this.syncRunning()
      },
      { threshold: 0.01 }
    )
    this.intersectionObserver.observe(this.container)

    document.addEventListener('visibilitychange', this.syncRunning)
  }

  // ---- Event handlers (arrow functions so they keep `this`) ----------------

  markDirty = () => {
    this.dirty = true
  }

  toUv(event) {
    return pointerToUv(
      event.clientX,
      event.clientY,
      this.renderer.domElement.getBoundingClientRect()
    )
  }

  onPointerDown = (event) => {
    this.pointers.add(event.pointerId)
    this.lastInteraction = performance.now()
    // Two fingers means pinch zoom, so no color.
    if (this.pointers.size !== 1 || !this.effectsEnabled) {
      this.lastPoint = null
      return
    }
    const point = this.toUv(event)
    this.lastPoint = point
    this.bloomAt(point.u, point.v)
  }

  onPointerMove = (event) => {
    if (
      !this.pointers.has(event.pointerId) ||
      this.pointers.size !== 1 ||
      !this.effectsEnabled ||
      !this.lastPoint
    ) {
      return
    }
    const point = this.toUv(event)
    for (const step of trailSteps(this.lastPoint, point, 0.02, 8)) {
      this.addTrailSplat(step)
    }
    this.lastPoint = point
    this.lastInteraction = performance.now()
  }

  onPointerEnd = (event) => {
    this.pointers.delete(event.pointerId)
    if (this.pointers.size === 0) this.lastPoint = null
  }

  onWheel = (event) => {
    this.lastInteraction = performance.now()
    const distance = this.camera.position.distanceTo(this.controls.target)
    if (
      shouldLetPageScroll(event.deltaY, distance, MIN_DISTANCE, MAX_DISTANCE)
    ) {
      // Do not let the cube's controls see this wheel event, so the page
      // scrolls normally.
      event.stopPropagation()
    }
  }

  syncRunning = () => {
    if (this.visible && !document.hidden) this.start()
    else this.stop()
  }

  // ---- Fluid Bloom --------------------------------------------------------

  activateFluid() {
    this.fluidActiveUntil = performance.now() + FLUID_LIFETIME_MS
    this.fluidDirty = true
    this.dirty = true
  }

  // A click or touch: several small, jittered, differently colored blobs.
  // The flow then stretches them into irregular clouds.
  bloomAt(u, v) {
    if (!this.effectsEnabled) return
    this.activateFluid()
    const base = Math.random() * PALETTE.length
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2
      const spread = Math.random() * 0.05
      this.fluid.splat(
        u + Math.cos(angle) * spread,
        v + Math.sin(angle) * spread,
        paletteColor(base + (Math.random() - 0.5) * 1.6),
        0.035 + Math.random() * 0.035,
        0.35 + Math.random() * 0.25
      )
    }
  }

  addTrailSplat(point) {
    this.activateFluid()
    this.phase += 0.05
    this.fluid.splat(point.u, point.v, paletteColor(this.phase), 0.03, 0.2)
  }

  bloomAtCenter() {
    this.lastInteraction = performance.now()
    this.bloomAt(0.5, 0.5)
  }

  setEffectsEnabled(enabled) {
    this.effectsEnabled = enabled
    this.autoSpin = enabled
    if (!enabled) this.fluidActiveUntil = 0
    this.fluidDirty = true
    this.dirty = true
  }

  // ---- View ---------------------------------------------------------------

  resetView() {
    this.camera.position.set(...HOME_POSITION)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
    this.lastInteraction = performance.now()
    this.dirty = true
  }

  // Keyboard rotation. Moves the camera around the cube, nothing else.
  rotateBy(deltaAzimuth, deltaPolar) {
    const offset = this.camera.position.clone().sub(this.controls.target)
    const spherical = new Spherical().setFromVector3(offset)
    spherical.theta += deltaAzimuth
    spherical.phi = Math.min(
      Math.max(spherical.phi + deltaPolar, 0.2),
      Math.PI - 0.2
    )
    offset.setFromSpherical(spherical)
    this.camera.position.copy(this.controls.target).add(offset)
    this.camera.lookAt(this.controls.target)
    this.controls.update()
    this.lastInteraction = performance.now()
    this.dirty = true
  }

  resize() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (!width || !height) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.fluid.resize(width, height)
    this.dirty = true
  }

  // ---- Loop ---------------------------------------------------------------

  start() {
    if (this.running || this.disposed) return
    this.running = true
    this.last = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.frame)
  }

  tick = (now) => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.tick)

    const dt = Math.min((now - this.last) / 1000, 0.05)
    this.last = now
    this.time += dt

    this.controls.autoRotate =
      this.autoSpin && now - this.lastInteraction > IDLE_SPIN_DELAY_MS
    this.controls.update(dt)

    const fluidOn = this.effectsEnabled && now < this.fluidActiveUntil
    if (fluidOn) {
      this.fluid.step(dt, this.time)
    } else if (this.fluidDirty) {
      this.fluid.clear()
      this.fluidDirty = false
      this.dirty = true
    }

    // Nothing moved and no fluid is showing: skip drawing this frame.
    if (!fluidOn && !this.dirty) return
    this.dirty = false

    this.renderer.setRenderTarget(null)
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)
    if (fluidOn) this.fluid.display()
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.frame)

    this.resizeObserver?.disconnect()
    this.intersectionObserver?.disconnect()
    document.removeEventListener('visibilitychange', this.syncRunning)
    this.container.removeEventListener('wheel', this.onWheel, { capture: true })

    const canvas = this.renderer?.domElement
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onPointerDown)
      canvas.removeEventListener('pointermove', this.onPointerMove)
      canvas.removeEventListener('pointerup', this.onPointerEnd)
      canvas.removeEventListener('pointercancel', this.onPointerEnd)
    }

    this.controls?.dispose()
    this.fluid?.dispose()
    this.geometries.forEach((geometry) => geometry.dispose())
    this.materials.forEach((material) => material.dispose())
    this.envTarget?.dispose()
    this.renderer?.dispose()
    this.renderer?.forceContextLoss()
    canvas?.remove()
  }
}