// WOW A, "The Build": light page wiring. Nothing heavy is built until the section is within
// 200% of the viewport (the module itself is fetched + parsed during idle time after load); then the three.js scene (wow-build-scene.js) is imported lazily.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { restP, TOTAL, START } from './wow-build-time.js';

gsap.registerPlugin(ScrollTrigger);

const root = document.querySelector('section.wow-build[data-wow="build"]');
if (root) { bindSkip(root); setup(root); }

// Skip works from the first frame (before the lazy scene exists): it jumps to #packages (the
// plain list that follows on /services) or, if the page has none, to the end of the section.
function bindSkip(root) {
  const skip = root.querySelector('[data-wow-build-skip]');
  if (!skip) return;
  skip.addEventListener('click', (ev) => {
    ev.preventDefault();
    const target = document.getElementById('packages');
    const lenis = window.__anp && window.__anp.lenis;
    if (target) {
      if (lenis) lenis.scrollTo(target, { duration: 1.2 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#packages');
      // move focus with the scroll so keyboard users land in the list
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    } else {
      const y = root.getBoundingClientRect().top + scrollY + root.offsetHeight - innerHeight + 1;
      if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
}

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

function setup(root) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // CSS shows the static poster
  if (!hasWebGL()) { root.classList.add('is-static'); return; }
  let io = new IntersectionObserver((es) => {
    if (!es.some((x) => x.isIntersecting)) return;
    io.disconnect(); io = null;
    init(root).catch(() => root.classList.add('is-static'));
  }, { rootMargin: '200% 0px' });
  io.observe(root);
  const pre = () => { import('./wow-build-scene.js').catch(() => {}); };
  const onLoad = () => ('requestIdleCallback' in window ? requestIdleCallback(pre, { timeout: 4000 }) : setTimeout(pre, 1500));
  if (document.readyState === 'complete') onLoad(); else window.addEventListener('load', onLoad, { once: true });
  // bfcache: a disposed scene re-initialises when the page is shown again
  window.addEventListener('pageshow', (ev) => { if (ev.persisted && root.dataset.wowBuildState === 'disposed') { root.dataset.wowBuildState = ''; setup(root); } }, { once: true });
}

async function init(root) {
  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];
  let data = [];
  try { data = JSON.parse(q('[data-wow-build-data]').textContent); } catch (e) { data = []; }
  const stage = q('.wow-build__stage');
  const gl = q('[data-wow-build-gl]');
  const mobile = matchMedia('(max-width: 899px), (pointer: coarse)').matches;
  const touch = matchMedia('(pointer: coarse)').matches;

  root.dataset.wowBuildState = 'loading';
  const mod = await import('./wow-build-scene.js');
  if (root.dataset.wowBuildState !== 'loading') return;
  const panel = q('[data-wow-build-panel]');
  const tagNo = q('[data-wow-build-no]');
  const tagTx = q('[data-wow-build-tagtext]');
  const title = q('[data-wow-build-title]');
  const quote = q('[data-wow-build-quote]');
  const link = q('[data-wow-build-link]');
  const count = q('[data-wow-build-count]');
  const digits = qa('[data-wow-build-digit]');
  const rail = qa('[data-wow-build-go]');
  const tag = q('[data-wow-build-tag]');
  const tagLabel = q('[data-wow-build-taglabel]');
  const pins = qa('[data-wow-build-pin]');
  const legend = qa('[data-wow-build-li]');
  const veil = q('[data-wow-build-veil]');
  const skip = q('[data-wow-build-skip]');
  const pad = (n) => String(n).padStart(2, '0');

  let shown = -1, pbox = null;
  const measure = () => {
    if (!panel) return;
    const s = stage.getBoundingClientRect(), b = panel.getBoundingClientRect();
    pbox = { l: b.left - s.left, t: b.top - s.top, r: b.right - s.left, b: b.bottom - s.top };
  };

  // runtime nodes carry the component's scope class so its scoped CSS applies to them
  const scope = [...title.classList].filter((c) => c.startsWith('astro-')).join(' ');
  const lineSet = (lines) => {
    const set = document.createElement('span'); set.className = `wow-build__tset ${scope}`;
    lines.forEach((l) => { const m = document.createElement('span'); m.className = `wow-build__line ${scope}`; const i = document.createElement('span'); i.className = scope; i.textContent = l; m.append(i); set.append(m); });
    return set;
  };
  const swapTitle = (lines, label) => {
    const old = title.querySelector('.wow-build__tset:not(.is-out)');
    const set = lineSet(lines);
    title.setAttribute('aria-label', label);
    title.append(set);
    const inner = set.querySelectorAll('.wow-build__line > span');
    if (old) {
      old.classList.add('is-out');
      gsap.killTweensOf(old.querySelectorAll('.wow-build__line > span'));
      gsap.to(old.querySelectorAll('.wow-build__line > span'), { yPercent: -110, duration: 0.45, ease: 'power3.in', stagger: 0.03, onComplete: () => old.remove() });
    }
    gsap.fromTo(inner, { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: old ? 0.3 : 0 });
  };
  const roll = (n) => {
    const s = pad(n);
    digits.forEach((d, i) => gsap.to(d, { yPercent: -10 * +s[i], duration: 0.9, ease: 'expo.out', overwrite: true }));
  };

  function setStep(step) {
    shown = step;
    const d = step >= 1 && step <= 9 ? data[step - 1] : null;
    root.classList.toggle('is-open', step === 0);
    root.classList.toggle('is-trade', !!d);
    root.classList.toggle('is-final', step === 10);
    if (d) {
      tagNo.textContent = `[ ${d.n} / 09 ]`;
      tagTx.textContent = d.tag;
      swapTitle(d.lines, d.name);
      gsap.fromTo(quote, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', delay: 0.18, overwrite: true });
      quote.textContent = d.quote;
      link.href = d.href;
      link.setAttribute('aria-label', `View service: ${d.name}`);
      if (count) count.textContent = `${d.n} / 09`;
      if (tagLabel) tagLabel.textContent = d.tag;
      roll(step);
    } else if (step === 0) {
      tagNo.textContent = '[ 09 ]'; tagTx.textContent = 'Trade packages';
      swapTitle(['09 Trade', 'packages'], '09 trade packages');
      quote.textContent = '';
      if (count) count.textContent = '00 / 09';
    } else {
      roll(9);
      if (count) count.textContent = '09 / 09';
    }
    rail.forEach((b) => {
      const i = +b.dataset.wowBuildGo;
      b.classList.toggle('is-on', i === step); b.classList.toggle('is-done', i < step);
      if (i === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    requestAnimationFrame(measure);
  }

  const varCache = new WeakMap();
  const setVar = (el, k, v) => {
    let m = varCache.get(el); if (!m) varCache.set(el, (m = {}));
    if (m[k] !== v) { m[k] = v; el.style.setProperty(k, v); }
  };
  const onFrame = ({ p, step, tag: tp, pins: pp, finalK }) => {
    if (step !== shown) setStep(step);
    if (tag) {
      if (tp && tp[2]) {
        const [x, y] = tp;
        tag.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        const lx = x + 40, ly = y - 40;
        const lw = tagLabel ? tagLabel.offsetWidth + 16 : 160;
        const hit = lx + lw > stage.clientWidth - 70 || ly < 90 || (pbox && x - 40 - lw < pbox.r && lx < pbox.r + 10 && ly + 20 > pbox.t && ly - 20 < pbox.b && x > pbox.r);
        tag.classList.toggle('is-flip', !!hit);
        // phones: the panel sits on top; drop the label when it would run into the panel
        tag.classList.toggle('is-down', !!(pbox && mobile && ly - 24 < pbox.b));
        tag.classList.add('is-on');
      } else tag.classList.remove('is-on');
    }
    if (pp) {
      pins.forEach((el, i) => {
        const [x, y] = pp[i];
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.classList.toggle('is-r', x > stage.clientWidth - 200);
      });
    }
    // write custom properties only when they change: a write on the section root restyles
    // its whole subtree, which is what made idle frames stutter
    setVar(root, '--wow-build-final', finalK.toFixed(3));
    if (skip) setVar(skip, '--wow-build-prog', p.toFixed(3));
    const s = p * TOTAL;
    rail.forEach((b) => setVar(b, '--wow-build-p', Math.min(1, Math.max(0, s - START[+b.dataset.wowBuildGo + 1])).toFixed(3)));
  };

  const scene = mod.mount(gl, { mobile, onFrame });
  if (!scene) { root.classList.add('is-static'); root.dataset.wowBuildState = ''; return; }
  root.classList.add('is-live');
  root.dataset.wowBuildState = 'live';
  scene.canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); teardown(); root.classList.add('is-static'); }, { once: true });

  const veilAt = (p) => { if (veil) veil.style.opacity = Math.min(1, Math.max(0, (p - 0.95) / 0.05)).toFixed(3); };
  const st = ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => { scene.setProgress(self.progress); veilAt(self.progress); },
  });
  const entry = ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'top top',
    onUpdate: (self) => scene.setEntry(self.progress),
  });
  ScrollTrigger.refresh();
  scene.setEntry(entry.progress); scene.setProgress(st.progress); veilAt(st.progress);

  // render only while on screen and the tab is visible
  let onScreen = false;
  const sync = () => scene.setActive(onScreen && !document.hidden);
  const vis = new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting; sync(); }, { rootMargin: '0px' });
  vis.observe(stage);
  document.addEventListener('visibilitychange', sync);

  // programmatic scroll: Lenis when the site has one, native smooth scroll otherwise
  const scrollToY = (y) => {
    const lenis = window.__anp && window.__anp.lenis;
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };
  const yAt = (p) => st.start + (st.end - st.start) * p;
  const onRail = (ev) => scrollToY(yAt(restP(+ev.currentTarget.dataset.wowBuildGo)));
  rail.forEach((b) => b.addEventListener('click', onRail));

  // finale: pins and legend light up their trade
  const hot = (n, on) => {
    scene.setHover(on ? n : -1);
    pins.forEach((el, i) => el.classList.toggle('is-hot', on && i === n));
    legend.forEach((el, i) => el.classList.toggle('is-hot', on && i === n));
  };
  const offs = [];
  [...pins, ...legend].forEach((el) => {
    const n = +el.dataset.wowBuildN;
    const on = () => hot(n, true), off = () => hot(n, false);
    el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
    el.addEventListener('focusin', on); el.addEventListener('focusout', off);
    offs.push(() => { el.removeEventListener('pointerenter', on); el.removeEventListener('pointerleave', off); el.removeEventListener('focusin', on); el.removeEventListener('focusout', off); });
  });

  // resize: debounced; phones ignore URL-bar height changes
  let rw = innerWidth, rh = innerHeight, rt = 0;
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const dw = Math.abs(innerWidth - rw), dh = Math.abs(innerHeight - rh);
      if (touch && dw === 0 && dh < 120) return;
      rw = innerWidth; rh = innerHeight;
      scene.resize(); measure();
    }, 150);
  };
  window.addEventListener('resize', onResize);

  let gone = false;
  function teardown() {
    if (gone) return; gone = true;
    st.kill(); entry.kill(); vis.disconnect();
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pagehide', teardown);
    document.removeEventListener('anp:leave', teardown);
    rail.forEach((b) => b.removeEventListener('click', onRail));
    offs.forEach((f) => f());
    clearTimeout(rt);
    scene.dispose();
    root.classList.remove('is-live');
    root.dataset.wowBuildState = 'disposed';
  }
  window.addEventListener('pagehide', teardown);
  document.addEventListener('anp:leave', teardown);

  sync();
}
