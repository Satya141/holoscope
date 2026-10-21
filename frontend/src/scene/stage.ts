import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createShared, holoMaterial, makeCloud, Shared } from './particles';

export interface View { yaw: number; pitch: number; roll?: number }

const CAM_Z = 8, FOV = 40;
const SPARKS = 320;

/** Final pass: mirrored, cover-fitted, dimmed webcam "screen"-blended under the hologram (all on the GPU). */
const CameraComposite = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tVideo: { value: null as THREE.Texture | null },
    uVideoOn: { value: 0 },
    uScale: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tVideo;
    uniform float uVideoOn;
    uniform vec2 uScale;
    varying vec2 vUv;
    void main() {
      vec3 holo = texture2D(tDiffuse, vUv).rgb;
      vec2 uv = (vec2(1.0 - vUv.x, vUv.y) - 0.5) * uScale + 0.5;
      vec3 cam = texture2D(tVideo, uv).rgb;
      cam = mix(vec3(dot(cam, vec3(0.299, 0.587, 0.114))), cam, 0.8) * 0.42 * uVideoOn;
      gl_FragColor = vec4(1.0 - (1.0 - cam) * (1.0 - holo), 1.0);
    }`,
};

/** Renderer, camera, bloom, holographic platform and the user-controlled transform. */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  readonly shared: Shared = createShared();
  /** root (move + zoom) → tilt (pitch + roll) → turn (yaw) → holograms */
  readonly root = new THREE.Group();
  readonly tilt = new THREE.Group();
  readonly turn = new THREE.Group();
  readonly target = { pos: new THREE.Vector3(), yaw: 0, pitch: 0.3, roll: 0, zoom: 1 };
  private readonly cur = { pos: new THREE.Vector3(), yaw: 0, pitch: 0.3, roll: 0, zoom: 1 };
  autoRotate = true;
  pyramid = false;
  videoOn = true;
  /** Render resolution multiplier; lowered automatically on slow machines. */
  quality = Math.min(devicePixelRatio, 1.25);

  private composer: EffectComposer;
  private composite: ShaderPass;
  private video: HTMLVideoElement | null = null;
  private platform = new THREE.Group();
  private sparks!: THREE.Points;
  private sparkSpeed = new Float32Array(SPARKS);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 1);
    this.camera.position.set(0, 0.4, CAM_Z);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.root);
    this.root.add(this.tilt);
    this.tilt.add(this.turn);
    this.buildPlatform();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.5, 0.05));
    this.composer.addPass(new OutputPass());
    this.composite = new ShaderPass(CameraComposite);
    this.composer.addPass(this.composite);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  /** World units per screen pixel at the model's depth. */
  get worldPerPx() { return (2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / innerHeight; }

  setView(v: View) {
    this.target.yaw = v.yaw;
    this.target.pitch = v.pitch;
    this.target.roll = v.roll ?? 0;
  }

  reset(v: View) {
    this.target.pos.set(0, 0, 0);
    this.target.zoom = 1;
    this.setView(v);
  }

  attachVideo(video: HTMLVideoElement) {
    this.video = video;
    this.composite.uniforms.tVideo.value = new THREE.VideoTexture(video);
  }

  resize() {
    const dpr = this.quality;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(innerWidth, innerHeight);
    this.shared.uPixelRatio.value = dpr;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, t: number) {
    const T = this.target, S = this.cur;
    if (this.autoRotate) T.yaw += dt * 0.25;
    T.pitch = THREE.MathUtils.clamp(T.pitch, -1.2, 1.4);
    T.zoom = THREE.MathUtils.clamp(T.zoom, 0.35, 3.5);
    const k = 1 - Math.pow(0.0001, dt);
    S.pos.lerp(T.pos, k);
    S.yaw += (T.yaw - S.yaw) * k;
    S.pitch += (T.pitch - S.pitch) * k;
    S.roll += (T.roll - S.roll) * k;
    S.zoom += (T.zoom - S.zoom) * k;

    this.root.position.copy(S.pos);
    this.root.scale.setScalar(S.zoom);
    this.tilt.rotation.set(S.pitch, 0, S.roll);
    this.turn.rotation.y = S.yaw;

    const v = this.video, A = innerWidth / innerHeight;
    const on = this.videoOn && !!v && v.videoWidth > 0;
    this.composite.uniforms.uVideoOn.value = on ? 1 : 0;
    if (on) {
      const a = v!.videoWidth / v!.videoHeight;
      this.composite.uniforms.uScale.value.set(A > a ? 1 : A / a, A > a ? a / A : 1);
    }

    this.shared.uTime.value = t;
    const cycle = t % 6;
    this.shared.uScanY.value = cycle < 3.5 ? -2.8 + (cycle / 3.5) * 5.6 : -10;   // sweep, then rest
    this.platform.rotation.y += dt * 0.15;

    const pos = this.sparks.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < SPARKS; i++) {
      let y = pos.getY(i) + this.sparkSpeed[i] * dt;
      if (y > 4.2) y = 0;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }

  render() {
    const W = innerWidth, H = innerHeight;
    if (!this.pyramid) {
      this.composer.render();
      return;
    }
    // Pepper's-ghost layout: four views around the centre, each "feet toward the middle".
    const r = this.renderer, s = Math.min(W, H) / 3, cx = W / 2, cy = H / 2;
    r.setScissorTest(true);
    r.setViewport(0, 0, W, H); r.setScissor(0, 0, W, H); r.clear();
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    const cells: [number, number, number][] = [
      [cx - s / 2, cy + s / 2, 0], [cx - s / 2, cy - 1.5 * s, Math.PI],
      [cx - 1.5 * s, cy - s / 2, Math.PI / 2], [cx + s / 2, cy - s / 2, -Math.PI / 2],
    ];
    for (const [x, y, rot] of cells) {
      this.camera.position.set(0, 0.4, CAM_Z);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(0, 0, 0);
      this.camera.rotateZ(-rot);
      r.setViewport(x, y, s, s); r.setScissor(x, y, s, s);
      r.render(this.scene, this.camera);
    }
    r.setScissorTest(false);
    r.setViewport(0, 0, W, H);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
  }

  private buildPlatform() {
    const pts: number[] = [], cols: number[] = [];
    const c = new THREE.Color();
    const push = (x: number, y: number, z: number, hex: string, b: number) => {
      pts.push(x, y, z);
      c.set(hex).multiplyScalar(b);
      cols.push(c.r, c.g, c.b);
    };
    for (const [r, n, hex] of [[1.7, 900, '#38f4ff'], [2.15, 1300, '#2a9bff'], [2.6, 1700, '#38f4ff']] as const) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        push(Math.cos(a) * r, (Math.random() - 0.5) * 0.01, Math.sin(a) * r, hex, 0.7);
      }
    }
    for (let i = 0; i < 1500; i++) {
      const a = Math.random() * Math.PI * 2;
      if (Math.sin(a * 14) > 0.2) push(Math.cos(a) * 2.38, 0, Math.sin(a) * 2.38, '#9ffcff', 1);
    }
    for (let i = 0; i < 1800; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.55;
      push(Math.cos(a) * r, 0, Math.sin(a) * r, '#1f6bff', 0.35);
    }
    const appear = { value: 1 };
    const ring = new THREE.Points(makeCloud(new Float32Array(pts), new Float32Array(cols)), holoMaterial(this.shared, appear));
    this.platform.add(ring);

    const sp = new Float32Array(SPARKS * 3), sc = new Float32Array(SPARKS * 3);
    for (let i = 0; i < SPARKS; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.6;
      sp.set([Math.cos(a) * r, Math.random() * 4.2, Math.sin(a) * r], i * 3);
      c.set('#7ffcff').multiplyScalar(0.5);
      sc.set([c.r, c.g, c.b], i * 3);
      this.sparkSpeed[i] = 0.2 + Math.random() * 0.6;
    }
    this.sparks = new THREE.Points(makeCloud(sp, sc), holoMaterial(this.shared, appear));
    this.sparks.frustumCulled = false;
    ring.frustumCulled = false;
    this.platform.add(this.sparks);
    this.platform.position.y = -2.45;
    this.tilt.add(this.platform);
  }
}
