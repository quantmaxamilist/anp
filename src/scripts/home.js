// Homepage choreography: hero intro (home-hero.js) + exit, trades intro + trade index, projects drag, proof.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { arrived } from './core.js';
import { heroIntro } from './home-hero.js';

gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin);

const A = window.__anp || {};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const lenis = A.lenis;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const scrollTo = (y) => {
  if (lenis) lenis.scrollTo(y, { duration: 1.2 });
  else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
};

// =============================================================================
// HERO
// =============================================================================
const hero = $('.hero');
if (hero) {
  const lines = $$('[data-hero-line] > span', hero);
  const fades = $$('[data-hero-fade]', hero);
  const video = $('[data-hero-video]', hero);
  const frame = $('[data-hero-frame]', hero);
  const hdr = $('#hdr');
  const wdth = getComputedStyle(document.documentElement).getPropertyValue('--wdth-display').trim() || '100%';
  const conn = navigator.connection || {};
  const calm = reduced || hero.classList.contains('is-calm') || conn.saveData || /2g/.test(conn.effectiveType || '');
  hero.dataset.introRun = '1';

  if (calm) {
    // Reduced motion / Save-Data: the CSS runs a calm 360ms fade; headline already set.
    hero.classList.add('is-calm');
    hero.removeAttribute('data-intro');
  } else {
    // Intro: the ANP mark as a window onto the footage, scaling up past the camera (≤ ~2.6s, skippable)
    const tl = heroIntro(hero, { lines, fades, hdr, video, frame, wdth, fromArrive: !!A.wasArrive });
    if (tl) {
      let done = false;
      const skip = () => {
        if (!done && tl.progress() < 1) tl.progress(1);
        off();
      };
      const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
      const onScroll = () => { if (scrollY > 8) skip(); };
      const off = () => { done = true; evs.forEach((e) => removeEventListener(e, skip)); removeEventListener('scroll', onScroll); };
      evs.forEach((e) => addEventListener(e, skip, { passive: true }));
      addEventListener('scroll', onScroll, { passive: true });
      tl.eventCallback('onComplete', off);
      // Loaded part-way down the page (reload, deep link): no intro, straight to the end state.
      if (scrollY > innerHeight * 0.5) skip();
      else arrived.then(() => { if (!done) tl.play(); });
    }
  }

  if (!reduced) {
    // Scrubbed exit: frame insets, lines parallax up
    const mm = gsap.matchMedia();
    mm.add('(min-width: 0px)', () => {
      const exit = gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: () => `+=${hero.offsetHeight - innerHeight * 0.4}`, scrub: 0.6 },
      });
      exit.fromTo(frame, { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, { clipPath: 'inset(4% 4% 0% 4% round 18px)', ease: 'none' }, 0)
        .fromTo(video, { scale: 1 }, { scale: 1.06, ease: 'none', immediateRender: false }, 0);
      const hl = $$('[data-hero-line]', hero);
      hl.forEach((l, i) => {
        exit.to(l, { yPercent: -(60 * (1 + (hl.length - 1 - i) * 0.15)), ease: 'none' }, 0);
      });
      exit.to($('.hero__row', hero), { yPercent: -260, opacity: 0, ease: 'none' }, 0);
      exit.to($('.hero__bar', hero), { yPercent: -40, opacity: 0, ease: 'none' }, 0);
      exit.fromTo(frame, { opacity: 1 }, { opacity: 0.35, ease: 'power1.in', immediateRender: false }, 0.4);
    });

    // pause video offscreen
    if (video) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { const p = video.play(); p?.catch?.(() => {}); } else video.pause();
      }).observe(hero);
    }
  }
}

// =============================================================================
// TRADES INTRO: statement words light up as you scroll (scrubbed, so it tracks the scroll exactly)
// =============================================================================
const tintro = $('[data-tintro]');
if (tintro && !reduced) {
  const words = $$('[data-words] > span', tintro);
  gsap.fromTo(words, { opacity: 0.14 }, {
    opacity: 1, ease: 'none', stagger: 0.1,
    scrollTrigger: { trigger: $('[data-words]', tintro), start: 'top 82%', end: 'bottom 45%', scrub: true },
  });
}

