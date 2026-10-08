// Homepage choreography: hero intro (home-hero.js) + exit, trades curtain + chapters, projects drag, proof.
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
// TRADES INTRO: statement words + curtain
// =============================================================================
const tintro = $('[data-tintro]');
if (tintro) {
  const setTop = () => { tintro.style.setProperty('--tintro-top', `${Math.min(0, innerHeight - tintro.offsetHeight)}px`); };
  setTop();
  addEventListener('resize', setTop);
  if (!reduced) {
    const words = $$('[data-words] > span', tintro);
    gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: $('[data-words]', tintro), start: 'top 82%', end: 'bottom 45%', scrub: true },
    });
  }
}

// =============================================================================
// TRADES CHAPTERS
// =============================================================================
const ch = $('[data-chapters]');
if (ch && !reduced) {
  // Everything here is a pure function of ONE scroll progress, so it tracks the scroll exactly in both
  // directions: no time-based tweens, no flip-flopping at chapter boundaries. Each chapter holds on a
  // dwell plateau; between plateaus the photo panel wipes up (transforms only), the numeral strip
  // rolls, and the outgoing text slides/fades out before the incoming text slides/fades in.
  const N = 9;
  const phs = $$('[data-ch-ph]', ch);
  const imgs = phs.map((p) => $('img', p));
  const shades = phs.map((p) => $('[data-ch-shade]', p));
  const edges = phs.map((p) => $('[data-ch-edge]', p));
  const insets = $$('[data-ch-inset]', ch);
  const blocks = $$('[data-ch-block]', ch);
  const parts = blocks.map((b) => [$('.ch__tag', b), ...$$('.line > span', b), $('.ch__quote', b), $('.ch__actions', b)].filter(Boolean));
  const ticks = $$('[data-ch-go]', ch);
  const strip = $('[data-ch-strip]', ch);
  const DWELL = 0.5; // share of each chapter's scroll slice spent holding still
  const half = DWELL / 2;
  let active = -1;

  // curtain radius flattens as the stage reaches the top; intro recedes
  gsap.fromTo(ch, { '--ch-r': '14px' }, {
    '--ch-r': '0px', ease: 'none',
    scrollTrigger: { trigger: ch, start: 'top 60%', end: 'top top', scrub: true },
  });
  if (tintro) {
    gsap.to(tintro, {
      scale: 0.94, opacity: 0.35, ease: 'power1.in',
      scrollTrigger: { trigger: ch, start: 'top 55%', end: 'top top', scrub: true },
    });
  }

  // write a style only when its value actually changes
  const memo = new WeakMap();
  const put = (el, prop, v) => {
    if (!el) return;
    let m = memo.get(el);
    if (!m) memo.set(el, (m = {}));
    if (m[prop] !== v) { m[prop] = v; el.style[prop] = v; }
  };
  const c01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const f2 = (v) => (Math.round(v * 100) / 100).toString();
  const f3 = (v) => (Math.round(v * 1000) / 1000).toString();
  const io = gsap.parseEase('power2.inOut');
  const eo = gsap.parseEase('power3.out');
  const ei = gsap.parseEase('power2.in');

  // transition progress INTO chapter i (0 → 1) at chapter-time t; chapter 0 is always in, nothing follows the last
  const wipe = (t, i) => {
    if (i <= 0) return 1;
    if (i >= N) return 0;
    return c01((t - (i - 1) - half) / (1 - DWELL));
  };

  // pre-load + decode the neighbouring photos so a wipe never reveals an undecoded image
  const warm = (i) => {
    const im = imgs[i];
    if (!im || im.dataset.warm) return;
    im.dataset.warm = '1';
    im.loading = 'eager';
    im.decode?.().catch(() => {});
  };

  const setActive = (idx) => {
    if (idx === active) return;
    active = idx;
    blocks.forEach((b, i) => { b.inert = i !== idx; });
    ticks.forEach((t, i) => t.classList.toggle('is-on', i === idx));
    warm(idx + 1); warm(idx + 2); warm(idx - 1);
  };

  const render = (p) => {
    const t = Math.min(N - 1, Math.max(0, p * (N - 1)));
    let T = 0; // eased chapter position (plateaus at integers)
    for (let i = 0; i < N; i++) {
      const a = wipe(t, i);
      const b = wipe(t, i + 1);
      const wIn = io(a);
      const wOut = io(b);
      if (i) T += wIn;

      // photo: panel rises, photo counter-translates (stays put on screen), outgoing photo darkens + drifts
      const shown = a > 0 && b < 1;
      put(phs[i], 'visibility', shown ? 'visible' : 'hidden');
      if (shown) {
        put(phs[i], 'transform', `translate3d(0,${f2((1 - wIn) * 100)}%,0)`);
        put(imgs[i], 'transform', `translate3d(0,${f2(-(1 - wIn) * 100 - 8 * wOut)}%,0) scale(${f3(1.18 - 0.18 * wIn)})`);
        put(shades[i], 'opacity', f3(0.55 * wOut));
        put(edges[i], 'opacity', a > 0 && a < 1 ? '1' : '0');
      }

      // inset photo: crossfade + slide
      if (insets[i]) {
        const vIn = c01((a - 0.35) / 0.4);
        const vOut = c01((b - 0.35) / 0.4);
        put(insets[i], 'opacity', f3(vIn * (1 - vOut)));
        put(insets[i], 'transform', `translate3d(0,${f2((1 - eo(vIn)) * 40 - ei(vOut) * 24)}px,0)`);
      }

      // text: outgoing parts leave in the first half of the wipe, incoming parts arrive in the second
      const ps = parts[i];
      const n = ps.length;
      const st = Math.min(0.05, 0.2 / Math.max(1, n - 1));
      let any = false;
      for (let k = 0; k < n; k++) {
        const kIn = eo(c01((a - 0.42 - k * st) / 0.34));
        const kOut = ei(c01((b - k * st * 0.6) / 0.3));
        const el = ps[k];
        if (el.parentElement.classList.contains('line')) {
          // display lines: masked slide, translateY only
          put(el, 'transform', `translate3d(0,${f2((1 - kIn) * 105 - kOut * 105)}%,0)`);
          if (kIn > 0 && kOut < 1) any = true;
        } else {
          const o = kIn * (1 - kOut);
          put(el, 'opacity', f3(o));
          put(el, 'transform', `translate3d(0,${f2((1 - kIn) * 22 - kOut * 14)}px,0)`);
          if (o > 0) any = true;
        }
      }
      put(blocks[i], 'visibility', any ? 'visible' : 'hidden');
    }
    // numeral strip rolls continuously with the same eased position
    put(strip, 'transform', `translate3d(0,${f3(-(100 / N) * T)}%,0)`);
    setActive(Math.round(T));
  };

  const st = ScrollTrigger.create({
    trigger: ch, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => render(self.progress),
    onRefresh: (self) => render(self.progress),
  });
  // start fetching the first photos before the curtain arrives
  ScrollTrigger.create({ trigger: ch, start: 'top bottom+=100%', once: true, onEnter: () => { warm(0); warm(1); warm(2); } });
  render(0);

  ticks.forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.chGo;
    scrollTo(st.start + (st.end - st.start) * (i / (N - 1)) + 1);
  }));
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
