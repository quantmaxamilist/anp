// Homepage hero intro: the ANP-window move (ported from The Rise's window geometry).
// A navy-950 field with the ANP mark cut out as a window onto the live crane footage; the mark's
// beams draw in, the footage lights up through the panes, then the window scales up past the camera
// (through the upper-right pane's clear incircle) until the timelapse is full-bleed. The headline
// then rises with the line-mask + stretch reveal and the hero UI fades in. ≤ ~2.6s; any click,
// scroll or key skips to the end state. The first frame is painted by the inline script in Hero.astro.
import { gsap } from 'gsap';

const QUAD = [[562, 893], [731, 560], [897, 560], [897, 893]];
const FLAG = [[897, 560], [1065, 727], [897, 727]];
const BOX = { cx: 540 + 545 / 2, cy: 540 + 375 / 2, w: 545, h: 375 };
const INC = [833.5, 623.46]; // incentre of the upper-right pane (731,560 / 897,560 / 897,893)
const INR = 63.46 - 9.5; // clear incircle radius inside the 19-unit beams

const lerp = (a, b, t) => a + (b - a) * t;
const ioS = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/** Builds the intro timeline (paused). Returns { tl, skip } or null when there is nothing to run. */
export function heroIntro(hero, { lines, fades, hdr, video, frame, wdth, fromArrive }) {
  const svg = hero.querySelector('[data-hero-window]');
  if (!svg) return null;
  const veil = svg.querySelector('.hero__veil');
  const beams = svg.querySelector('.hero__beams');
  const beamPaths = [...beams.querySelectorAll('path')];

  // Geometry (same rules as the first-paint script in Hero.astro)
  let W = 0, H = 0, s0 = 1, sEnd = 10, P0x = 0, P0y = 0, Cx = 0, Cy = 0;
  const measure = () => {
    W = svg.clientWidth || innerWidth;
    H = svg.clientHeight || innerHeight;
    const portrait = matchMedia('(max-width: 899px), (pointer: coarse)').matches && H > W * 1.05;
    s0 = portrait ? Math.min((W * 0.74) / BOX.w, (H * 0.3) / BOX.h) : Math.min((W * 0.5) / BOX.w, (H * 0.46) / BOX.h);
    Cx = W / 2;
    Cy = H * 0.49;
    P0x = Cx + (INC[0] - BOX.cx) * s0;
    P0y = Cy + (INC[1] - BOX.cy) * s0;
    sEnd = (Math.hypot(W, H) / 2 / INR) * 1.12;
  };
  const tx = (x, y) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  const st = { u: 0 };
  const render = () => {
    const u = st.u;
    const s = s0 * Math.pow(sEnd / s0, Math.pow(u, 1.45));
    const k = ioS(u);
    const px = lerp(P0x, Cx, k);
    const py = lerp(P0y, Cy, k);
    const ox = px - INC[0] * s;
    const oy = py - INC[1] * s;
    const pt = ([x, y]) => tx(x * s + ox, y * s + oy);
    veil.setAttribute('d', `M-20 -20H${W + 20}V${H + 20}H-20Z M${QUAD.map(pt).join('L')}Z M${FLAG.map(pt).join('L')}Z`);
    beams.setAttribute('transform', `matrix(${s.toFixed(4)} 0 0 ${s.toFixed(4)} ${ox.toFixed(2)} ${oy.toFixed(2)})`);
  };
  measure();
  render();
  const onResize = () => { measure(); render(); };
  addEventListener('resize', onResize);

  gsap.set(lines, { y: 0, yPercent: 110, rotate: 2, fontStretch: '75%' });
  gsap.set(fades, { opacity: 0, y: 16 });
  if (hdr) gsap.set(hdr, { opacity: 0 });
  gsap.set(svg, { visibility: 'visible', autoAlpha: 1 });
  if (fromArrive) {
    gsap.set(beamPaths, { strokeDashoffset: 0 });
    gsap.set(frame, { opacity: 1 });
  } else {
    gsap.set(beamPaths, { strokeDashoffset: 1 });
    gsap.set(frame, { opacity: 0 });
  }
  hero.removeAttribute('data-intro');

  const tl = gsap.timeline({ paused: true, defaults: { overwrite: 'auto' } });
  // 1. The mark draws in; the footage lights up through its panes
  const t0 = fromArrive ? 0 : 0.66;
  if (!fromArrive) {
    tl.to(beamPaths, { strokeDashoffset: 0, duration: 0.7, stagger: 0.08, ease: 'expo.out' }, 0)
      .to(frame, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.18);
  }
  // 2. Scale-through: the window flies past the camera; the footage settles behind it
  const fly = 0.95;
  tl.fromTo(video, { scale: 1.2 }, { scale: 1, duration: fly + 0.9, ease: 'expo.out' }, t0 - 0.1)
    .to(st, { u: 1, duration: fly, ease: 'none', onUpdate: render }, t0)
    .set(svg, { autoAlpha: 0 }, t0 + fly)
    // 3. Headline: line-mask + stretch reveal; then the row, pills and header
    .to(lines, { yPercent: 0, rotate: 0, fontStretch: wdth, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, t0 + fly - 0.22)
    .to([...fades, hdr].filter(Boolean), { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, t0 + fly - 0.05)
    .add(() => {
      gsap.set(lines, { clearProps: 'fontStretch' });
      gsap.set(svg, { display: 'none' });
      removeEventListener('resize', onResize);
    });

  return tl;
}
