// Fluid Bloom: colored ink spreading through water, computed on the GPU.
//
// Two small textures hold the "dye". Each frame we (1) add soft blobs of
// color where the user touched, then (2) move the dye along a smooth,
// slowly changing swirl pattern and fade it a little. Moving the dye means
// "for each pixel, look upstream and copy what was there", which is called
// semi-Lagrangian advection. The blur this causes is what gives the
// organic, irregular edges.
import {
  AddEquation,
  ClampToEdgeWrapping,
  CustomBlending,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three'

// ---- Tunables ------------------------------------------------------------
const SIM_SIZE = 224 // simulation resolution of the longest side
const MAX_SPLATS_PER_FRAME = 24
const HALF_LIFE = 1.6 // seconds for the dye to fade to half strength
const FLOW_SPEED = 0.028 // how fast the dye drifts
const DISPLAY_OPACITY = 0.78 // how strongly the dye covers the cube (max)
const SOFTNESS = 1.8 // how gently bright dye saturates

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const SPLAT_FRAGMENT = /* glsl */ `
  uniform sampler2D uDye;
  uniform vec2 uPoint;
  uniform vec3 uColor;
  uniform float uRadius;
  uniform float uAspect;
  varying vec2 vUv;

  void main() {
    vec2 d = (vUv - uPoint) * vec2(uAspect, 1.0);
    float blob = exp(-dot(d, d) / (uRadius * uRadius));
    vec3 dye = texture2D(uDye, vUv).rgb + uColor * blob;
    gl_FragColor = vec4(min(dye, vec3(1.6)), 1.0);
  }
`

const ADVECT_FRAGMENT = /* glsl */ `
  uniform sampler2D uDye;
  uniform float uTime;
  uniform float uDt;
  uniform float uAspect;
  uniform float uDecay;
  uniform float uFade;
  uniform float uSpeed;
  varying vec2 vUv;

  // A smooth, slowly changing wave pattern. Its "curl" below is the flow.
  float psi(vec2 p, float t) {
    float a = sin(p.x * 3.1 + t * 0.35 + sin(p.y * 2.3 - t * 0.27) * 1.2);
    float b = cos(p.y * 2.7 - t * 0.31 + sin(p.x * 1.9 + t * 0.23) * 1.2);
    float c = sin(p.x * 6.3 - p.y * 5.1 + t * 0.50) * cos(p.y * 6.7 + p.x * 4.3 - t * 0.43);
    return a * b + 0.45 * c;
  }

  // The curl of psi swirls without squeezing the dye into points.
  vec2 flow(vec2 p, float t) {
    float e = 0.01;
    float dx = psi(p + vec2(e, 0.0), t) - psi(p - vec2(e, 0.0), t);
    float dy = psi(p + vec2(0.0, e), t) - psi(p - vec2(0.0, e), t);
    return vec2(dy, -dx) / (2.0 * e);
  }

  void main() {
    vec2 p = vUv * vec2(uAspect, 1.0);
    vec2 velocity = flow(p, uTime) * uSpeed;
    vec2 upstream = vUv - velocity * uDt * vec2(1.0 / uAspect, 1.0);

    vec3 dye = texture2D(uDye, upstream).rgb;
    dye = max(dye * uDecay - vec3(uFade), vec3(0.0));

    // Fade softly near the edges so ink does not pile up there.
    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    dye *= smoothstep(0.0, 0.04, edge);

    gl_FragColor = vec4(dye, 1.0);
  }
`

const DISPLAY_FRAGMENT = /* glsl */ `
  uniform sampler2D uDye;
  uniform float uOpacity;
  uniform float uSoftness;
  varying vec2 vUv;

  void main() {
    vec3 dye = texture2D(uDye, vUv).rgb;
    vec3 color = 1.0 - exp(-dye * uSoftness);
    float alpha = max(color.r, max(color.g, color.b)) * uOpacity;
    // Premultiplied output: color is never brighter than alpha.
    gl_FragColor = vec4(color * uOpacity, alpha);
  }
`

function createPassMaterial(fragmentShader, uniforms) {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  })
}

