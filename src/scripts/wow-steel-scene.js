// WOW C "Steel Mark" scene. Lazily imported by wow-steel.js after the section approaches.
// Nine I-beams (one per trade) swing in on crane cables, bolt together, get a mint paint
// sweep, then a dolly-zoom flattens the frame into the exact ANP mark.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const NAVY = 0x0e1630;
const MINT = 0x8dd1ba;
const FIN = 0.74; // finale start (last bolt-up)
const PRE = 0.42; // beam 1 is already hanging in its sling at p = 0
const SLOT = FIN / (9 - PRE); // one landing slot
const T0 = -PRE * SLOT; // slot 0 start (before the section pins)
const D = 0.38; // web depth (in mark plane) = logo stroke width
const B = 0.22; // flange width (into Z)
const TF = 0.035;
const TW = 0.022;
const OV = 0.12; // overlap at nodes
const FLOOR_Y = -D / 2 - 0.005;
const CABLE_TOP = 24;
const DEG = Math.PI / 180;
const MARK_W = (1065 - 562 + 19) / 50; // world width incl. stroke
const MARK_C = new THREE.Vector3(0, (893 - 726.5) / 50, 0);

// Landing order. a/b in 1600 mark space. t = label anchor along member, out = label side (mark space, y down).
// hv = hover offset [x, y, z] relative to the final position, yaw = initial yaw (deg).
const MEMBERS = [
  { a: [562, 893], b: [897, 893], t: 0.3, ld: [0, 1], L: 26, hv: [2.6, 6, 1.4], yaw: 24 },
  { a: [897, 893], b: [897, 560], t: 0.3, ld: [1, 0], L: 34, hv: [-3.4, 3.4, -0.8], yaw: -20 },
  { a: [731, 893], b: [731, 560], t: 0, ld: [0, 1], L: 58, hv: [2.2, 3.4, 3.2], yaw: 22 },
  { a: [562, 893], b: [731, 560], t: 0.6, ld: [-1, -0.35], L: 36, hv: [-3.6, 3.8, 1.4], yaw: -25 },
  { a: [731, 560], b: [897, 560], t: 0.5, ld: [0, -1], L: 28, hv: [3, 7.6, -0.8], yaw: 18 },
  { a: [731, 560], b: [897, 893], t: 0.85, ld: [1, 0.55], L: 58, hv: [-2.4, 3.8, 3.4], yaw: -22 },
  { a: [647, 727], b: [732, 727], t: 0, ld: [-1, 0], L: 40, hv: [2.4, 6, 3.4], yaw: 25 },
  { a: [897, 560], b: [1065, 727], t: 0.5, ld: [1, -0.6], L: 34, hv: [-3, 7.6, -1], yaw: -20 },
  { a: [1065, 727], b: [897, 727], t: 0.5, ld: [0, 1], L: 34, hv: [3, 7, 2.4], yaw: 24 },
];
const SH_EL = [12, 14, 9, 16, 12, 18, 10, 15, 11];

const W = (X, Y) => new THREE.Vector3((X - 813.5) / 50, (893 - Y) / 50, 0);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const expoOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const backOut = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const landE = (u) => (u < 0.85 ? 0 : expoOut((u - 0.85) / 0.15));

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function iShape() {
  const s = new THREE.Shape();
  const hd = D / 2 - 0.004, hb = B / 2 - 0.004, ht = TW / 2;
  s.moveTo(-hb, -hd);
  s.lineTo(hb, -hd);
  s.lineTo(hb, -hd + TF);
  s.lineTo(ht, -hd + TF);
  s.lineTo(ht, hd - TF);
  s.lineTo(hb, hd - TF);
  s.lineTo(hb, hd);
  s.lineTo(-hb, hd);
  s.lineTo(-hb, hd - TF);
  s.lineTo(-ht, hd - TF);
  s.lineTo(-ht, -hd + TF);
  s.lineTo(-hb, -hd + TF);
  s.closePath();
  return s;
}

// Brushed steel. Mint is an accent only: a travelling sweep band on landing that leaves the
// flange tips (the stroke edges seen from the front) lit mint, plus the finale rim sweep.
const GLOBAL_U = { uSweepX: { value: -99 }, uSweepA: { value: 0 }, uEdge: { value: 0.55 } };
function steelMaterial(len) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xa3adbd, metalness: 0.9, roughness: 0.35, envMapIntensity: 1.25, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const u = {
    uPaint: { value: -0.2 },
    uBand: { value: 0 },
    uMint: { value: new THREE.Color(MINT) },
    uLen: { value: len },
    uHB: { value: B / 2 - 0.004 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, GLOBAL_U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uLen;\nvarying float vAxis;\nvarying vec2 vXY;\nvarying float vWX;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAxis = position.z / uLen + 0.5;\nvXY = position.xy;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWX = (modelMatrix * vec4(transformed, 1.0)).x;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uPaint;\nuniform float uBand;\nuniform vec3 uMint;\nuniform float uHB;\nuniform float uSweepX;\nuniform float uSweepA;\nuniform float uEdge;\nvarying float vAxis;\nvarying vec2 vXY;\nvarying float vWX;\nfloat wsM;\nfloat wsE;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nwsM = 1.0 - smoothstep(uPaint - 0.012, uPaint + 0.012, vAxis);\nwsE = smoothstep(uHB - 0.007, uHB - 0.0015, abs(vXY.x)) * wsM;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uMint, wsE * 0.85);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nfloat wsBr = fract(sin(floor(vXY.y * 520.0 + floor(vAxis * 3.0) * 17.0) * 12.9898) * 43758.5453);\nroughnessFactor = clamp(roughnessFactor + (wsBr - 0.5) * 0.16, 0.12, 1.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat wsB = exp(-pow((vAxis - uPaint) / 0.035, 2.0)) * uBand;\nfloat wsS = exp(-pow((vWX - uSweepX) / 0.75, 2.0)) * uSweepA;\ntotalEmissiveRadiance += uMint * (wsB * 1.6 + wsE * uEdge + wsS * (0.22 + wsE * 2.2));');
  };
  m.userData.u = u;
  return m;
}

