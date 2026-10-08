// The Build (v5): a concrete model of one building, sectioned open at the front, at blue
// hour on a navy blueprint. Ported from the v3 build3d.js model (shell, nine trade packages,
// moving section plane, per-step cameras) and restyled: mint poché on every cut, the active
// trade lit mint, a swoop from a plan drawing into a 3/4 aerial while the slabs lift.
// mount(stage, opts) -> { setProgress(p), setEntry(e), setHover(n), setActive(b), resize(), dispose() }
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SL, START, TOTAL, TRAVEL, slice, stepOf, clamp01 } from './wow-build-time.js';

const C = {
  navy: 0x0e1630, mint: 0x8dd1ba, edge: 0x9aa6c8,
  slab: 0xc9cdd3, wall: 0xc1c6ce, white: 0xd4d7dc, steel: 0x7d8696, timber: 0x9c7b55, pipe: 0xb8653d,
  soil: 0x2c2f3a, pave: 0x8f8e88, screed: 0x7f8590, glass: 0x9aa6c8, hole: 0x060a16, tree: 0x7f9f8e, grass: 0x4d6a5a,
};
const MINT = new THREE.Color(C.mint);
const EDGE = new THREE.Color(C.edge);
// inactive parts sink toward a cool slate while a trade is lit, so the active one pops
const DIM = new THREE.Color(0x6c7486);
const SLAB = new THREE.Color(C.slab), WALL = new THREE.Color(C.wall);
const MINT_OUT = 'vec4(0.553, 0.820, 0.729, 1.0)'; // #8dd1ba in output space
const CUT = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99);
const CLIP = { clippingPlanes: [CUT], clipShadows: true };

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const stagger = (t, i, n, span = 0.4) => clamp01((t - (i / Math.max(1, n - 1)) * (1 - span)) / span);
const lerp = (a, b, t) => a + (b - a) * t;