export class FluidEffect {
  constructor(renderer) {
    this.renderer = renderer
    this.queue = []
    this.aspect = 1
    this.simWidth = 0
    this.simHeight = 0
    this.read = null
    this.write = null

    // Half-float textures keep smooth, faint colors. If the device cannot
    // render to them we fall back to 8-bit and fade a bit faster, because
    // 8-bit values stop shrinking when multiplied by a number near 1.
    const extensions = renderer.extensions
    this.useHalfFloat =
      extensions.has('EXT_color_buffer_float') ||
      extensions.has('EXT_color_buffer_half_float')
    this.fade = this.useHalfFloat ? 0.0008 : 0.005

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.scene = new Scene()
    this.geometry = new PlaneGeometry(2, 2)

    this.splatMaterial = createPassMaterial(SPLAT_FRAGMENT, {
      uDye: { value: null },
      uPoint: { value: new Vector2() },
      uColor: { value: new Vector3() },
      uRadius: { value: 0.05 },
      uAspect: { value: 1 },
    })

    this.advectMaterial = createPassMaterial(ADVECT_FRAGMENT, {
      uDye: { value: null },
      uTime: { value: 0 },
      uDt: { value: 0.016 },
      uAspect: { value: 1 },
      uDecay: { value: 1 },
      uFade: { value: 0 },
      uSpeed: { value: FLOW_SPEED },
    })

    this.displayMaterial = createPassMaterial(DISPLAY_FRAGMENT, {
      uDye: { value: null },
      uOpacity: { value: DISPLAY_OPACITY },
      uSoftness: { value: SOFTNESS },
    })
    // Draw over what is already on screen, keeping the cube visible beneath.
    this.displayMaterial.transparent = true
    this.displayMaterial.blending = CustomBlending
    this.displayMaterial.blendEquation = AddEquation
    this.displayMaterial.blendSrc = OneFactor
    this.displayMaterial.blendDst = OneMinusSrcAlphaFactor
    this.displayMaterial.blendEquationAlpha = AddEquation
    this.displayMaterial.blendSrcAlpha = OneFactor
    this.displayMaterial.blendDstAlpha = OneMinusSrcAlphaFactor

    this.quad = new Mesh(this.geometry, this.splatMaterial)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
  }

  createTarget(width, height) {
    return new WebGLRenderTarget(width, height, {
      type: this.useHalfFloat ? HalfFloatType : UnsignedByteType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    })
  }

  // Call whenever the canvas size changes.
  resize(width, height) {
    this.aspect = width / height
    const longSide = SIM_SIZE
    const shortSide = (ratio) => Math.max(16, Math.round(longSide * ratio))
    const simWidth = this.aspect >= 1 ? longSide : shortSide(this.aspect)
    const simHeight = this.aspect >= 1 ? shortSide(1 / this.aspect) : longSide

    this.splatMaterial.uniforms.uAspect.value = this.aspect
    this.advectMaterial.uniforms.uAspect.value = this.aspect

    if (simWidth === this.simWidth && simHeight === this.simHeight) return
    this.simWidth = simWidth
    this.simHeight = simHeight

    this.read?.dispose()
    this.write?.dispose()
    this.read = this.createTarget(simWidth, simHeight)
    this.write = this.createTarget(simWidth, simHeight)
    this.clear()
  }

  // Queue a soft blob of color. x and y run from 0 to 1.
  splat(x, y, color, radius, strength) {
    this.queue.push({ x, y, color, radius, strength })
  }

  step(dt, time) {
    if (!this.read) return
    const renderer = this.renderer
    const previousTarget = renderer.getRenderTarget()

    const splats = this.splatMaterial.uniforms
    const limit = Math.min(this.queue.length, MAX_SPLATS_PER_FRAME)
    for (let i = 0; i < limit; i++) {
      const s = this.queue[i]
      splats.uPoint.value.set(s.x, s.y)
      splats.uColor.value.set(
        s.color[0] * s.strength,
        s.color[1] * s.strength,
        s.color[2] * s.strength
      )
      splats.uRadius.value = s.radius
      this.pass(this.splatMaterial)
    }
    this.queue.length = 0

    const advect = this.advectMaterial.uniforms
    advect.uTime.value = time
    advect.uDt.value = dt
    advect.uDecay.value = Math.pow(0.5, dt / HALF_LIFE)
    advect.uFade.value = this.fade * dt * 60
    this.pass(this.advectMaterial)

    renderer.setRenderTarget(previousTarget)
  }

  // Draws the dye over whatever is already on screen.
  display() {
    if (!this.read) return
    this.displayMaterial.uniforms.uDye.value = this.read.texture
    this.quad.material = this.displayMaterial
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.scene, this.camera)
  }

  clear() {
    this.queue.length = 0
    if (!this.read) return
    const renderer = this.renderer
    const previousTarget = renderer.getRenderTarget()
    for (const target of [this.read, this.write]) {
      renderer.setRenderTarget(target)
      renderer.clear()
    }
    renderer.setRenderTarget(previousTarget)
  }

  // Runs one shader over the whole texture, then swaps read and write.
  pass(material) {
    material.uniforms.uDye.value = this.read.texture
    this.quad.material = material
    this.renderer.setRenderTarget(this.write)
    this.renderer.render(this.scene, this.camera)
    const finished = this.write
    this.write = this.read
    this.read = finished
  }

  dispose() {
    this.read?.dispose()
    this.write?.dispose()
    this.read = null
    this.write = null
    this.geometry.dispose()
    this.splatMaterial.dispose()
    this.advectMaterial.dispose()
    this.displayMaterial.dispose()
  }
}