// =============================================================================
// TRADE INDEX: the row crossing the middle of the screen (or under the pointer) drives the sticky
// photo + info panel. Rows never resize and the page is never pinned, so scrolling stays native-smooth;
// only opacity/colour crossfade.
// =============================================================================
const tx = $('[data-trades]');
if (tx) {
  const rows = $$('[data-tx-row]', tx);
  const imgs = $$('[data-tx-img]', tx);
  const infos = $$('[data-tx-info]', tx);
  const num = $('[data-tx-num]', tx);
  let active = 0;
  const warm = (i) => { const im = imgs[i]; if (im && im.loading === 'lazy') { im.loading = 'eager'; im.decode?.().catch(() => {}); } };
  const set = (i) => {
    if (i === active || i < 0 || i >= rows.length) return;
    rows[active].classList.remove('is-on'); imgs[active]?.classList.remove('is-on');
    if (infos[active]) { infos[active].classList.remove('is-on'); infos[active].inert = true; }
    active = i;
    rows[i].classList.add('is-on'); imgs[i]?.classList.add('is-on');
    if (infos[i]) { infos[i].classList.add('is-on'); infos[i].inert = false; }
    if (num) num.textContent = String(i + 1).padStart(2, '0');
    warm(i + 1); warm(i - 1);
  };
  const desktop = matchMedia('(min-width: 900px)');
  // middle band of the viewport: whichever row overlaps it is the active one
  const io = new IntersectionObserver((entries) => {
    if (!desktop.matches) return;
    entries.forEach((e) => { if (e.isIntersecting) set(rows.indexOf(e.target)); });
  }, { rootMargin: '-48% 0px -48% 0px' });
  rows.forEach((r, i) => {
    io.observe(r);
    if (fine) r.addEventListener('pointerenter', () => desktop.matches && set(i));
    r.addEventListener('focusin', () => set(i));
  });
  // start fetching the first photos a screen before the section arrives
  new IntersectionObserver((es, o) => { if (es.some((e) => e.isIntersecting)) { warm(0); warm(1); warm(2); o.disconnect(); } }, { rootMargin: '100% 0px' }).observe(tx);
}