export function init(root, { gsap, ScrollTrigger }) {
  if (root.__wowSteel) return root.__wowSteel;
  const stage = root.querySelector('.wow-steel__stage');
  const host = root.querySelector('.wow-steel__canvas');
  const svg = root.querySelector('.wow-steel__mark');
  const glow = root.querySelector('.wow-steel__glow');
  const shade = root.querySelector('.wow-steel__shade');
  const title = root.querySelector('.wow-steel__title');
  const panel = root.querySelector('.wow-steel__panel');
  const scrim = root.querySelector('.wow-steel__scrim');
  const names = [...root.querySelectorAll('.wow-steel__item')];
  const ticks = [...root.querySelectorAll('.wow-steel__tick')];
  const labels = [];
  root.querySelectorAll('.wow-steel__lbl').forEach((li) => (labels[+li.dataset.m] = li));

  const params = new URLSearchParams(location.search);
  const POSTER = params.has('poster');
  if (POSTER) root.classList.add('is-poster');

  const isMobile = () => matchMedia('(max-width: 899px), (pointer: coarse)').matches;
  let mobile = isMobile();
  const desk = !mobile;

  // ---------------------------------------------------------------- renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: POSTER });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, POSTER ? 2 : mobile ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(NAVY, 1);
  if (desk) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  scene.fog = new THREE.FogExp2(NAVY, mobile ? 0.03 : 0.035);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTex = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.95;
  room.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

  // ---------------------------------------------------------------- lights
  const key = new THREE.SpotLight(0xfff1dc, 1100, 0, 0.5, 0.6, 2);
  key.position.set(-9, 15, 11);
  key.target.position.set(0.2, 2.6, 0);
  scene.add(key, key.target);
  if (desk) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 6;
    key.shadow.camera.far = 40;
  }
  const rim = new THREE.DirectionalLight(MINT, 1.4);
  rim.position.set(8, 6, -10);
  scene.add(rim);
  const hemi = new THREE.HemisphereLight(0x3a4c80, 0x0e1630, 0.45);
  scene.add(hemi);
  const flash = new THREE.PointLight(0xd8fff0, 0, 7, 2);
  scene.add(flash);
  // cool front fill so beams read as lit steel from the moment they appear
  const fill = new THREE.DirectionalLight(0xc8d6f0, 0.9);
  fill.position.set(4, 5, 14);
  scene.add(fill);
  // finale rim-light sweep (travels left -> right across the mark at the last bolt-up)
  const sweepL = new THREE.SpotLight(0xe6fff5, 0, 0, 0.45, 0.7, 1.6);
  sweepL.position.set(-10, 5, 7);
  sweepL.target.position.set(0, MARK_C.y, 0);
  scene.add(sweepL, sweepL.target);

  // ---------------------------------------------------------------- floor
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x141f42, roughness: 0.6, metalness: 0, transparent: desk, opacity: desk ? 0.86 : 1, envMapIntensity: 0.35 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = desk;
  scene.add(floor);

  const shadowTex = canvasTex(256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(0,0,0,0.75)');
    grd.addColorStop(0.45, 'rgba(0,0,0,0.35)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, depthWrite: false, opacity: 0 })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(-1.5, FLOOR_Y + 0.004, 0);
  contact.scale.set(10.5, 3.2, 1);
  contact.renderOrder = 1;
  scene.add(contact);

  // ---------------------------------------------------------------- atmosphere
  const haloTex = canvasTex(256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(141,209,186,1)');
    grd.addColorStop(0.25, 'rgba(141,209,186,0.45)');
    grd.addColorStop(0.6, 'rgba(141,209,186,0.1)');
    grd.addColorStop(1, 'rgba(141,209,186,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
  halo.position.set(0, MARK_C.y, -3);
  halo.scale.set(22, 15, 1);
  scene.add(halo);

  const shaftTex = canvasTex(64, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const fy = Math.pow(1 - y / h, 1.6) * Math.min(1, y / 18);
      for (let x = 0; x < w; x++) {
        const dx = (x / (w - 1)) * 2 - 1;
        const a = Math.exp(-dx * dx * 5) * fy;
        const i = (y * w + x) * 4;
        img.data[i] = 255;
        img.data[i + 1] = 244;
        img.data[i + 2] = 226;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
  });
  const shaftDir = key.target.position.clone().sub(key.position).normalize();
  const shafts = [
    { w: 1.6, off: 0, o: 0.07 },
    { w: 3.2, off: 1.4, o: 0.04 },
    { w: 0.9, off: -1.1, o: 0.06 },
  ].map((s) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0),
      new THREE.MeshBasicMaterial({ map: shaftTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0, side: THREE.DoubleSide })
    );
    m.userData = s;
    m.scale.set(s.w, 24, 1);
    scene.add(m);
    return m;
  });

  const dotTex = canvasTex(64, 64, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  const DUST_N = mobile ? 120 : 400;
  const dustPos = new Float32Array(DUST_N * 3);
  const dustSeed = new Float32Array(DUST_N);
  for (let i = 0; i < DUST_N; i++) {
    dustPos[i * 3] = (Math.random() * 2 - 1) * 9;
    dustPos[i * 3 + 1] = Math.random() * 11;
    dustPos[i * 3 + 2] = (Math.random() * 2 - 1) * 5;
    dustSeed[i] = Math.random() * 100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ size: mobile ? 0.06 : 0.045, map: dotTex, color: 0xc9d6ec, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  scene.add(dust);

  // sparks
  const SP_N = 120;
  const spPos = new Float32Array(SP_N * 3);
  const spVel = new Float32Array(SP_N * 3);
  const spLife = new Float32Array(SP_N);
  const spCol = new Float32Array(SP_N * 3);
  let spHead = 0;
  let spAlive = 0;
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  spGeo.setAttribute('aLife', new THREE.BufferAttribute(spLife, 1));
  spGeo.setAttribute('aCol', new THREE.BufferAttribute(spCol, 3));
  const sparks = new THREE.Points(
    spGeo,
    new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 } },
      vertexShader:
        'attribute float aLife; attribute vec3 aCol; varying float vL; varying vec3 vC; uniform float uScale;\n' +
        'void main(){ vL=aLife; vC=aCol; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aLife > 0.0 ? uScale * (0.35 + aLife) / -mv.z : 0.0; }',
      fragmentShader:
        'varying float vL; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vL; if (a < 0.01) discard; gl_FragColor = vec4(vC * a * 1.6, a); }',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  sparks.frustumCulled = false;
  sparks.visible = false;
  scene.add(sparks);
  const mintRGB = new THREE.Color(MINT);

  function spawnSparks(pt, n) {
    for (let k = 0; k < n; k++) {
      const i = spHead++ % SP_N;
      spPos[i * 3] = pt.x;
      spPos[i * 3 + 1] = pt.y;
      spPos[i * 3 + 2] = pt.z;
      const a = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 2.4;
      spVel[i * 3] = Math.cos(a) * r;
      spVel[i * 3 + 1] = 0.8 + Math.random() * 2.6;
      spVel[i * 3 + 2] = Math.sin(a) * r;
      spLife[i] = 0.75 + Math.random() * 0.25;
      const c = k % 3 === 0 ? [1, 1, 1] : [mintRGB.r * 1.2, mintRGB.g * 1.2, mintRGB.b * 1.2];
      spCol.set(c, i * 3);
    }
    spGeo.attributes.aCol.needsUpdate = true;
  }

  // ---------------------------------------------------------------- frame
  const disposables = new Set();
  const track = (o) => (disposables.add(o), o);
  const ishape = iShape();
  const boltGeo = track(new THREE.CylinderGeometry(0.017, 0.017, 0.05, 6).rotateX(Math.PI / 2));
  const plateMat = track(new THREE.MeshPhysicalMaterial({ color: 0x5b6474, metalness: 0.85, roughness: 0.34 }));
  const boltMat = track(new THREE.MeshPhysicalMaterial({ color: 0x8a93a3, metalness: 0.95, roughness: 0.28 }));
  const rigMat = track(new THREE.MeshStandardMaterial({ color: 0x1d2433, metalness: 0.7, roughness: 0.45 }));
  const hookMat = track(new THREE.MeshStandardMaterial({ color: 0xb9c0cb, metalness: 0.9, roughness: 0.3 }));
  const cableGeo = track(new THREE.CylinderGeometry(0.012, 0.012, 1, 6).translate(0, -0.5, 0));
  const slingGeo = track(new THREE.CylinderGeometry(0.008, 0.008, 1, 5).translate(0, 0.5, 0));
  const hookBlockGeo = track(new THREE.BoxGeometry(0.18, 0.26, 0.12).translate(0, -0.13, 0));
  const hookGeo = track(new THREE.TorusGeometry(0.075, 0.022, 6, 14, Math.PI * 1.5).rotateZ(Math.PI * 0.75).translate(0, -0.34, 0));

  const mem = MEMBERS.map((d, i) => {
    const A = W(...d.a), Bp = W(...d.b);
    const dir = Bp.clone().sub(A);
    const len = dir.length();
    dir.normalize();
    const n = new THREE.Vector3(dir.y, -dir.x, 0);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), n, dir));
    const mid = A.clone().add(Bp).multiplyScalar(0.5);
    const ext = len + OV;
    const geo = track(new THREE.ExtrudeGeometry(ishape, { depth: ext, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, steps: 1 }));
    geo.translate(0, 0, -ext / 2);
    const mat = track(steelMaterial(ext));
    // sling attach points (relative to mid, world-aligned frame)
    const vertical = Math.abs(dir.y) > 0.85;
    let att;
    if (vertical) {
      const top = (dir.y > 0 ? Bp : A).clone().sub(mid);
      att = [top.clone().add(new THREE.Vector3(0, 0.02, 0.1)), top.clone().add(new THREE.Vector3(0, 0.02, -0.1))];
    } else {
      const up = n.y >= 0 ? n.clone() : n.clone().negate();
      att = [0.2, 0.8].map((f) => A.clone().lerp(Bp, f).sub(mid).addScaledVector(up, D / 2));
    }
    const maxY = Math.max(att[0].y, att[1].y);
    const hookRel = new THREE.Vector3(0, maxY + (vertical ? 0.9 : 1.2 + len * 0.08), 0);
    // label geometry
    const anchor = A.clone().lerp(Bp, d.t);
    return { d, i, A, B: Bp, dir, n, q, len, ext, mid, geo, mat, att, hookRel, anchor, vertical };
  });

  function buildRig(m, shadow) {
    const pivot = new THREE.Group();
    const cable = new THREE.Mesh(cableGeo, rigMat);
    const hookG = new THREE.Group();
    const parts = new THREE.Group();
    const block = new THREE.Mesh(hookBlockGeo, rigMat);
    const hook = new THREE.Mesh(hookGeo, hookMat);
    parts.add(block, hook);
    const slings = m.att.map((a) => {
      const s = new THREE.Mesh(slingGeo, rigMat);
      const from = new THREE.Vector3(0, -0.36, 0);
      const to = a.clone().sub(m.hookRel);
      const v = to.clone().sub(from);
      s.position.copy(from);
      s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
      s.scale.set(1, v.length(), 1);
      parts.add(s);
      return s;
    });
    const load = new THREE.Group();
    load.position.copy(m.hookRel).negate();
    const beam = new THREE.Mesh(m.geo, m.mat);
    beam.quaternion.copy(m.q);
    load.add(beam);
    const plateGeo = new THREE.BoxGeometry(B + 0.02, D - 0.01, 0.02);
    track(plateGeo);
    const plates = [-1, 1].map((s) => {
      const p = new THREE.Mesh(plateGeo, plateMat);
      p.position.set(0, 0, s * (m.ext / 2 - 0.012));
      beam.add(p);
      return p;
    });
    const bolts = new THREE.InstancedMesh(boltGeo, boltMat, 8);
    bolts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bolts.frustumCulled = false;
    beam.add(bolts);
    hookG.add(parts, load);
    pivot.add(cable, hookG);
    if (shadow) [cable, block, hook, beam, ...plates, ...slings].forEach((o) => (o.castShadow = true));
    if (shadow) bolts.castShadow = true;
    return { pivot, cable, hookG, parts, load, beam, bolts };
  }

  const frameRoot = new THREE.Group();
  scene.add(frameRoot);
  const rigs = mem.map((m) => buildRig(m, desk));
  rigs.forEach((r) => frameRoot.add(r.pivot));
  let mirrorRigs = [];
  if (desk) {
    const mirror = new THREE.Group();
    mirror.scale.set(1, -1, 1);
    mirror.position.y = 2 * FLOOR_Y;
    mirrorRigs = mem.map((m) => buildRig(m, false));
    mirrorRigs.forEach((r) => mirror.add(r.pivot));
    scene.add(mirror);
  }

  // gusset plates at the (731,560) node, front and back
  const gNode = W(731, 560);
  const gussetGeo = track(new THREE.CylinderGeometry(0.21, 0.21, 0.014, 6).rotateX(Math.PI / 2));
  const gussets = [1, -1].map((s) => {
    const g = new THREE.Mesh(gussetGeo, plateMat);
    g.position.set(gNode.x, gNode.y, s * (B / 2 + 0.01));
    g.rotation.z = Math.PI / 6;
    g.castShadow = desk;
    g.scale.setScalar(0.0001);
    frameRoot.add(g);
    return g;
  });

  // ---------------------------------------------------------------- state
  const bolt = mem.map(() => ({ shown: false, t0: -1e9 }));
  const BOLT_LOCAL = [];
  for (const s of [-1, 1]) for (const x of [-0.06, 0.06]) for (const y of [-0.11, 0.11]) BOLT_LOCAL.push([x, y, s]);
  const _m4 = new THREE.Matrix4();
  const _q0 = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _p = new THREE.Vector3();

  function setBolts(i, now) {
    const st = bolt[i];
    const m = mem[i];
    let anim = false;
    for (let k = 0; k < 8; k++) {
      let sc = 0;
      if (st.shown) {
        const t = (now - st.t0 - k * 25) / 380;
        sc = t >= 1 ? 1 : t <= 0 ? 0 : Math.max(0, backOut(t));
        if (t < 1) anim = true;
      }
      const [x, y, s] = BOLT_LOCAL[k];
      _p.set(x, y, s * (m.ext / 2 - 0.05));
      _s.setScalar(Math.max(sc, 0.0001));
      _m4.compose(_p, _q0, _s);
      rigs[i].bolts.setMatrixAt(k, _m4);
      if (mirrorRigs[i]) mirrorRigs[i].bolts.setMatrixAt(k, _m4);
    }
    rigs[i].bolts.instanceMatrix.needsUpdate = true;
    if (mirrorRigs[i]) mirrorRigs[i].bolts.instanceMatrix.needsUpdate = true;
    return anim;
  }

  let pT = 0;
  let p = 0;
  let pPrev = 0;
  let W_ = 1, H_ = 1;
  let d45 = 20;
  let gussetT0 = -1e9;
  let gussetShown = false;
  let shakeT0 = -1e9;
  let flashT0 = -1e9;
  const flashPos = new THREE.Vector3();
  const cam = { tx: 0, ty: 6, tz: 0, az: -8, el: 2, dist: 12, fov: 45, ox: 0, oy: 0 };
  const goal = { ...cam };
  const KEYS = Object.keys(cam);
  let first = true;

  function setGoalLerp(a, b, k, o) {
    for (const key of KEYS) o[key] = a[key] + (b[key] - a[key]) * k;
    return o;
  }

  const sA = { ...cam }, sB = { ...cam }, sC = { ...cam };
  function shot(i, u, o) {
    const m = mem[i];
    const desk_ = !mobile;
    o.fov = 45;
    o.ox = desk_ ? 0.13 : 0;
    o.oy = desk_ ? 0 : 0.13;
    if (i === 0) {
      const uu = Math.min(u, 1);
      hoverOff(0, uu, _ho);
      // camera rides with the beam (same offset), easing from sling-and-hook framing to the macro
      const k = smooth(0.55, 0.97, uu);
      const near = { tx: m.mid.x + _ho.x + 0.4, ty: _ho.y + 1.05, tz: _ho.z * 0.7, az: -26, el: 5, dist: mobile ? 10.5 : 6.4 };
      const macro = { tx: m.mid.x + _ho.x + 0.5, ty: _ho.y + 0.3, tz: _ho.z * 0.7, az: -30, el: 4.5, dist: mobile ? 7.2 : 4.2 };
      for (const key of ['tx', 'ty', 'tz', 'az', 'el', 'dist']) o[key] = near[key] + (macro[key] - near[key]) * k;
      return o;
    }
    const le = u >= 1 ? 1 : landE(u);
    const hov = u >= 1 ? 0 : 1 - le;
    const tall = Math.abs(m.dir.y) > 0.8;
    o.tx = m.mid.x * 0.7 + m.d.hv[0] * 0.3 * hov;
    o.ty = m.mid.y * 0.7 + MARK_C.y * 0.3 + (m.d.hv[1] * 0.45 + (tall ? 1.2 : 0)) * hov;
    o.tz = m.d.hv[2] * 0.25 * hov;
    o.az = i % 2 ? 30 : -35;
    o.el = SH_EL[i];
    o.dist = (clamp(9 + m.len * 0.55 + i * 0.35, 9, 15) + (tall ? 3 : 1.5) * hov) * (mobile ? 1.55 : 1);
    return o;
  }

  function frontShot(o) {
    const push = smooth(0.86, 1, p);
    o.tx = MARK_C.x + 0.15;
    o.ty = MARK_C.y - 0.35;
    o.tz = 0;
    o.az = -24 + 6 * push;
    o.el = 5.5 - 1.5 * push;
    o.dist = d45 * (1.02 - 0.05 * push);
    o.fov = 32;
    o.ox = 0;
    o.oy = mobile ? -0.16 : 0.03;
    return o;
  }

  function computeGoal() {
    if (POSTER) {
      Object.assign(goal, { tx: 0.5, ty: 3.0, tz: 0, az: -24, el: 7, dist: mobile ? 34 : 22, fov: mobile ? 34 : 34, ox: 0, oy: mobile ? -0.04 : 0.02 });
      return;
    }
    if (p < FIN) {
      const i = clamp(Math.floor((p - T0) / SLOT), 0, 8);
      const u = (p - (T0 + i * SLOT)) / SLOT;
      shot(i, u, sB);
      if (i > 0 && u < 0.3) {
        shot(i - 1, 1, sA);
        setGoalLerp(sA, sB, inOut(smooth(0, 0.3, u)), goal);
      } else Object.assign(goal, sB);
      return;
    }
    shot(8, 1, sA);
    frontShot(sC);
    setGoalLerp(sA, sC, inOut(smooth(FIN, 0.88, p)), goal);
  }

  function applyCamera(now) {
    const fovFac = Math.tan(22.5 * DEG) / Math.tan((cam.fov * DEG) / 2);
    const dist = cam.dist * fovFac;
    const az = cam.az * DEG, el = cam.el * DEG;
    camera.fov = cam.fov;
    scene.fog.density = Math.min(mobile ? 0.03 : 0.035, 0.42 / dist);
    camera.position.set(cam.tx + dist * Math.cos(el) * Math.sin(az), cam.ty + dist * Math.sin(el), cam.tz + dist * Math.cos(el) * Math.cos(az));
    camera.position.y = Math.max(camera.position.y, FLOOR_Y + 0.25);
    camera.near = Math.max(0.1, dist * 0.05);
    camera.far = dist + 300;
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    camera.setViewOffset(W_, H_, -cam.ox * W_, -cam.oy * H_, W_, H_);
    const sk = (now - shakeT0) / 140;
    if (sk >= 0 && sk < 1) {
      const a = 0.12 * DEG * (1 - sk);
      camera.rotateZ((Math.random() * 2 - 1) * a);
      camera.rotateX((Math.random() * 2 - 1) * a);
      camera.position.y -= 0.02 * (1 - sk);
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  // ---------------------------------------------------------------- per-member pose
  const O = new THREE.Vector3();
  function poseRig(r, m, i, u, retract, sw) {
    r.pivot.visible = u > 0;
    if (u <= 0) return;
    const hk = m.hookRel;
    const top = CABLE_TOP;
    const cableLen = top - (m.mid.y + O.y + hk.y);
    r.pivot.position.set(m.mid.x + O.x + hk.x, top, m.mid.z + O.z + hk.z);
    r.pivot.rotation.set(sw.phi, 0, sw.theta);
    r.hookG.position.set(0, -cableLen, 0);
    r.hookG.rotation.set(0, sw.yaw, 0);
    r.parts.position.y = retract;
    r.parts.visible = retract < 14;
    r.cable.visible = retract < cableLen - 0.05;
    r.cable.scale.y = Math.max(0.01, cableLen - retract);
  }

  function hoverOff(i, u, o) {
    const hv = mem[i].d.hv;
    const sx = mobile ? 0.55 : 1;
    if (u <= 0 || u >= 1) return o.set(0, 0, 0);
    if (u < 0.35) {
      const e1 = 1 - Math.pow(1 - u / 0.35, 3);
      return o.set(hv[0] * sx, hv[1] + 13 * (1 - e1), hv[2]);
    }
    if (u < 0.85) return o.set(hv[0] * sx, hv[1], hv[2]).multiplyScalar(1 - 0.15 * smooth(0.35, 0.85, u));
    return o.set(hv[0] * sx, hv[1], hv[2]).multiplyScalar(0.85 * (1 - landE(u)));
  }
  const _ho = new THREE.Vector3();
  const sw = { theta: 0, phi: 0, yaw: 0 };
  let swinging = false;

  function updateFrame(now, crossed) {
    const tau = now / 1000;
    swinging = false;
    let landed = 0;
    for (let i = 0; i < 9; i++) {
      const m = mem[i];
      const s0 = T0 + i * SLOT;
      const e = s0 + SLOT;
      const u = POSTER ? 2 : (p - s0) / SLOT;
      let retract = 0;
      if (u <= 0) {
        O.set(0, 0, 0);
        sw.theta = sw.phi = sw.yaw = 0;
      } else if (u < 1) {
        hoverOff(i, u, O);
        const env = Math.exp(-2.4 * u) * (1 - smooth(0.6, 0.86, u));
        sw.theta = 0.085 * env * Math.cos(1.9 * tau + i * 1.7);
        sw.phi = 0.04 * env * Math.sin(1.5 * tau + i * 2.3);
        sw.yaw = m.d.yaw * DEG * (1 - 0.35 * smooth(0.35, 0.85, u)) * (1 - landE(u)) + 0.06 * env * Math.sin(1.2 * tau + i);
        if (env > 0.002) swinging = true;
      } else {
        O.set(0, 0, 0);
        sw.theta = sw.phi = sw.yaw = 0;
        const r = POSTER ? 1 : clamp((p - e) / 0.04);
        retract = r >= 1 ? 1e3 : 16 * r * r;
        landed++;
      }
      poseRig(rigs[i], m, i, u, retract, sw);
      if (mirrorRigs[i]) poseRig(mirrorRigs[i], m, i, u, retract, sw);

      // paint
      const pr = POSTER ? 1 : clamp((p - e) / 0.03);
      const uu = m.mat.userData.u;
      uu.uPaint.value = pr <= 0 ? -0.2 : pr >= 1 ? 1.2 : pr * 1.1 - 0.05;
      uu.uBand.value = pr > 0 && pr < 1 ? Math.sqrt(Math.sin(Math.PI * pr)) : 0;

      // contact
      const nowShown = u >= 1;
      if (nowShown && !bolt[i].shown) {
        bolt[i].shown = true;
        const fwd = crossed && pPrev < e && p >= e;
        bolt[i].t0 = fwd ? now : -1e9;
        if (fwd) {
          spawnSparks(m.A, 12);
          spawnSparks(m.B, 12);
          sparks.visible = true;
          shakeT0 = now;
          flashT0 = now;
          flashPos.copy(m.A).lerp(m.B, 0.5).setZ(0.8);
        }
      } else if (!nowShown && bolt[i].shown) {
        bolt[i].shown = false;
      }
      if (setBolts(i, now)) swinging = true;
    }

    // gusset at the four-member node (pops with member 4, the raker)
    const gs = landed >= 4;
    if (gs && !gussetShown) gussetT0 = crossed && pPrev < T0 + 4 * SLOT ? now : -1e9;
    gussetShown = gs;
    const gt = gs ? clamp((now - gussetT0) / 450) : 0;
    const gsc = gs ? Math.max(0.0001, gt >= 1 ? 1 : backOut(gt)) : 0.0001;
    gussets.forEach((g) => g.scale.setScalar(gsc));
    if (gs && gt < 1) swinging = true;

    contact.material.opacity = Math.min(1, landed / 4) * 0.9;
    return landed;
  }

  // ---------------------------------------------------------------- DOM
  gsap.set(root.querySelectorAll('.wow-steel__line-in'), { y: 0, x: 0, yPercent: 150, rotate: 0 });
  // One index drives the panel: the beam counter + zone tag + name live in the same masked
  // group and swap in a single timeline, so they can never disagree.
  let curName = -2;
  function swapName(k) {
    if (k === curName) return;
    const prev = names[curName];
    curName = k;
    if (prev) {
      const pl = prev.querySelectorAll('.wow-steel__line-in');
      gsap.killTweensOf(pl);
      gsap.to(pl, { yPercent: -150, rotate: 0, duration: 0.4, ease: 'power3.in', stagger: 0.03, overwrite: true });
    }
    const next = names[k];
    if (next) {
      const nl = next.querySelectorAll('.wow-steel__line-in');
      gsap.killTweensOf(nl);
      gsap.fromTo(nl, { yPercent: 150, rotate: 2 }, { yPercent: 0, rotate: 0, duration: 0.85, ease: 'expo.out', stagger: 0.06, delay: prev ? 0.22 : 0, overwrite: true });
    }
  }

  const _c = new THREE.Vector3();
  const sp = (v, o) => {
    _c.copy(v).project(camera);
    o.x = (_c.x * 0.5 + 0.5) * W_;
    o.y = (-_c.y * 0.5 + 0.5) * H_;
    return o;
  };
  const P3 = { x: 0, y: 0 };
  const GUT = 16;
  const lblA = labels.map((li) => li && li.querySelector('.wow-steel__lbl-a'));
  const lblL = labels.map((li) => li && li.querySelector('.wow-steel__lead'));
  const lblSize = labels.map(() => null);
  // panel box (stage space): labels that would sit under the beam name are faded while the name shows
  const panelBox = { x: 0, y: 0, w: 0, h: 0 };
  const measure = () => {
    lblA.forEach((a, i) => (lblSize[i] = a ? { w: a.offsetWidth, h: a.offsetHeight } : null));
    const sr = stage.getBoundingClientRect();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const rg = document.createRange();
    panel.querySelectorAll('.wow-steel__meta, .wow-steel__name, .wow-steel__ticks').forEach((el) => {
      // the names are block-level: use the extent of their text, not the panel column width
      const isName = el.classList.contains('wow-steel__name');
      if (isName) rg.selectNodeContents(el);
      const r = (isName ? rg : el).getBoundingClientRect();
      if (!r.width) return;
      x0 = Math.min(x0, r.left); x1 = Math.max(x1, r.right);
      if (!isName) { y0 = Math.min(y0, r.top); y1 = Math.max(y1, r.bottom); }
    });
    if (x1 > x0) Object.assign(panelBox, { x: x0 - sr.left - 12, y: y0 - sr.top - 12, w: x1 - x0 + 24, h: y1 - y0 + 24 });
  };
  const placed = [];
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  // leader geometry is fixed per member (screen space), so it is set once
  mem.forEach((m, i) => {
    const ld = lblL[i];
    if (!ld) return;
    const ang = Math.atan2(m.d.ld[1], m.d.ld[0]);
    ld.style.width = `${m.d.L}px`;
    ld.style.transform = `rotate(${(ang / DEG).toFixed(2)}deg)`;
  });
  let legend = false;
  let finalCls = false;

  function updateDom(now) {
    // title overlay sits on the opening shot and clears as beam 1 drops
    const tOut = smooth(0.004, 0.026, p);
    title.style.opacity = String(POSTER ? 0 : 1 - tOut);
    title.style.transform = `translateY(${-tOut * 24}px)`;
    // panel: k = beam in flight (build order), same index for counter, tag, name and ticks
    let k = -1;
    if (!POSTER && p < FIN + 0.01) k = clamp(Math.floor((p - T0) / SLOT), 0, 8);
    const pa = POSTER ? 0 : smooth(0.012, 0.03, p) * (1 - smooth(FIN, FIN + 0.03, p));
    panel.style.opacity = String(pa);
    scrim.style.opacity = String(pa);
    swapName(pa > 0.001 || p < FIN ? k : -1);
    const lit = k >= 0 ? k : p >= FIN ? 8 : -1;
    ticks.forEach((t, i) => t.classList.toggle('is-on', i <= lit));

    svg.style.opacity = '0';
    glow.style.opacity = '0';
    shade.style.opacity = String(POSTER ? 0 : 0.9 * smooth(0.93, 1, p));
    host.style.opacity = '1';

    const isFinal = !POSTER && p >= 0.84;
    if (isFinal !== finalCls) {
      finalCls = isFinal;
      root.classList.toggle('is-final', isFinal);
    }
    const lg = mobile && !POSTER && p >= 0.9;
    if (lg !== legend) {
      legend = lg;
      root.classList.toggle('is-legend', lg);
    }

    // labels: horizontal, leader line from the beam, clamped inside the gutter
    let current = -1;
    for (let i = 0; i < 9; i++) if (p >= T0 + (i + 1) * SLOT) current = i;
    if (!lblSize[0] || !lblSize[0].w) measure();
    placed.length = 0;
    for (let i = 0; i < 9; i++) {
      const li = labels[i];
      if (!li) continue;
      const m = mem[i];
      const e = T0 + (i + 1) * SLOT;
      let a = POSTER ? 1 : smooth(e, e + 0.012, p);
      // phones: only the beam just bolted is labelled; the full list arrives as the legend
      if (!POSTER && mobile) a *= i === current ? 1 - smooth(FIN + 0.02, FIN + 0.06, p) : 0;
      else if (!POSTER && p < FIN + 0.04 && i !== current) a *= 0.42;
      li.style.opacity = a > 0.001 ? a.toFixed(3) : '0';
      li.classList.toggle('is-on', a > 0.5);
      if (legend) {
        li.style.transform = '';
        lblA[i].style.transform = '';
        continue;
      }
      if (a <= 0.001) continue;
      sp(m.anchor, P3);
      const ax = P3.x, ay = P3.y;
      const [dx, dy] = m.d.ld;
      const n = Math.hypot(dx, dy);
      const ex = (dx / n) * m.d.L, ey = (dy / n) * m.d.L;
      const sz = lblSize[i] || { w: 160, h: 18 };
      let lx, ly;
      if (Math.abs(dx) > Math.abs(dy)) {
        lx = dx > 0 ? ex + 6 : ex - 6 - sz.w;
        ly = ey - sz.h / 2;
      } else {
        lx = ex - sz.w / 2;
        ly = dy > 0 ? ey + 3 : ey - 3 - sz.h;
      }
      lx = clamp(ax + lx, GUT, Math.max(GUT, W_ - GUT - sz.w)) - ax;
      ly = clamp(ay + ly, GUT, Math.max(GUT, H_ - (mobile ? 84 : GUT) - sz.h)) - ay; // clear Skip / pitch pill on phones
      // keep labels from stacking on each other while the mark is still large and clamped to an edge
      const box = { x: ax + lx, y: ay + ly, w: sz.w, h: sz.h };
      for (let pass = 0; pass < 4; pass++) {
        const o = placed.find((q) => hit(box, q));
        if (!o) break;
        box.y = box.y + box.h / 2 < o.y + o.h / 2 ? o.y - box.h - 2 : o.y + o.h + 2;
      }
      ly = box.y - ay;
      placed.push(box);
      // fade any label that lands on the beam name while the panel is up (desktop)
      if (!mobile && pa > 0.001 && hit(box, panelBox)) li.style.opacity = (a * (1 - pa)).toFixed(3);
      li.style.transform = `translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px)`;
      lblA[i].style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
    }
  }

  // ---------------------------------------------------------------- atmosphere update
  const _toCam = new THREE.Vector3(), _x = new THREE.Vector3(), _z = new THREE.Vector3(), _mb = new THREE.Matrix4();
  function updateAtmos(now, dt, landed) {
    const tau = now / 1000;
    // dust
    if (dust.visible) {
      const arr = dustGeo.attributes.position.array;
      for (let i = 0; i < DUST_N; i++) {
        const sd = dustSeed[i];
        arr[i * 3 + 1] += dt * (0.05 + (sd % 1) * 0.06);
        arr[i * 3] += Math.sin(tau * 0.3 + sd) * dt * 0.06;
        if (arr[i * 3 + 1] > 11) arr[i * 3 + 1] = 0;
      }
      dustGeo.attributes.position.needsUpdate = true;
    }
    // halo
    halo.material.opacity = POSTER ? 0.32 : 0.35 * smooth(0.7, 0.88, p) + 0.08 * (landed / 9);
    // shafts face the camera around their own axis
    const sa = POSTER ? 0.8 : 0.35 + 0.65 * smooth(T0, 0.3, p);
    shafts.forEach((m) => {
      const s = m.userData;
      m.position.copy(key.position).addScaledVector(shaftDir, 2.5);
      _toCam.copy(camera.position).sub(m.position);
      _z.copy(_toCam).addScaledVector(shaftDir, -_toCam.dot(shaftDir)).normalize();
      _x.crossVectors(shaftDir, _z).normalize();
      m.position.addScaledVector(_x, s.off);
      _mb.makeBasis(_x, _toCam.copy(shaftDir).negate(), _z);
      m.quaternion.setFromRotationMatrix(_mb);
      m.scale.set(s.w, 24, 1);
      m.material.opacity = s.o * sa * (1 - smooth(0.84, 0.92, p));
    });
    // sparks
    if (sparks.visible) {
      spAlive = 0;
      for (let i = 0; i < SP_N; i++) {
        if (spLife[i] <= 0) continue;
        spLife[i] = Math.max(0, spLife[i] - dt / 0.45);
        spVel[i * 3 + 1] -= 9.8 * dt;
        spPos[i * 3] += spVel[i * 3] * dt;
        spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt;
        spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
        if (spPos[i * 3 + 1] < FLOOR_Y) {
          spPos[i * 3 + 1] = FLOOR_Y;
          spVel[i * 3 + 1] *= -0.35;
        }
        if (spLife[i] > 0) spAlive++;
      }
      spGeo.attributes.position.needsUpdate = true;
      spGeo.attributes.aLife.needsUpdate = true;
      sparks.material.uniforms.uScale.value = H_ * renderer.getPixelRatio() * 0.09;
      if (!spAlive) sparks.visible = false;
    }
    // flash
    const fk = (now - flashT0) / 320;
    flash.intensity = fk >= 0 && fk < 1 ? 26 * (1 - fk) * (1 - fk) : 0;
    flash.position.copy(flashPos);
    // finale rim sweep + mint bolt-up
    const tS = POSTER ? 0.5 : clamp((p - FIN - 0.01) / 0.13);
    const bell = tS > 0 && tS < 1 ? Math.sin(Math.PI * tS) : 0;
    GLOBAL_U.uSweepX.value = -7.5 + 15 * inOut(tS);
    GLOBAL_U.uSweepA.value = POSTER ? 0 : bell;
    GLOBAL_U.uEdge.value = 0.45 + 0.55 * (POSTER ? 1 : smooth(FIN, FIN + 0.08, p));
    sweepL.intensity = 1400 * bell;
    sweepL.position.set(-11 + 22 * inOut(tS), 4.5, 7.5);
    sweepL.target.position.set(-4 + 8 * inOut(tS), MARK_C.y, 0);
    return fk >= 0 && fk < 1;
  }

  // ---------------------------------------------------------------- sizing
  function resize() {
    mobile = isMobile();
    const r = stage.getBoundingClientRect();
    W_ = Math.max(1, Math.round(r.width));
    H_ = Math.max(1, Math.round(r.height));
    renderer.setSize(W_, H_, false);
    camera.aspect = W_ / H_;
    const wf = mobile ? 0.7 : Math.min(0.5, (0.56 * H_ * 1.453) / W_);
    d45 = MARK_W / (wf * 2 * Math.tan(22.5 * DEG) * camera.aspect);
    lblSize.fill(null);
    kick();
  }

  // ---------------------------------------------------------------- loop
  let raf = 0;
  let last = performance.now();
  let inView = true;
  let running = false;
  let disposed = false;

  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    pPrev = p;
    if (POSTER) p = pT = 0.8;
    else {
      p += (pT - p) * (1 - Math.exp(-dt * 8));
      if (Math.abs(pT - p) < 1e-5) p = pT;
    }
    computeGoal();
    if (first) {
      Object.assign(cam, goal);
      first = false;
    } else {
      const k = 1 - Math.exp(-dt * 3.6);
      for (const key of KEYS) cam[key] += (goal[key] - cam[key]) * k;
    }
    let camMoving = false;
    for (const key of KEYS) if (Math.abs(goal[key] - cam[key]) > (key === 'ox' || key === 'oy' ? 1e-4 : 1e-3)) camMoving = true;
    applyCamera(now);
    const landed = updateFrame(now, !first);
    const flashing = updateAtmos(now, dt, landed);
    dust.visible = POSTER ? false : p < 0.93;
    renderer.render(scene, camera);
    updateDom(now);
    const busy = Math.abs(pT - p) > 1e-5 || camMoving || swinging || sparks.visible || flashing || (now - shakeT0 < 160) || dust.visible;
    if (busy && inView && !document.hidden) raf = requestAnimationFrame(frame);
    else running = false;
  }

  function kick() {
    if (disposed || !inView || document.hidden) return;
    if (!raf) {
      last = performance.now();
      running = true;
      raf = requestAnimationFrame(frame);
    }
  }

  // ---------------------------------------------------------------- scroll + observers
  const st = ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      pT = self.progress;
      kick();
    },
  });
  pT = p = pPrev = st.progress;

  const vis = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    if (inView) kick();
  });
  vis.observe(root);
  const onVis = () => {
    if (!document.hidden) kick();
  };
  document.addEventListener('visibilitychange', onVis);

  let rTimer = 0;
  let lastW = window.innerWidth, lastH = window.innerHeight;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const onResize = () => {
    clearTimeout(rTimer);
    rTimer = setTimeout(() => {
      const w = window.innerWidth, h = window.innerHeight;
      if (coarse && w === lastW && Math.abs(h - lastH) < 120) return;
      lastW = w;
      lastH = h;
      resize();
    }, 150);
  };
  window.addEventListener('resize', onResize);

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    st.kill();
    vis.disconnect();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pagehide', dispose);
    document.removeEventListener('anp:leave', dispose);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((mm) => {
          if (mm.map) mm.map.dispose();
          mm.dispose();
        });
      }
      if (o.isInstancedMesh) o.dispose();
    });
    disposables.forEach((d) => d.dispose && d.dispose());
    [shadowTex, haloTex, shaftTex, dotTex].forEach((t) => t.dispose());
    envTex.dispose();
    pmrem.dispose();
    if (key.shadow && key.shadow.map) key.shadow.map.dispose();
    renderer.dispose();
    canvas.remove();
    root.__wowSteel = null;
  }
  window.addEventListener('pagehide', dispose);
  document.addEventListener('anp:leave', dispose);

  resize();
  ScrollTrigger.refresh();
  pT = p = pPrev = st.progress;
  kick();
  if (import.meta.env && import.meta.env.DEV) window.__wowSteel = { get p() { return p; }, get pT() { return pT; }, renderer, scene, camera };
  root.__wowSteel = { dispose };
  return root.__wowSteel;
}