function keepAlpha(sh) {
  sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'gl_FragColor = vec4( outgoingLight, diffuseColor.a );');
}
// back faces exposed by the section plane render as flat, glowing mint poché
function poche(mat) {
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>\n if (!gl_FrontFacing) gl_FragColor = ${MINT_OUT};`);
  };
  return mat;
}
function makeMat(color, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, transparent: true, opacity: 1, ...CLIP, ...extra });
  m.onBeforeCompile = keepAlpha;
  return m;
}
const lineMat = () => new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0.28, ...CLIP });
function mesh(geo, color, { edges = true, shadow = true, mat } = {}) {
  const m = new THREE.Mesh(geo, mat || makeMat(color));
  m.castShadow = shadow; m.receiveShadow = true;
  m.userData.base = new THREE.Color(color);
  if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat()); m.add(e); }
  return m;
}

let SHELL, SHELLW, CUTFACE;
// cast-concrete grain: soft value noise used as a roughness and bump map (data, not colour)
function concreteNoise() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, S, S);
  const layer = (n, a) => {
    const t = document.createElement('canvas'); t.width = t.height = n; const tx = t.getContext('2d');
    const im = tx.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const g = 120 + Math.random() * 135; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = g; im.data[i * 4 + 3] = 255; }
    tx.putImageData(im, 0, 0);
    x.globalAlpha = a; x.imageSmoothingEnabled = true; x.drawImage(t, 0, 0, S, S);
  };
  layer(8, 0.35); layer(32, 0.3); layer(128, 0.22); layer(256, 0.16);
  x.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 3); tex.colorSpace = THREE.NoColorSpace;
  return tex;
}
let NOISE;
function shellMats() {
  NOISE = concreteNoise();
  const concrete = (color) => poche(new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, roughnessMap: NOISE, bumpMap: NOISE, bumpScale: 1.2, envMapIntensity: 0.7, ...CLIP }));
  SHELL = concrete(C.slab);
  SHELLW = concrete(C.wall);
  CUTFACE = new THREE.MeshBasicMaterial({ color: C.mint, toneMapped: false, ...CLIP });
}
// a shell box whose geometry sits on its own base (scale.y grows it upward)
function shellBox(w, h, d, x, yb, z, slab = true, cut = true) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
  const base = slab ? SHELL : SHELLW;
  const m = new THREE.Mesh(g, cut ? [base, base, base, base, CUTFACE, base] : base);
  m.position.set(x, yb, z); m.castShadow = m.receiveShadow = true;
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), lineMat()));
  return m;
}
const boxB = (w, h, d, x, yb, z, color = C.white, o) => { const m = mesh(new THREE.BoxGeometry(w, h, d), color, o); m.position.set(x, yb + h / 2, z); return m; };
const boxC = (w, h, d, x, y, z, color = C.white, o) => { const m = mesh(new THREE.BoxGeometry(w, h, d), color, o); m.position.set(x, y, z); return m; };
const boxGrow = (w, h, d, x, yb, z, color, o) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); const m = mesh(g, color, o); m.position.set(x, yb, z); return m; };
function beam(a, b, s, color, s2 = s) {
  const m = mesh(new THREE.BoxGeometry(s, a.distanceTo(b), s2), color);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
function iGeo(len, hh = 0.3, b = 0.16, tf = 0.04, tw = 0.025) {
  const s = new THREE.Shape();
  s.moveTo(-b / 2, -hh / 2); s.lineTo(b / 2, -hh / 2); s.lineTo(b / 2, -hh / 2 + tf); s.lineTo(tw / 2, -hh / 2 + tf);
  s.lineTo(tw / 2, hh / 2 - tf); s.lineTo(b / 2, hh / 2 - tf); s.lineTo(b / 2, hh / 2); s.lineTo(-b / 2, hh / 2);
  s.lineTo(-b / 2, hh / 2 - tf); s.lineTo(-tw / 2, hh / 2 - tf); s.lineTo(-tw / 2, -hh / 2 + tf); s.lineTo(-b / 2, -hh / 2 + tf); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}
const steelMat = () => makeMat(C.steel, { metalness: 0.6, roughness: 0.4 });
function iMember(a, b, hh, bf) {
  const m = mesh(iGeo(a.distanceTo(b), hh, bf), C.steel, { mat: steelMat() });
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
function ghostOf(m) {
  const gl = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), new THREE.LineDashedMaterial({ color: C.edge, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0, ...CLIP }));
  gl.position.copy(m.position); gl.quaternion.copy(m.quaternion); gl.computeLineDistances(); gl.userData.ghost = true; return gl;
}
const lineOpacity = (n) => ((n.userData.lo ?? 0.28) + (n.userData.hi || 0) * 0.6 + (n.userData.dn || 0) * 0.14) * (n.userData.o ?? 1);
function setOpacity(obj, o) {
  obj.traverse((n) => {
    if (n.isMesh && n.material && !Array.isArray(n.material)) {
      n.material.opacity = o; n.material.depthWrite = o > 0.98; n.material.transparent = o < 0.999; n.castShadow = o > 0.6;
    }
    if (n.isLineSegments && n.material && !n.userData.ghost) { n.userData.o = o; n.material.opacity = lineOpacity(n); }
  });
  obj.visible = o > 0.01;
}
// active trade: mint body glow; completed trades: their own material with a thin mint edge
function highlight(group, k, done, focus = 0) {
  const dim = 0.4 * focus * (1 - k);
  group.traverse((n) => {
    if (n.isMesh && n.userData.base && n.material.emissive) {
      n.material.color.copy(n.userData.base).lerp(DIM, dim).lerp(MINT, 0.42 * k);
      n.material.emissive.copy(MINT).multiplyScalar(0.35 * k);
    }
    if (n.isLineSegments && !n.userData.ghost) {
      n.userData.hi = k; n.userData.dn = done;
      n.material.color.copy(EDGE).lerp(MINT, Math.max(k, done * 0.85));
      n.material.opacity = lineOpacity(n);
    }
  });
}

/* ---- Shell: lift-slab extrusion ---------------------------------------------------- */
const LV = [0, 3.2, 6.4, 9.6, 12.8];
const ST = 0.35;
const COLS_X = [-3.2, 1.2, 5.4];
const COLS_Z = [-3.2, 1.6];
const HOLE = { x0: -6.4, x1: -4.6, z0: 2.7, z1: 4.5 };

function shell() {
  const g = new THREE.Group();
  const slabs = LV.map(() => []);
  LV.forEach((y, i) => {
    if (i === 0 || i === LV.length - 1) { slabs[i].push(shellBox(14, ST, 9, 0, 0, 0)); return; }
    slabs[i].push(shellBox(11.6, ST, 9, 1.2, 0, 0), shellBox(2.4, ST, 7.2, -5.8, 0, -0.9, true, false), shellBox(0.6, ST, 1.8, -6.7, 0, 3.6));
  });
  slabs.flat().forEach((m) => g.add(m));
  const cols = [];
  for (let s = 0; s < 4; s++) for (const x of COLS_X) for (const z of COLS_Z) { const c = shellBox(0.4, 3.2 - ST, 0.4, x, LV[s], z, false, false); c.userData.s = s; cols.push(c); g.add(c); }
  const walls = [shellBox(14, 13.4, 0.3, 0, -0.35, -4.65, false, false), shellBox(0.3, 13.4, 9.3, -7.15, -0.35, -0.15, false)];
  walls.forEach((m) => g.add(m));
  const glassG = new THREE.BoxGeometry(0.06, 12.4, 9); glassG.translate(0, 6.2, 0);
  const glass = mesh(glassG, C.glass, { edges: false, shadow: false, mat: makeMat(C.glass, { opacity: 0.14, roughness: 0.1, metalness: 0.2 }) });
  glass.position.set(7.05, 0.2, 0); g.add(glass);
  const mulls = [];
  for (let z = -4.5; z <= 4.5; z += 1.5) { const mu = boxGrow(0.12, 12.8, 0.12, 7.06, 0, z, C.white); mu.material.transparent = false; mulls.push(mu); g.add(mu); }
  const paras = [shellBox(14, 0.7, 0.25, 0, 0, -4.4, false, false), shellBox(0.25, 0.7, 9, -6.9, 0, 0, false), shellBox(0.25, 0.7, 9, 6.9, 0, 0, false)];
  paras.forEach((m) => g.add(m));
  const ys = [0, 0, 0, 0, 0];
  return {
    group: g,
    // e: 0 = nothing; the stack of slabs extrudes from the plan, then lifts floor by floor
    update(e) {
      const a = easeOut(clamp01(e / 0.14));
      for (let i = 0; i < LV.length; i++) {
        const yS = -ST + i * ST * a, yF = LV[i] - ST;
        const l = i === 0 ? 0 : ease(clamp01((e - 0.14 - (4 - i) * 0.075) / 0.56));
        ys[i] = lerp(yS, yF, l);
        slabs[i].forEach((m) => { m.position.y = ys[i]; m.scale.y = Math.max(0.001, a); m.visible = a > 0.001; });
      }
      cols.forEach((c) => {
        const base = ys[c.userData.s] + ST, hgt = ys[c.userData.s + 1] - base;
        c.position.y = base; c.scale.y = Math.max(0.001, hgt / (3.2 - ST)); c.visible = hgt > 0.02;
      });
      const top = ys[4] + ST;
      const kw = Math.max(0.001, ((top + 0.35) / 13.4) * a);
      walls.forEach((m) => { m.scale.y = kw; m.visible = a > 0.001; });
      glass.scale.y = Math.max(0.001, (top - 0.4) / 12.4); glass.visible = top > 2;
      mulls.forEach((m) => { m.scale.y = Math.max(0.001, top / 12.8); m.visible = a > 0.001; });
      paras.forEach((m) => { m.position.y = top; m.visible = a > 0.001; });
    },
  };
}

/* ---- The nine packages (services order) --------------------------------------------- */
function stripOut() {
  const g = new THREE.Group(); const items = [];
  const y0 = 9.6, ceil = 12.2;
  for (let z = -3.75; z <= 3.8; z += 1.5) items.push(boxC(13.2, 0.05, 0.06, 0, ceil, z));
  for (let x = -6; x <= 6.1; x += 1.5) items.push(boxC(0.06, 0.05, 8.2, x, ceil, -0.1));
  for (const z of [-2, 1.6]) { const d = mesh(new THREE.CylinderGeometry(0.22, 0.22, 12.4, 16), C.white); d.rotation.z = Math.PI / 2; d.position.set(0.3, 12.0, z); items.push(d); }
  items.push(boxB(0.12, 2.5, 3.6, -2, y0, -2.6), boxB(0.12, 2.5, 3.3, 3.2, y0, 2.4), boxB(4.4, 2.5, 0.12, 0.6, y0, -0.7));
  for (const [x, z] of [[-4.6, 1.5], [-0.6, 2.4], [1.8, -2.6], [4.8, -1.4]]) items.push(boxB(1.5, 0.75, 0.75, x, y0, z));
  const ghosts = items.map((m) => { const gh = ghostOf(m); g.add(gh); return gh; });
  items.forEach((m) => { m.userData.y = m.position.y; m.userData.z = m.position.z; g.add(m); });
  return {
    group: g, anchor: new THREE.Vector3(0.6, 11.4, 2.5), cut: 12.3, existing: true,
    update(t, raw) {
      const keep = 1 - clamp01((raw - 1.5) / 0.4);
      items.forEach((m, i) => {
        const k = easeOut(stagger(t, i, items.length, 0.35));
        ghosts[i].material.opacity = 0.5 * clamp01(k * 2) * keep;
        m.position.y = m.userData.y + k * 1.2; m.position.z = m.userData.z + k * 2.5;
        setOpacity(m, 1 - k);
      });
    },
  };
}

function alterations() {
  const g = new THREE.Group(); const z = -1.3, y0 = 3.2, xa = 2.6, xb = 5.0;
  g.add(boxB(xa - 1.4, 2.85, 0.3, (1.4 + xa) / 2, y0, z), boxB(6.95 - xb, 2.85, 0.3, (xb + 6.95) / 2, y0, z), boxB(xb - xa, 0.3, 0.3, (xa + xb) / 2, 5.75, z));
  const chunks = [];
  for (let iy = 0; iy < 3; iy++) for (let ix = 0; ix < 2; ix++) {
    const c = boxB(1.2, 0.85, 0.3, xa + 0.6 + ix * 1.2, y0 + iy * 0.85, z);
    c.userData.p = c.position.clone(); chunks.push(c); g.add(c);
  }
  const gh = ghostOf(boxB(xb - xa, 2.55, 0.3, (xa + xb) / 2, y0, z)); g.add(gh);
  const props = [];
  for (const x of [xa + 0.3, xb - 0.3]) for (const dz of [-0.7, 0.7]) {
    const p = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8), C.steel); p.geometry.translate(0, 1.25, 0);
    p.position.set(x, y0, z + dz); props.push(p); g.add(p);
  }
  const lintel = iMember(new THREE.Vector3(xa - 0.2, 5.6, z), new THREE.Vector3(xb + 0.2, 5.6, z), 0.3, 0.16); lintel.rotateY(Math.PI / 2);
  g.add(lintel);
  return {
    group: g, anchor: new THREE.Vector3((xa + xb) / 2, 4.6, z), existing: true,
    update(t, raw) {
      const keep = 1 - clamp01((raw - 1.5) / 0.4);
      props.forEach((p, i) => { const k = easeOut(stagger(clamp01(t / 0.25), i, props.length, 0.6)) * (1 - easeOut(clamp01((t - 0.88) / 0.12))); p.scale.y = Math.max(0.001, k); setOpacity(p, k > 0.01 ? 1 : 0); });
      let gone = 0;
      chunks.forEach((c, i) => {
        const k = ease(stagger(clamp01((t - 0.25) / 0.35), i, chunks.length, 0.5)); gone += k / chunks.length;
        c.position.set(c.userData.p.x + k * (i % 2 ? 0.5 : -0.5), c.userData.p.y - k * (c.userData.p.y - y0) * 0.9, c.userData.p.z + k * 1.4);
        c.rotation.x = k * (i % 2 ? 0.9 : -0.7); c.rotation.z = k * 0.4;
        setOpacity(c, 1 - k);
      });
      gh.material.opacity = 0.55 * gone * keep;
      const kl = easeOut(clamp01((t - 0.55) / 0.3));
      lintel.position.z = z + (1 - kl) * 6; setOpacity(lintel, kl > 0 ? 1 : 0);
    },
  };
}

function drilling() {
  const g = new THREE.Group(); const y = 6.4;
  const cores = [], holes = [];
  const pts = [[2.2, -0.4], [2.8, -0.4], [3.4, -0.4], [2.2, 0.4], [2.8, 0.4], [3.4, 0.4]];
  pts.forEach(([x, z], i) => {
    const c = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.35, 20), C.slab); c.position.set(x, y - 0.175, z); c.userData.p = c.position.clone();
    c.userData.rest = new THREE.Vector3(2.0 + i * 0.42, y + 0.15, 1.15); cores.push(c); g.add(c);
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), new THREE.MeshBasicMaterial({ color: C.hole, ...CLIP })); h.rotation.x = -Math.PI / 2; h.position.set(x, y + 0.012, z); holes.push(h); g.add(h);
  });
  const rig = new THREE.Group();
  rig.add(boxB(0.8, 0.06, 0.5, 0.1, 0, 0, C.steel));
  const mast = mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.9, 8), C.steel); mast.position.set(0.32, 0.95, 0); rig.add(mast);
  const motor = boxB(0.32, 0.34, 0.3, 0, 1.2, 0, C.steel); rig.add(motor);
  const barrel = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 16), C.white); barrel.position.set(0, -0.35, 0); motor.add(barrel);
  rig.position.set(pts[0][0], y, pts[0][1]); g.add(rig);
  const span = 0.78 / pts.length;
  return {
    group: g, anchor: new THREE.Vector3(2.8, 7.4, 0), cut: 8.9,
    update(t, raw) {
      const kin = easeOut(clamp01(t / 0.1)), kout = easeOut(clamp01((raw - 1.5) / 0.3));
      const kr = kin * (1 - kout); rig.scale.setScalar(Math.max(0.001, kr)); setOpacity(rig, kr > 0.01 ? 1 : 0);
      const at = (t - 0.1) / span, cur = Math.min(pts.length - 1, Math.max(0, Math.floor(at)));
      rig.position.x = pts[cur][0]; rig.position.z = pts[cur][1];
      motor.position.y = 1.2 - Math.sin(Math.min(1, clamp01(at - cur) / 0.6) * Math.PI) * 0.55;
      cores.forEach((c, i) => {
        const lt = clamp01(at - i);
        const k = easeOut(clamp01((lt - 0.55) / 0.45));
        c.position.lerpVectors(c.userData.p, c.userData.rest, k); c.position.y += Math.sin(k * Math.PI) * 0.9;
        c.rotation.z = k * Math.PI / 2;
        holes[i].visible = lt > 0.5;
      });
    },
  };
}

function groundworks() {
  const g = new THREE.Group(); const pads = [];
  for (const x of COLS_X) for (const z of COLS_Z) { const p = boxGrow(1.3, 0.75, 1.3, x, -1.1, z, C.slab); pads.push(p); g.add(p); }
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-5.5, -1.3, 3.4), new THREE.Vector3(0, -1.55, 3.4), new THREE.Vector3(6, -1.8, 3.4), new THREE.Vector3(9.5, -1.95, 3.6), new THREE.Vector3(10.8, -2.0, 4.2)]);
  const tubeGeo = new THREE.TubeGeometry(curve, 160, 0.2, 14, false);
  const pipe = mesh(tubeGeo, C.pipe, { edges: false }); g.add(pipe);
  const drop = mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.2, 12), C.pipe, { edges: false }); drop.position.set(1.2, -0.85, 3.4); g.add(drop);
  const mh = mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.4, 28, 1, true), C.white, { mat: makeMat(C.white, { side: THREE.DoubleSide }) }); mh.geometry.translate(0, 1.2, 0); mh.position.set(10.8, -2.4, 4.2); g.add(mh);
  const lid = mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9), C.steel); lid.position.set(10.8, 0.03, 4.2); g.add(lid);
  const idx = tubeGeo.index.count;
  return {
    group: g, anchor: new THREE.Vector3(6, -1.8, 3.4),
    update(t) {
      pads.forEach((p, i) => { const k = easeBack(stagger(clamp01(t / 0.35), i, pads.length, 0.5)); p.scale.y = Math.max(0.001, k); setOpacity(p, k > 0.001 ? 1 : 0); });
      const kp = clamp01((t - 0.3) / 0.45);
      tubeGeo.setDrawRange(0, Math.floor((idx * kp) / 6) * 6); pipe.visible = kp > 0;
      const kd = easeOut(clamp01((t - 0.3) / 0.15)); drop.scale.y = Math.max(0.001, kd); drop.visible = kd > 0;
      const km = easeOut(clamp01((t - 0.7) / 0.25)); mh.scale.set(1, Math.max(0.001, km), 1); setOpacity(mh, km > 0 ? 1 : 0); setOpacity(lid, km);
    },
  };
}

function steelwork() {
  const g = new THREE.Group(); const members = []; const y0 = 12.8, top = 15.1;
  const xs = [0.8, 3.6, 6.2], zs = [-3.2, 1.2];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const x of xs) for (const z of zs) {
    members.push(iMember(V(x, y0, z), V(x, top - 0.36, z), 0.22, 0.22));
    members.push(boxB(0.42, 0.03, 0.42, x, y0, z, C.steel));
  }
  for (const z of zs) { const b = iMember(V(0.8 - 0.11, top - 0.18, z), V(6.2 + 0.11, top - 0.18, z), 0.36, 0.17); b.rotateY(Math.PI / 2); members.push(b); }
  for (const x of xs) members.push(iMember(V(x, top - 0.18, -3.2), V(x, top - 0.18, 1.2), 0.36, 0.17));
  members.push(iMember(V(2.2, top - 0.15, -3.2), V(2.2, top - 0.15, 1.2), 0.25, 0.13), iMember(V(4.9, top - 0.15, -3.2), V(4.9, top - 0.15, 1.2), 0.25, 0.13));
  members.push(beam(V(0.8, y0 + 0.1, -3.2), V(3.5, top - 0.4, -3.2), 0.1, C.steel));
  members.forEach((m) => { m.userData.y = m.position.y; g.add(m); });
  return {
    group: g, anchor: new THREE.Vector3(3.5, 15.6, -1),
    update(t) {
      members.forEach((m, i) => {
        const k = stagger(clamp01(t / 0.9), i, members.length, 0.3);
        m.position.y = m.userData.y + (1 - easeOut(k)) * 5;
        setOpacity(m, k > 0 ? Math.min(1, k * 3) : 0);
      });
    },
  };
}

function carpentry() {
  const g = new THREE.Group(); const trusses = []; const y0 = 12.8, x0 = -6.2, x1 = -1.2, xm = -3.7, top = 14.7;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const s = 0.05, d = 0.15;
  for (let i = 0; i < 9; i++) {
    const tr = new THREE.Group();
    tr.add(beam(V(x0, 0.08, 0), V(x1, 0.08, 0), d, C.timber, s));
    tr.add(beam(V(x0, 0.08, 0), V(xm, top - y0, 0), d, C.timber, s));
    tr.add(beam(V(x1, 0.08, 0), V(xm, top - y0, 0), d, C.timber, s));
    tr.add(beam(V(xm, 0.08, 0), V((x0 + xm) / 2, (top - y0) / 2, 0), 0.09, C.timber, s));
    tr.add(beam(V(xm, 0.08, 0), V((x1 + xm) / 2, (top - y0) / 2, 0), 0.09, C.timber, s));
    tr.add(beam(V((x0 + xm) / 2 - 0.35, 0.08, 0), V((x0 + xm) / 2, (top - y0) / 2, 0), 0.09, C.timber, s));
    tr.add(beam(V((x1 + xm) / 2 + 0.35, 0.08, 0), V((x1 + xm) / 2, (top - y0) / 2, 0), 0.09, C.timber, s));
    tr.position.set(0, y0 + 0.08, -3.4 + i * 0.6); trusses.push(tr); g.add(tr);
  }
  const plates = [boxB(0.1, 0.08, 5.2, x0 + 0.1, y0, -1, C.timber), boxB(0.1, 0.08, 5.2, x1 - 0.1, y0, -1, C.timber)];
  plates.forEach((p) => g.add(p));
  const ridge = boxC(0.05, 0.18, 5.2, xm, top + 0.1, -1, C.timber); g.add(ridge);
  const binder = boxC(0.05, 0.1, 5.2, xm, y0 + 0.5, -1, C.timber); g.add(binder);
  return {
    group: g, anchor: new THREE.Vector3(xm, 15.2, -1),
    update(t) {
      plates.forEach((p) => { const k = easeOut(clamp01(t / 0.15)); p.scale.z = Math.max(0.001, k); setOpacity(p, k > 0 ? 1 : 0); });
      trusses.forEach((tr, i) => { const k = easeBack(stagger(clamp01((t - 0.1) / 0.6), i, trusses.length, 0.35)); tr.scale.y = Math.max(0.001, k); setOpacity(tr, k > 0.001 ? 1 : 0); });
      [ridge, binder].forEach((p, i) => { const k = easeOut(stagger(clamp01((t - 0.65) / 0.3), i, 2, 0.6)); p.scale.z = Math.max(0.001, k); setOpacity(p, k > 0 ? 1 : 0); });
    },
  };
}

function composite() {
  const g = new THREE.Group(); const levels = [];
  const cx = (HOLE.x0 + HOLE.x1) / 2, cz = (HOLE.z0 + HOLE.z1) / 2, w = HOLE.x1 - HOLE.x0, d = HOLE.z1 - HOLE.z0;
  const shaft = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 12.8, d)), new THREE.LineDashedMaterial({ color: C.edge, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.55, ...CLIP }));
  shaft.userData.lo = 0.5; shaft.computeLineDistances(); shaft.position.set(cx, 6.4, cz); g.add(shaft);
  const prof = new THREE.Shape(); const pitch = 0.3, hh = 0.1;
  prof.moveTo(0, 0);
  for (let x = 0; x < w - 0.01; x += pitch) { prof.lineTo(x + 0.05, 0); prof.lineTo(x + 0.09, hh); prof.lineTo(x + 0.21, hh); prof.lineTo(x + 0.25, 0); prof.lineTo(x + pitch, 0); }
  prof.lineTo(w, -0.012); prof.lineTo(0, -0.012); prof.closePath();
  for (const y of [3.2, 6.4, 9.6]) {
    const dg = new THREE.ExtrudeGeometry(prof, { depth: d, bevelEnabled: false }); dg.translate(-w / 2, 0, -d / 2);
    const deck = mesh(dg, C.steel, { mat: steelMat(), edges: false }); deck.position.set(cx, y - ST + 0.012, cz); g.add(deck);
    const pg = new THREE.BoxGeometry(w, ST - 0.12, d); pg.translate(0, (ST - 0.12) / 2, 0);
    const pm = makeMat(C.slab); const pour = new THREE.Mesh(pg, [pm, pm, pm, pm, CUTFACE, pm]); pour.castShadow = pour.receiveShadow = true;
    pour.userData.base = new THREE.Color(C.slab);
    pour.add(new THREE.LineSegments(new THREE.EdgesGeometry(pg, 25), lineMat())); pour.position.set(cx, y - ST + 0.11, cz); g.add(pour);
    levels.push({ deck, pour, pm });
  }
  const show = (m, mat, k) => { mat.opacity = 1; mat.transparent = false; mat.depthWrite = true; m.visible = k > 0; };
  return {
    group: g, anchor: new THREE.Vector3(cx, 7.2, cz),
    update(t) {
      levels.forEach((lv, li) => {
        const tl = stagger(t, li, levels.length, 0.5);
        const kd = easeOut(clamp01(tl / 0.45)); lv.deck.scale.z = Math.max(0.001, kd); setOpacity(lv.deck, kd > 0 ? 1 : 0);
        const kp = easeOut(clamp01((tl - 0.5) / 0.5)); lv.pour.scale.y = Math.max(0.001, kp); show(lv.pour, lv.pm, kp);
      });
    },
  };
}

function landscaping() {
  const g = new THREE.Group(); const tiles = [];
  for (let ix = 0; ix < 11; ix++) for (let iz = 0; iz < 3; iz++) {
    const t = boxGrow(1.12, 0.1, 0.88, -6.3 + ix * 1.26, 0, 6.1 + iz * 1.0, C.pave); t.userData.d = ix + iz * 1.6; tiles.push(t); g.add(t);
  }
  tiles.sort((a, b) => a.userData.d - b.userData.d);
  const bed = boxGrow(14.2, 0.06, 1.2, 0, 0, 9.3, C.grass); g.add(bed);
  const kerb = boxGrow(14.2, 0.2, 0.22, 0, 0, 10.0, C.white); kerb.geometry.translate(7.1, 0, 0); kerb.position.x = -7.1; g.add(kerb);
  const wall = boxGrow(0.3, 0.9, 4.2, -8.0, 0, 7.4, C.white); g.add(wall);
  const bank = boxGrow(1.4, 0.85, 4.2, -8.85, 0, 7.4, C.grass); g.add(bank);
  const trees = [];
  for (const x of [-4.8, 0.2, 5.2]) {
    const tr = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.3, 8), C.white); trunk.position.y = 0.65; tr.add(trunk);
    const can = mesh(new THREE.IcosahedronGeometry(0.75, 1), C.tree); can.position.y = 1.8; tr.add(can);
    tr.position.set(x, 0.06, 9.3); trees.push(tr); g.add(tr);
  }
  const posts = [];
  for (let z = -3.5; z <= 9.5; z += 1.3) { const p = boxGrow(0.08, 1.1, 0.08, -9.7, 0.85, z, C.white); posts.push(p); g.add(p); }
  const rails = [boxGrow(0.04, 0.05, 13.0, -9.7, 1.25, 3.0, C.white), boxGrow(0.04, 0.05, 13.0, -9.7, 1.75, 3.0, C.white)];
  rails.forEach((r) => g.add(r));
  return {
    group: g, anchor: new THREE.Vector3(0, 0.6, 7.2),
    update(t) {
      tiles.forEach((tl, i) => { const k = easeBack(stagger(clamp01(t / 0.5), i, tiles.length, 0.25)); tl.scale.y = Math.max(0.001, k); setOpacity(tl, k > 0.001 ? 1 : 0); });
      const kk = easeOut(clamp01((t - 0.4) / 0.2)); kerb.scale.x = Math.max(0.001, kk); setOpacity(kerb, kk > 0 ? 1 : 0); bed.scale.x = Math.max(0.001, kk); setOpacity(bed, kk > 0 ? 1 : 0);
      const kw = easeOut(clamp01((t - 0.4) / 0.2)); wall.scale.y = Math.max(0.001, kw); setOpacity(wall, kw > 0 ? 1 : 0); bank.scale.y = Math.max(0.001, kw); setOpacity(bank, kw > 0 ? 1 : 0);
      posts.forEach((p, i) => { const k = easeOut(stagger(clamp01((t - 0.5) / 0.25), i, posts.length, 0.4)); p.scale.y = Math.max(0.001, k); setOpacity(p, k > 0 ? 1 : 0); });
      rails.forEach((r) => { const k = easeOut(clamp01((t - 0.7) / 0.15)); r.scale.z = Math.max(0.001, k); setOpacity(r, k > 0 ? 1 : 0); });
      trees.forEach((tr, i) => { const k = easeBack(stagger(clamp01((t - 0.7) / 0.3), i, trees.length, 0.6)); tr.scale.setScalar(Math.max(0.001, k)); setOpacity(tr, k > 0.001 ? 1 : 0); });
    },
  };
}

function screeding() {
  const g = new THREE.Group(); const x0 = -4.5, x1 = 1.0, w = x1 - x0;
  const geo = new THREE.BoxGeometry(w, 0.075, 8.4); geo.translate(w / 2, 0.0375, 0);
  const sMat = makeMat(C.screed, { roughness: 0.2 });
  const s = mesh(geo, C.screed, { mat: sMat }); s.position.set(x0, 6.4, -0.1); g.add(s);
  const bar = boxGrow(0.08, 0.1, 8.6, x0, 6.4, -0.1, C.steel, { edges: false }); g.add(bar);
  return {
    group: g, anchor: new THREE.Vector3(-1.8, 6.9, 0), cut: 8.9,
    update(t) {
      const k = ease(clamp01(t / 0.75));
      s.scale.x = Math.max(0.001, k); setOpacity(s, k > 0 ? 1 : 0);
      bar.position.x = x0 + w * k; bar.visible = k > 0 && k < 0.999;
      sMat.roughness = 0.2 + 0.65 * clamp01((t - 0.75) / 0.25);
    },
  };
}

/* ---- The plan drawing: the footprint and setting-out grid, drawn in mint ------------- */
function planDrawing() {
  const g = new THREE.Group();
  const mat = (o) => new THREE.MeshBasicMaterial({ color: C.mint, transparent: true, opacity: o, toneMapped: false, depthWrite: false, fog: false });
  const items = [];
  const seg = (ax, az, bx, bz, wdt, o, order) => {
    const len = Math.hypot(bx - ax, bz - az);
    const geo = new THREE.PlaneGeometry(1, wdt); geo.translate(0.5, 0, 0); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat(o)); m.position.set(ax, 0.02, az); m.rotation.y = -Math.atan2(bz - az, bx - ax);
    m.userData = { len, o, order }; m.renderOrder = 4; items.push(m); g.add(m);
  };
  // footprint outline, drawn as one continuous pen stroke
  const P = [[-7.3, -4.8], [7.1, -4.8], [7.1, 4.5], [-7.3, 4.5], [-7.3, -4.8]];
  for (let i = 0; i < 4; i++) seg(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], 0.09, 0.95, i * 0.12);
  // setting-out grid lines through the columns, overrunning the footprint
  COLS_X.forEach((x, i) => seg(x, -6.9, x, 6.6, 0.035, 0.5, 0.5 + i * 0.06));
  COLS_Z.forEach((z, i) => seg(-9.4, z, 9.2, z, 0.035, 0.5, 0.62 + i * 0.06));
  // the shaft void and the side core
  const H = HOLE; [[H.x0, H.z0, H.x1, H.z0], [H.x1, H.z0, H.x1, H.z1], [H.x1, H.z1, H.x0, H.z1], [H.x0, H.z1, H.x0, H.z0]].forEach((s, i) => seg(...s, 0.04, 0.7, 0.72 + i * 0.03));
  seg(-7.0, -4.5, -4.6, -4.5, 0.03, 0.4, 0.8); seg(-4.6, -4.5, -4.6, 2.7, 0.03, 0.4, 0.84);
  // column squares and grid bubbles
  const sq = new THREE.PlaneGeometry(0.42, 0.42); sq.rotateX(-Math.PI / 2);
  for (const x of COLS_X) for (const z of COLS_Z) { const m = new THREE.Mesh(sq, mat(0.9)); m.position.set(x, 0.021, z); m.userData = { dot: true, o: 0.9, order: 0.86 }; m.renderOrder = 4; items.push(m); g.add(m); }
  const ring = new THREE.RingGeometry(0.42, 0.48, 40); ring.rotateX(-Math.PI / 2);
  const bubbles = [...COLS_X.map((x) => [x, -7.4]), ...COLS_Z.map((z) => [-9.9, z])];
  bubbles.forEach(([x, z], i) => { const m = new THREE.Mesh(ring, mat(0.7)); m.position.set(x, 0.021, z); m.userData = { dot: true, o: 0.7, order: 0.9 + i * 0.02 }; m.renderOrder = 4; items.push(m); g.add(m); });
  return {
    group: g,
    // d: draw-on progress; f: overall fade (the drawing stays on the ground, quieter)
    update(d, f) {
      items.forEach((m) => {
        const k = clamp01((d - m.userData.order * 0.7) / 0.3);
        if (m.userData.dot) m.scale.setScalar(Math.max(0.001, easeBack(k)));
        else m.scale.x = Math.max(0.001, m.userData.len * easeOut(k));
        m.material.opacity = m.userData.o * f;
        m.visible = k > 0.001 && f > 0.01;
      });
    },
  };
}

/* ---- Cameras: [position, target, zoom] ------------------------------------------------- */
const PLAN = [[0, 30, -0.3], [0, 0, -1.0], 1.12];
const HERO = [[24, 13, 30], [0.5, 4.6, 0.5], 1];
const KEYS = [
  HERO,
  [[7, 19, 19], [0.3, 10.4, 0.3], 1.3],      // 01 strip out: plan cut above the top floor
  [[1.5, 5.6, 15], [3.8, 4.5, -1.3], 1.35],   // 02 alterations: the wall in elevation
  [[9.5, 15.5, 12], [2.8, 6.6, 0.5], 1.2],   // 03 drilling: down onto floor 2, cut above
  [[13, 1.6, 23], [3.5, -1.3, 3], 1.2],       // 04 groundworks: low, at the soil section face
  [[15, 21, 15], [3.5, 14, -1], 1.25],         // 05 steel
  [[-13, 19, 13], [-3.4, 13.9, -1], 1.25],    // 06 carpentry
  [[-6, 13, 16], [-4.8, 6.4, 3.0], 1.55],      // 07 composite: the shaft on the section face
  [[7, 12, 25], [0.2, 0.4, 7.2], 1.15],       // 08 landscaping
  [[5, 17, 13], [-1.6, 6.5, 0.2], 1.25],       // 09 screeding: plan cut above floor 2
  [[18, 20, 32], [1.2, 5.2, 1.5], 1.12],      // finale: the open section face, as a scope map
];
const sph = (k) => {
  const t = new THREE.Vector3(...k[1]); const o = new THREE.Vector3(...k[0]).sub(t); const r = o.length();
  return { r, phi: Math.acos(o.y / r), th: Math.atan2(o.x, o.z), t, z: k[2] || 1 };
};
// framing: the model lives in a safe region of the stage (fractions of w/h), clear of the
// copy. Desktop: the right ~half, inside an 8% margin. Phones: below the copy, above the pill.
const R_LAND = { x0: 0.44, x1: 0.94, y0: 0.13, y1: 0.9 };
const R_PORT = { x0: 0.05, x1: 0.95, y0: 0.5, y1: 0.885 };
const FINAL_ORBIT = -25 * Math.PI / 180;
function interp(a, b, f, out) {
  let dth = b.th - a.th; if (dth > Math.PI) dth -= Math.PI * 2; if (dth < -Math.PI) dth += Math.PI * 2;
  out.r = a.r * Math.pow(b.r / a.r, f); out.phi = lerp(a.phi, b.phi, f); out.th = a.th + dth * f;
  out.t.lerpVectors(a.t, b.t, f); out.z = lerp(a.z, b.z, f);
  return out;
}

export function mount(stage, { mobile = false, onFrame } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
  // transparent clear: the stage's navy shows through, so the giant numeral can sit behind the model
  renderer.setClearColor(C.navy, 0);
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.localClippingEnabled = true;
  CUT.constant = 99;
  shellMats();
  const canvas = renderer.domElement; canvas.className = 'wow-build__cv';
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.navy, 60, 160);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture; scene.environmentIntensity = 0.3;
  pmrem.dispose();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 400);

  // warm low-sun key, cool blue-hour sky fill, a mint rim from behind
  scene.add(new THREE.HemisphereLight(0xa8bce0, 0x121a34, 1.05));
  const key = new THREE.DirectionalLight(0xffd9b0, 2.5);
  key.position.set(-20, 26, 16);
  if (!mobile) {
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.intensity = 0.9; key.shadow.radius = 3;
    Object.assign(key.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 100 });
    key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
  }
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8dd1ba, 1.1); rim.position.set(14, 12, -30); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x7f95c8, 0.45); fill.position.set(26, 6, 10); scene.add(fill);

  // blueprint grid: world-space lines, radially faded into the navy
  const gridMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Vector3(0.553, 0.820, 0.729) }, uFade: { value: 1 }, uR: { value: new THREE.Vector2(10, 46) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uColor; uniform float uFade; uniform vec2 uR; varying vec3 vW;
      float grid(vec2 p, float s){ vec2 c = p / s; vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){
        float a = max(grid(vW.xz, 1.0) * 0.07, grid(vW.xz, 5.0) * 0.15);
        a *= 1.0 - smoothstep(uR.x, uR.y, length(vW.xz));
        gl_FragColor = vec4(uColor, a * uFade);
      }`,
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), gridMat);
  grid.rotation.x = -Math.PI / 2; grid.position.y = 0.004; grid.renderOrder = 3; scene.add(grid);
  const shadowCatch = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.ShadowMaterial({ opacity: 0.5, depthWrite: false }));
  shadowCatch.rotation.x = -Math.PI / 2; shadowCatch.position.y = 0.002; shadowCatch.receiveShadow = true; shadowCatch.visible = !mobile; scene.add(shadowCatch);
  // baked contact shadow (the only shadow on phones)
  const cc = document.createElement('canvas'); cc.width = cc.height = 128; const cx = cc.getContext('2d');
  const rg = cx.createRadialGradient(64, 64, 6, 64, 64, 64); rg.addColorStop(0, 'rgba(3,6,16,0.75)'); rg.addColorStop(0.55, 'rgba(3,6,16,0.35)'); rg.addColorStop(1, 'rgba(3,6,16,0)');
  cx.fillStyle = rg; cx.fillRect(0, 0, 128, 128);
  const contactTex = new THREE.CanvasTexture(cc);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(26, 19), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, opacity: mobile ? 1 : 0.8, toneMapped: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.set(0.6, 0.006, 0.4); contact.renderOrder = 2; scene.add(contact);

  // soil as a section block, its cut face hatched
  const hc = document.createElement('canvas'); hc.width = hc.height = 128; const hx = hc.getContext('2d');
  hx.fillStyle = '#2c2f3a'; hx.fillRect(0, 0, 128, 128); hx.strokeStyle = 'rgba(154,166,200,0.45)'; hx.lineWidth = 2;
  for (let i = -128; i < 256; i += 16) { hx.beginPath(); hx.moveTo(i, 128); hx.lineTo(i + 128, 0); hx.stroke(); }
  const hatch = new THREE.CanvasTexture(hc); hatch.wrapS = hatch.wrapT = THREE.RepeatWrapping; hatch.repeat.set(22 / 1.6, 4.2 / 1.6); hatch.colorSpace = THREE.SRGBColorSpace;
  const PO = { depthWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 };
  const soilMat = makeMat(C.soil, { opacity: 0.3, ...PO });
  const soilCut = makeMat(0xffffff, { map: hatch, opacity: 0.6, ...PO });
  const soilTop = makeMat(C.soil, { opacity: 0.5, ...PO });
  const soil = new THREE.Mesh(new THREE.BoxGeometry(24, 4.2, 12), [soilMat, soilMat, soilTop, soilMat, soilCut, soilMat]);
  soil.position.set(1.5, -2.1, -0.5); soil.renderOrder = 1; scene.add(soil);
  const soilEdges = new THREE.LineSegments(new THREE.EdgesGeometry(soil.geometry), new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0.3 }));
  soil.add(soilEdges);

  const site = new THREE.Group(); scene.add(site);
  const sh = shell(); site.add(sh.group);
  const plan = planDrawing(); scene.add(plan.group);
  const comps = [stripOut(), alterations(), drilling(), groundworks(), steelwork(), carpentry(), composite(), landscaping(), screeding()];
  comps.forEach((c) => site.add(c.group));

  // ---- framing boxes, measured once from the built model
  const tb = new THREE.Box3();
  const visBox = (obj, out) => {
    obj.updateMatrixWorld(true); out.makeEmpty();
    obj.traverseVisible((n) => { if (n.isMesh && n.geometry) { if (!n.geometry.boundingBox) n.geometry.computeBoundingBox(); tb.copy(n.geometry.boundingBox).applyMatrix4(n.matrixWorld); out.union(tb); } });
    return out;
  };
  sh.update(1);
  const B_HERO = visBox(sh.group, new THREE.Box3()); B_HERO.min.y = Math.min(B_HERO.min.y, -1.4);
  comps.forEach((c) => { c.update(c.existing ? 0 : 1, c.existing ? 0 : 1); c.group.visible = true; });
  const B_COMP = comps.map((c) => visBox(c.group, new THREE.Box3()).expandByScalar(0.4));
  comps.forEach((c) => c.update(1, 9));
  const B_FINAL = visBox(site, new THREE.Box3()).union(new THREE.Box3(new THREE.Vector3(-10.5, -1.6, -6.5), new THREE.Vector3(13.5, 0, 5.5)));
  const B_PLAN = new THREE.Box3(new THREE.Vector3(-10.4, 0, -7.9), new THREE.Vector3(9.6, 0, 7));
  const SP = sph(PLAN), SK = KEYS.map(sph);
  B_HERO.getCenter(SK[0].t); B_FINAL.getCenter(SK[10].t);
  const fm = KEYS.map(() => 1); let fmPlan = 1;

  // ---- state
  let target = 0, p = 0, eTarget = 0, e = 0, first = true, hover = -1;
  const hov = comps.map(() => 0);
  let w = 1, h = 1, active = false, raf = 0, last = 0, dirty = true, destroyed = false;
  const curS = { r: 1, phi: 0, th: 0, t: new THREE.Vector3(), z: 1 };
  const tmpS = { r: 1, phi: 0, th: 0, t: new THREE.Vector3(), z: 1 };
  const v = new THREE.Vector3();
  let X = 0, step = 0, finalK = 0, shadowSig = NaN;
  const portraitNow = () => w < 900 && h > w * 1.1;
  const region = () => (portraitNow() ? R_PORT : R_LAND);
  const farOf = () => (portraitNow() ? (w < 500 ? 3.05 : 2.6) : w < 700 ? 2.0 : w < 1000 ? 1.6 : w < 1300 ? 1.42 : 1.28);
  // distance multiplier that fits box into the safe region from camera key S (closed form:
  // dolly back along the view axis until every corner's projection sits inside the region)
  const _c = new THREE.Vector3();
  function fitMul(S, box, R, pushOnly, orbit = 0) {
    const r = S.r * S.z * farOf(), th = S.th + orbit;
    v.set(Math.sin(S.phi) * Math.sin(th), Math.cos(S.phi), Math.sin(S.phi) * Math.cos(th)).multiplyScalar(r);
    cam.position.copy(S.t).add(v); cam.lookAt(S.t); cam.updateMatrixWorld(true);
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), tanH = tanV * (w / h);
    const hx = R.x1 - R.x0, hy = R.y1 - R.y0;
    let need = -Infinity;
    for (let i = 0; i < 8; i++) {
      _c.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(cam.matrixWorldInverse);
      const d = -_c.z;
      need = Math.max(need, Math.abs(_c.x) / (tanH * hx) - d, Math.abs(_c.y) / (tanV * hy) - d);
    }
    const m = (r + need) / r;
    return pushOnly ? Math.max(1, m) : Math.max(0.35, m);
  }
  function fitAll() {
    const R = region();
    fmPlan = fitMul(SP, B_PLAN, R, false);
    fm[0] = fitMul(SK[0], B_HERO, R, false);
    for (let k = 1; k <= 9; k++) fm[k] = fitMul(SK[k], B_COMP[k - 1], R, true);
    fm[10] = fitMul(SK[10], B_FINAL, R, false, FINAL_ORBIT);
  }
  const cutOf = (k) => (k >= 1 && k <= 9 && comps[k - 1].cut) || 17;

  function apply() {
    X = p * TOTAL;
    const { i, u } = slice(X);
    let extr = 1, cut = 17, drawF = 0.32, orbit = 0, dip = 0, fit = 1;
    if (i === 0) { interp(SP, SP, 0, curS); extr = 0; drawF = 1; fit = fmPlan; }
    else if (i === 1) {
      const f = ease(clamp01(u / 0.9));
      interp(SP, SK[0], f, curS); dip = Math.sin(Math.PI * f) * 0.08; fit = lerp(fmPlan, fm[0], f);
      extr = clamp01((u - 0.08) / 0.78);
      drawF = lerp(1, 0.32, clamp01((u - 0.1) / 0.6));
    } else if (i <= 10) {
      const k = i - 1; const f = ease(clamp01(u / TRAVEL));
      interp(SK[k - 1], SK[k], f, curS); fit = lerp(fm[k - 1], fm[k], f);
      cut = lerp(cutOf(k - 1), cutOf(k), f);
    } else {
      const f = ease(clamp01(u / 0.42));
      interp(SK[9], SK[10], f, curS); fit = lerp(fm[9], fm[10], f);
      cut = lerp(cutOf(9), 17, f);
      orbit = ease(clamp01((u - 0.08) / 0.62)) * FINAL_ORBIT;
    }
    finalK = i === 11 ? clamp01((u - 0.3) / 0.25) : 0;
    // smaller screens back the camera off along its view line; fit keeps the safe frame
    const r = curS.r * curS.z * farOf() * fit * (1 - dip);
    const th = curS.th + orbit;
    v.set(Math.sin(curS.phi) * Math.sin(th), Math.cos(curS.phi), Math.sin(curS.phi) * Math.cos(th)).multiplyScalar(r);
    cam.position.copy(curS.t).add(v); cam.lookAt(curS.t);
    scene.fog.near = r * 1.15; scene.fog.far = r * 3.2;

    const k2 = cut > 16.9 ? 99 : cut;
    CUT.constant = k2;
    sh.update(extr);
    plan.update(e, drawF);
    const vis = extr > 0.97;
    const soilK = clamp01(extr / 0.3);
    soil.visible = soilK > 0.01;
    soilMat.opacity = 0.3 * soilK; soilCut.opacity = 0.6 * soilK; soilEdges.material.opacity = 0.3 * soilK;
    step = stepOf(X);
    soilTop.opacity = (step === 4 ? 0.16 : 0.5) * soilK;
    contact.material.opacity = (mobile ? 1 : 0.8) * easeOut(clamp01(extr / 0.4));
    // geometry signature: the shadow map re-renders only when the model itself changes,
    // never for camera travel or hover easing
    let sig = extr * 7.31 + k2 * 0.173 + (vis ? 1 : 0);
    let focus = 0;
    const ks = comps.map((c, n) => {
      const sx = START[n + 2];
      const k = clamp01((X - sx) / TRAVEL) - clamp01((X - sx - 1) / TRAVEL);
      focus = Math.max(focus, ease(k));
      return k;
    });
    focus *= 1 - finalK;
    SHELL.color.copy(SLAB).lerp(DIM, 0.3 * focus); SHELLW.color.copy(WALL).lerp(DIM, 0.3 * focus);
    comps.forEach((c, n) => {
      const sx = START[n + 2];
      const raw = (X - (sx + 0.3)) / 0.5;
      c.update(clamp01(raw), raw);
      sig += Math.min(2.5, Math.max(-0.01, raw)) * (n + 1.37) * 1.91;
      c.group.visible = vis;
      const done = clamp01((X - sx - 1) / TRAVEL);
      highlight(c.group, Math.max(ease(ks[n]), hov[n]), done, focus);
    });
    if (!(Math.abs(sig - shadowSig) < 1e-5)) { shadowSig = sig; renderer.shadowMap.needsUpdate = true; }
  }

  // the look-at point lands on the centre of the safe region
  const view = () => {
    const R = region();
    cam.setViewOffset(w, h, (0.5 - (R.x0 + R.x1) / 2) * w, (0.5 - (R.y0 + R.y1) / 2) * h, w, h);
    cam.updateProjectionMatrix();
  };

  const project = (pt) => { v.copy(pt).project(cam); return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h, v.z < 1]; };
  function render() {
    renderer.render(scene, cam);
    if (onFrame) {
      const c = step >= 1 && step <= 9 ? comps[step - 1] : null;
      onFrame({
        p, X, step, finalK,
        tag: c ? project(c.anchor) : null,
        pins: finalK > 0 ? comps.map((cc) => project(cc.anchor)) : null,
      });
    }
  }

  function loop(now) {
    raf = 0;
    if (!active || destroyed) return;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    const a = 1 - Math.exp(-dt * 8);
    let moving = false;
    if (p !== target) { const d = target - p; p = Math.abs(d) < 1e-5 ? target : p + d * a; moving = true; }
    if (e !== eTarget) { const d = eTarget - e; e = Math.abs(d) < 1e-4 ? eTarget : e + d * a; moving = true; }
    comps.forEach((c, n) => {
      const t = hover === n ? 1 : 0; const d = t - hov[n];
      if (Math.abs(d) > 0.002) { hov[n] += d * (1 - Math.exp(-dt * 9)); moving = true; } else if (hov[n] !== t) { hov[n] = t; moving = true; }
    });
    if (moving || dirty) { dirty = false; apply(); render(); }
    if (moving) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (raf || !active || destroyed) return; last = performance.now(); raf = requestAnimationFrame(loop); };
  const markDirty = () => { dirty = true; kick(); };

  function resize() {
    if (destroyed) return;
    w = Math.max(1, stage.clientWidth); h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h, false);
    cam.aspect = w / h; view(); fitAll();
    markDirty();
  }

  resize();
  apply();

  // warm-up while idle: compile programs with the whole model built, then restore
  const warm = () => {
    if (destroyed) return;
    try {
      sh.update(1); comps.forEach((c) => { c.update(1, 1); c.group.visible = true; });
      renderer.compile(scene, cam);
    } catch (err) { /* the first visible frame compiles instead */ }
    apply(); dirty = true; kick();
  };
  const idle = 'requestIdleCallback' in window ? requestIdleCallback(warm, { timeout: 1200 }) : setTimeout(warm, 120);

  if (import.meta.env.DEV) window.__wowBuild = { scene, cam, comps, renderer, get p() { return p; } };

  return {
    canvas,
    setProgress(v2) { target = clamp01(v2); if (first) { p = target; first = false; } markDirty(); },
    setEntry(v2) { eTarget = clamp01(v2); markDirty(); },
    setHover(n) { hover = n; markDirty(); },
    setActive(b) { active = !!b; if (active) markDirty(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    resize,
    dispose() {
      destroyed = true; if (raf) cancelAnimationFrame(raf); raf = 0;
      if ('cancelIdleCallback' in window) cancelIdleCallback(idle); else clearTimeout(idle);
      const mats = new Set();
      scene.traverse((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => mats.add(m));
      });
      mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      [hatch, contactTex, NOISE].forEach((t) => t.dispose());
      envRT.dispose();
      if (key.shadow.map) key.shadow.map.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (err) { /* gone already */ }
      canvas.remove();
      if (import.meta.env.DEV) delete window.__wowBuild;
    },
  };
}