// =============================================================================
// PROJECTS
// =============================================================================
const pj = $('#projects');
if (pj) {
  const vp = $('[data-pj-viewport]', pj);
  const track = $('[data-pj-track]', pj);
  const cards = $$('[data-pj-card]', pj);
  const bar = $('[data-pj-bar]', pj);
  const cur = $('[data-pj-cur]', pj);
  const total = cards.length;
  const setCount = (i) => { cur.textContent = String(i + 1).padStart(2, '0'); };

  // card reveal
  if (!reduced) {
    gsap.set(cards, { y: 60, opacity: 0 });
    ScrollTrigger.create({ trigger: vp, start: 'top 85%', once: true, onEnter: () => gsap.to(cards, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.06 }) });
  }

  if (fine && !reduced) {
    document.documentElement.classList.add('has-drag');
    const imgsIn = cards.map((c) => $('.pj__media img', c));
    const skew = gsap.quickTo(cards, 'skewX', { duration: 0.5, ease: 'power3.out' });
    let minX = 0;
    const calc = () => { minX = Math.min(0, vp.clientWidth - parseFloat(getComputedStyle(vp).paddingLeft) - parseFloat(getComputedStyle(vp).paddingRight) - track.scrollWidth); };
    calc();
    let lastX = 0; let lastT = performance.now();
    const onMove = function () {
      const x = gsap.getProperty(track, 'x');
      const now = performance.now();
      const v = (x - lastX) / Math.max(1, now - lastT) * 16;
      lastX = x; lastT = now;
      skew(gsap.utils.clamp(-6, 6, -v * 0.35));
      const prog = minX ? x / minX : 0;
      bar.style.transform = `scaleX(${0.08 + 0.92 * prog})`;
      imgsIn.forEach((im) => { if (im) im.style.transform = `translateX(${prog * -8}%)`; });
      const step = (cards[1]?.offsetLeft || 1) - (cards[0]?.offsetLeft || 0);
      setCount(Math.min(total - 1, Math.round(-x / step)));
    };
    const settle = () => skew(0);
    const [drag] = Draggable.create(track, {
      type: 'x', inertia: true, bounds: { minX, maxX: 0 }, edgeResistance: 0.85, dragClickables: true,
      allowContextMenu: true, minimumMovement: 6,
      onDrag: onMove, onThrowUpdate: onMove, onDragEnd: settle, onThrowComplete: settle,
      onPress() { calc(); this.applyBounds({ minX, maxX: 0 }); },
    });
    // suppress click after drag
    track.addEventListener('click', (e) => { if (drag.isDragging || Math.abs(drag.x - drag.startX) > 6) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    const go = (dir) => {
      calc();
      const step = (cards[1]?.offsetLeft || 0) - (cards[0]?.offsetLeft || 0);
      const x = gsap.getProperty(track, 'x');
      const target = gsap.utils.clamp(minX, 0, Math.round((x - dir * step) / step) * step);
      gsap.to(track, { x: target, duration: 0.9, ease: 'expo.out', onUpdate: () => { drag.update(); onMove(); }, onComplete: settle });
    };
    $('[data-pj-prev]', pj).addEventListener('click', () => go(-1));
    $('[data-pj-next]', pj).addEventListener('click', () => go(1));
    vp.addEventListener('wheel', (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();
      calc();
      const x = gsap.utils.clamp(minX, 0, gsap.getProperty(track, 'x') - dx);
      gsap.to(track, { x, duration: 0.5, ease: 'power3.out', overwrite: true, onUpdate: () => { drag.update(); onMove(); }, onComplete: settle });
    }, { passive: false });
    // keyboard focus brings card into view
    cards.forEach((c) => c.addEventListener('focusin', () => {
      calc();
      const target = gsap.utils.clamp(minX, 0, -c.offsetLeft);
      gsap.to(track, { x: target, duration: 0.8, ease: 'expo.out', onUpdate: () => { drag.update(); onMove(); } });
    }));
    addEventListener('resize', () => { calc(); drag.applyBounds({ minX, maxX: 0 }); });
    bar.style.transform = 'scaleX(0.08)';
  } else {
    // native scroller
    const update = () => {
      const max = vp.scrollWidth - vp.clientWidth;
      const prog = max ? vp.scrollLeft / max : 0;
      bar.style.transform = `scaleX(${0.08 + 0.92 * prog})`;
      const step = (cards[1]?.offsetLeft || 1) - (cards[0]?.offsetLeft || 0);
      setCount(Math.min(total - 1, Math.round(vp.scrollLeft / step)));
    };
    vp.addEventListener('scroll', update, { passive: true });
    update();
    const go = (dir) => {
      const step = (cards[1]?.offsetLeft || 0) - (cards[0]?.offsetLeft || 0);
      vp.scrollBy({ left: dir * step, behavior: reduced ? 'auto' : 'smooth' });
    };
    $('[data-pj-prev]', pj).addEventListener('click', () => go(-1));
    $('[data-pj-next]', pj).addEventListener('click', () => go(1));
  }
}

// =============================================================================
// PROOF: testimonials + marquee
// =============================================================================
const tq = $('[data-tq]');
if (tq) {
  const items = $$('[data-tq-item]', tq);
  const cur = $('[data-tq-cur]', tq);
  const bar = $('[data-tq-bar]', tq);
  // split each quote into measured lines
  const splitLines = (q) => {
    if (!q.dataset.text) q.dataset.text = q.textContent.trim().replace(/\s+/g, ' ');
    const text = q.dataset.text;
    const words = text.split(/\s+/);
    q.innerHTML = words.map((w) => `<span class="tq-w" style="display:inline-block">${w}</span>`).join(' ');
    const ws = $$('.tq-w', q);
    const rows = [];
    let top = null;
    ws.forEach((w) => { const t = w.offsetTop; if (t !== top) { rows.push([]); top = t; } rows[rows.length - 1].push(w.textContent); });
    q.innerHTML = rows.map((r) => `<span class="tq-line"><span>${r.join(' ')}</span></span>`).join('');
  };
  let i = 0;
  const show = (n, first = false) => {
    const prev = items[i];
    i = (n + items.length) % items.length;
    const next = items[i];
    cur.textContent = String(i + 1).padStart(2, '0');
    if (reduced || first) {
      items.forEach((x) => x.classList.toggle('is-on', x === next));
      return;
    }
    const outL = $$('.tq-line > span', prev);
    gsap.to([...outL, $('.tq__by', prev)], { yPercent: -110, opacity: 0, duration: 0.45, ease: 'power3.in', stagger: 0.03, onComplete: () => prev.classList.remove('is-on') });
    next.classList.add('is-on');
    gsap.fromTo([...$$('.tq-line > span', next), $('.tq__by', next)], { yPercent: 110, opacity: 1 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.3 });
  };
  const layout = () => { items.forEach((it) => { splitLines($('[data-tq-q]', it)); }); };
  document.fonts?.ready.then(layout);
  layout();
  show(0, true);
  let paused = false;
  let timer = null;
  const run = () => {
    if (reduced) return;
    timer?.kill();
    gsap.set(bar, { scaleX: 0 });
    timer = gsap.to(bar, { scaleX: 1, duration: 7, ease: 'none', onComplete: () => { show(i + 1); run(); } });
    if (paused) timer.pause();
  };
  ScrollTrigger.create({ trigger: tq, start: 'top 80%', once: true, onEnter: run });
  tq.addEventListener('pointerenter', () => { paused = true; timer?.pause(); });
  tq.addEventListener('pointerleave', () => { paused = false; timer?.resume(); });
  tq.addEventListener('focusin', () => { paused = true; timer?.pause(); });
  tq.addEventListener('focusout', () => { paused = false; timer?.resume(); });
  $('[data-tq-next]', tq).addEventListener('click', () => { show(i + 1); run(); });
  $('[data-tq-prev]', tq).addEventListener('click', () => { show(i - 1); run(); });
  let rw = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== rw) { rw = innerWidth; layout(); items.forEach((x) => gsap.set($$('.tq-line > span, .tq__by', x), { clearProps: 'all' })); } });
}

const mq = $('[data-mq]');
if (mq && !reduced) {
  const track = $('[data-mq-track]', mq);
  let x = 0; let dir = -1; let w = 0; let visible = false;
  const measure = () => { w = track.firstElementChild.offsetWidth; };
  measure();
  addEventListener('resize', measure);
  document.fonts?.ready.then(measure);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(mq);
  gsap.ticker.add((time, dt) => {
    if (!visible || !w) return;
    const v = lenis ? lenis.velocity : 0;
    if (v > 0.1) dir = -1; else if (v < -0.1) dir = 1;
    const speed = 0.06 + Math.min(3, Math.abs(v)) * 0.18;
    x += dir * speed * dt;
    if (x <= -w) x += w;
    if (x > 0) x -= w;
    track.style.transform = `translate3d(${x}px,0,0)`;
  });
}

ScrollTrigger.refresh();
