// A 3D picture of the cube. No React in this file.
// It only DRAWS a cube state. The state itself lives in React and in the
// cubeMoves.js / cubeValidator.js utilities, and camera movement never
// changes it.
//
// How it works: the 54 stickers never move. Each has a fixed spot, and
// setCubeState() only changes which color material it shows.
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Shape,
  ShapeGeometry,
  Spherical,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { getStickerPlacements } from '../utils/cubeLayout.js'
import { FACE_IDS } from '../utils/cubeValidator.js'

const CUBIE_SIZE = 0.96
const STICKER_SIZE = 0.82
const STICKER_RADIUS = 0.12
const STICKER_LIFT = 0.004
const HOME_POSITION = [5, 4.3, 6]

const COLOR_NAMES = ['white', 'yellow', 'red', 'orange', 'blue', 'green']

// Used only if a CSS variable cannot be read.
const FALLBACK_COLORS = {
  white: '#f5f5f5',
  yellow: '#ffd500',
  red: '#c41e3a',
  orange: '#ff5800',
  green: '#009b48',
  blue: '#0046ad',
  empty: '#1c1f27',
}

// Reads the same CSS variables the rest of the site uses,
// so the 3D colors always match the flat grids.
function readColor(name) {
  const variable = name === 'empty' ? '--surface-2' : `--cube-${name}`
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim()
  return new Color(value || FALLBACK_COLORS[name])
}

// A square with rounded corners, lying flat and facing +z.
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
  return new ShapeGeometry(shape)
}

export class CubeScene {
  constructor(container) {
    this.container = container
    this.disposed = false
    this.frame = 0

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)

    this.scene = new Scene()
    this.camera = new PerspectiveCamera(38, 1, 0.1, 100)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enablePan = false
    this.controls.minDistance = 6
    this.controls.maxDistance = 14
    this.controls.addEventListener('change', this.requestRender)

    this.scene.add(new AmbientLight(0xffffff, 1.4))
    const sun = new DirectionalLight(0xffffff, 1.2)
    sun.position.set(4, 8, 6)
    this.scene.add(sun)

    this.buildCube()

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)

    this.resetView()
    this.resize()
  }

  buildCube() {
    const bodyGeometry = new BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE)
    const stickerGeometry = createStickerGeometry()
    this.geometries = [bodyGeometry, stickerGeometry]

    this.bodyMaterial = new MeshStandardMaterial({
      color: 0x0b0b0e,
      roughness: 0.65,
    })

    // Flat, unlit materials keep the colors exactly as designed.
    this.colorMaterials = {}
    for (const name of [...COLOR_NAMES, 'empty']) {
      this.colorMaterials[name] = new MeshBasicMaterial({
        color: readColor(name),
      })
    }

    // 27 black pieces.
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const body = new Mesh(bodyGeometry, this.bodyMaterial)
          body.position.set(x, y, z)
          this.scene.add(body)
        }
      }
    }

    // 54 stickers, each placed on the surface of its piece.
    const forward = new Vector3(0, 0, 1)
    this.stickers = getStickerPlacements().map((placement) => {
      const normal = new Vector3(...placement.normal)
      const sticker = new Mesh(stickerGeometry, this.colorMaterials.empty)
      sticker.position
        .set(...placement.position)
        .addScaledVector(normal, CUBIE_SIZE / 2 + STICKER_LIFT)
      sticker.quaternion.setFromUnitVectors(forward, normal)
      this.scene.add(sticker)
      return sticker
    })
  }

  // cube: { U: [9], R: [9], ... } with color names, or null for "not entered".
  setCubeState(cube) {
    this.stickers.forEach((sticker, flatIndex) => {
      const faceId = FACE_IDS[Math.floor(flatIndex / 9)]
      const color = cube[faceId]?.[flatIndex % 9]
      sticker.material =
        this.colorMaterials[color] ?? this.colorMaterials.empty
    })
    this.requestRender()
  }

  resetView() {
    this.camera.position.set(...HOME_POSITION)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
    this.requestRender()
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
    this.requestRender()
  }

  resize() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (width === 0 || height === 0) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.requestRender()
  }

  // Draws one frame, at most once per screen refresh, and only when needed.
  requestRender = () => {
    if (this.frame || this.disposed) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.renderer.render(this.scene, this.camera)
    })
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.geometries.forEach((geometry) => geometry.dispose())
    this.bodyMaterial.dispose()
    Object.values(this.colorMaterials).forEach((material) => material.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}