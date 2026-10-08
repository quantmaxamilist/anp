// ANP v5 core: smooth scroll, cursor, magnetics, page transitions, header, reveals, menu.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const mq = (q) => matchMedia(q).matches;
const reduced = mq('(prefers-reduced-motion: reduce)');
const fine = mq('(hover: hover) and (pointer: fine)');
const touch = !fine || mq('(pointer: coarse)');

// ---- Lenis -----------------------------------------------------------------
const lenis = reduced ? null : new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
window.__anp = { lenis, gsap, ScrollTrigger, reduced, touch };

export const scrollToY = (target, opts = {}) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.2, ...opts });
  else {
    const y = typeof target === 'number' ? target : (target.getBoundingClientRect().top + scrollY + (opts.offset || 0));
    scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
};

// Same-page hash links go through Lenis
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const url = new URL(a.href, location.href);
  if (url.pathname === location.pathname && url.search === location.search && url.hash && url.hash.length > 1) {
    const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    closeMenu?.();
    scrollToY(el, { offset: 0 });
    history.replaceState(null, '', url.hash);
  }
});
document.querySelectorAll('[data-top]').forEach((b) => b.addEventListener('click', () => scrollToY(0)));

// ---- Cursor ------------------------------------------------------------------
const cursor = document.getElementById('cursor');
if (fine && !reduced && cursor) {
  html.classList.add('has-cursor');
  const dot = cursor.querySelector('.cursor__dot');
  const ring = cursor.querySelector('.cursor__ring');
  const label = cursor.querySelector('.cursor__label');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
  cursor.classList.add('is-off');
  let lastTarget = null;
  const update = (t) => {
    if (t === lastTarget) return;
    lastTarget = t;
    const s = t?.closest?.('[data-cursor]');
    let state = s ? s.dataset.cursor : '';
    if (!state && t?.closest?.('a, button, label, [role="button"], summary')) state = 'link';
    if (t?.closest?.('input:not([type="checkbox"]), textarea, select')) state = 'hide';
    cursor.dataset.state = state;
    label.textContent = state === 'drag' ? 'Drag' : state === 'view' ? 'View' : '';
    const th = t?.closest?.('[data-cursor-theme]');
    cursor.dataset.theme = th ? th.dataset.cursorTheme : 'dark';
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    cursor.classList.remove('is-off');
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    update(e.target);
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-off'));
  addEventListener('blur', () => cursor.classList.add('is-off'));
  addEventListener('scroll', () => { lastTarget = null; }, { passive: true });
}

// ---- Magnetic ------------------------------------------------------------------
if (fine && !reduced) {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const inner = el.querySelector('[data-magnetic-inner]');
    const xT = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
    const yT = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
    const xI = inner && gsap.quickTo(inner, 'x', { duration: 0.4, ease: 'power3.out' });
    const yI = inner && gsap.quickTo(inner, 'y', { duration: 0.4, ease: 'power3.out' });
    let r = null;
    el.addEventListener('pointerenter', () => { r = el.getBoundingClientRect(); });
    el.addEventListener('pointermove', (e) => {
      if (!r) r = el.getBoundingClientRect();
      const ox = e.clientX - (r.left + r.width / 2);
      const oy = e.clientY - (r.top + r.height / 2);
      xT(ox * 0.35); yT(oy * 0.35);
      if (inner) { xI(ox * 0.18); yI(oy * 0.18); }
    });
    el.addEventListener('pointerleave', () => {
      r = null;
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)', overwrite: true });
      if (inner) gsap.to(inner, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)', overwrite: true });
    });
  });
}

// ---- Page transitions -------------------------------------------------------------
const pt = document.getElementById('pt');
const ptPaths = pt ? [...pt.querySelectorAll('path')] : [];
let arriving = html.classList.contains('pt-arrive');
try { sessionStorage.removeItem('anp:pt'); } catch { /* ignore */ }

const arrive = () => {
  if (!pt) return Promise.resolve();
  return new Promise((res) => {
    if (reduced) {
      gsap.to(pt, { opacity: 0, duration: 0.15, onComplete: () => { html.classList.remove('pt-arrive'); gsap.set(pt, { clearProps: 'all' }); res(); } });
      return;
    }
    gsap.set(ptPaths, { strokeDasharray: 1, strokeDashoffset: 0 });
    gsap.timeline({ onComplete: () => { html.classList.remove('pt-arrive'); gsap.set([pt, ...ptPaths], { clearProps: 'all' }); res(); } })
      .to(ptPaths, { opacity: 0, duration: 0.25 })
      .fromTo(pt, { clipPath: 'inset(0% 0 0% 0)' }, { clipPath: 'inset(0% 0 100% 0)', duration: 0.7, ease: 'power3.inOut' }, 0.15);
  });
};
export const arrived = arriving ? arrive() : Promise.resolve();
window.__anp.arrived = arrived;
window.__anp.wasArrive = arriving;

const isInternal = (a, e) => {
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if (a.target && a.target !== '_self') return false;
  if (a.hasAttribute('download') || a.dataset.noTransition !== undefined) return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return false;
  if (url.pathname === location.pathname && url.search === location.search) return false; // hash or same page
  if (!/^https?:/.test(url.protocol)) return false;
  return url;
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  const url = isInternal(a, e);
  if (!url || !pt) return;
  e.preventDefault();
  const go = () => {
    try { sessionStorage.setItem('anp:pt', '1'); } catch { /* ignore */ }
    document.dispatchEvent(new CustomEvent('anp:leave'));
    location.href = url.href;
  };
  pt.style.visibility = 'visible';
  if (reduced) {
    gsap.fromTo(pt, { clipPath: 'inset(0)', opacity: 0 }, { opacity: 1, duration: 0.15, onComplete: go });
    return;
  }
  gsap.set(ptPaths, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 1 });
  gsap.timeline({ onComplete: go })
    .fromTo(pt, { clipPath: 'inset(100% 0 0% 0)' }, { clipPath: 'inset(0% 0 0% 0)', duration: 0.7, ease: 'power3.inOut' })
    .to(ptPaths, { strokeDashoffset: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out' }, 0.25);
});
addEventListener('pageshow', (e) => {
  if (e.persisted && pt) {
    html.classList.remove('pt-arrive');
    gsap.killTweensOf(pt);
    gsap.set([pt, ...ptPaths], { clearProps: 'all' });
  }
});

// ---- Header ---------------------------------------------------------------------
const hdr = document.getElementById('hdr');
if (hdr) {
  let lastY = scrollY;
  let hidden = false;
  let wowOn = false;
  const menuOpen = () => document.getElementById('menu')?.classList.contains('is-open');
  // While the homepage wow is pinned the header (and its "Send a tender") stays visible: the wow runs
  // 4–9 screens and must never leave a package manager without a way to send a tender.
  // Any long pinned stage can opt in with data-hold-header (e.g. The Build on /services).
  const holds = [...document.querySelectorAll('[data-wow-slot], [data-hold-header]')];
  const inWow = () => holds.some((el) => {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5;
  });
  const onScroll = (y) => {
    hdr.classList.toggle('is-solid', y > 100);
    const w = inWow();
    if (w !== wowOn) { wowOn = w; hdr.classList.toggle('is-wow', w); }
    const down = y > lastY + 2;
    const up = y < lastY - 2;
    if (!reduced && !menuOpen() && !hdr.contains(document.activeElement)) {
      if (down && y > 400 && !hidden && !w) { hidden = true; gsap.to(hdr, { yPercent: -105, duration: 0.5, ease: 'power3.out' }); }
      else if ((up || y < 400 || w) && hidden) { hidden = false; gsap.to(hdr, { yPercent: 0, duration: 0.5, ease: 'power3.out' }); }
    }
    lastY = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  hdr.addEventListener('focusin', () => { if (hidden) { hidden = false; gsap.to(hdr, { yPercent: 0, duration: 0.3 }); } });
  onScroll(scrollY);

  // theme from the section under the header line
  const themed = [...document.querySelectorAll('[data-header-theme]')];
  const setTheme = () => {
    const y = hdr.offsetHeight * 0.5;
    let theme = 'dark';
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) theme = s.dataset.headerTheme;
    }
    if (hdr.dataset.theme !== theme) hdr.dataset.theme = theme;
  };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: setTheme });
  addEventListener('resize', setTheme);
  setTheme();
}

// ---- Mobile menu ------------------------------------------------------------------
const menu = document.getElementById('menu');
const openBtn = document.querySelector('[data-menu-open]');
let closeMenu = null;
if (menu && openBtn) {
  const focusables = () => [...menu.querySelectorAll('a[href], button:not([disabled])')];
  let tl = null;
  const lines = [...menu.querySelectorAll('.line > span')];
  const nums = [...menu.querySelectorAll('.menu__n')];
  const markPaths = [...menu.querySelectorAll('.menu__mark path')];
  const open = () => {
    menu.hidden = false;
    menu.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    if (!reduced) {
      tl?.kill();
      gsap.set(markPaths, { strokeDasharray: 1, strokeDashoffset: 1 });
      tl = gsap.timeline()
        .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power3.inOut' })
        .fromTo(lines, { yPercent: 110, rotate: 2 }, { yPercent: 0, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06 }, 0.35)
        .fromTo(nums, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.06 }, 0.5)
        .to(markPaths, { strokeDashoffset: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out' }, 0.4);
    } else gsap.set(menu, { clipPath: 'none' });
    requestAnimationFrame(() => focusables()[0]?.focus());
  };
  closeMenu = () => {
    if (menu.hidden) return;
    openBtn.setAttribute('aria-expanded', 'false');
    lenis?.start();
    document.body.style.overflow = '';
    const done = () => { menu.hidden = true; menu.classList.remove('is-open'); gsap.set(menu, { clearProps: 'clipPath' }); };
    if (reduced) done();
    else { tl?.kill(); gsap.to(menu, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.6, ease: 'power3.inOut', onComplete: done }); }
    openBtn.focus();
  };
  openBtn.addEventListener('click', open);
  menu.querySelector('[data-menu-close]')?.addEventListener('click', () => closeMenu());
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  addEventListener('resize', () => { if (innerWidth >= 1100) closeMenu(); });
  // Back/forward from a page left via a menu link: bfcache restores the menu open with Lenis stopped.
  addEventListener('pageshow', (e) => {
    if (!e.persisted || menu.hidden) return;
    tl?.kill();
    gsap.killTweensOf(menu);
    menu.hidden = true; menu.classList.remove('is-open'); gsap.set(menu, { clearProps: 'clipPath' });
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    lenis?.start();
  });
}

// ---- Reveals ------------------------------------------------------------------------
const revealOne = (el) => {
  const kind = el.dataset.reveal;
  if (kind === 'lines') {
    return gsap.fromTo(el.querySelectorAll('.line > span'), { y: 0, yPercent: 110, rotate: 2 }, { yPercent: 0, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: +(el.dataset.delay || 0) });
  }
  if (kind === 'fade') {
    return gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: +(el.dataset.delay || 0) });
  }
  if (kind === 'datum') { el.classList.add('is-in'); return null; }
  if (kind === 'draw') {
    const paths = el.querySelectorAll('path');
    return gsap.fromTo(paths, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: 'expo.out', stagger: 0.12, delay: +(el.dataset.delay || 0) });
  }
  if (kind === 'photo') {
    const img = el.querySelector('img, video');
    let pour = el.querySelector(':scope > .pour');
    if (!pour) { pour = document.createElement('i'); pour.className = 'pour'; el.appendChild(pour); }
    const tl = gsap.timeline({ delay: +(el.dataset.delay || 0) });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power3.inOut' })
      .fromTo(pour, { top: '100%', opacity: 1 }, { top: '0%', duration: 1.2, ease: 'power3.inOut' }, 0)
      .to(pour, { opacity: 0, duration: 0.3 }, 1.0);
    if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0.1);
    return tl;
  }
  return null;
};
export const initReveals = (root = document) => {
  const els = [...root.querySelectorAll('[data-reveal]')].filter((el) => !el.dataset.revealManual);
  if (reduced) {
    els.forEach((el) => { if (el.dataset.reveal === 'datum') el.classList.add('is-in'); });
    return;
  }
  els.forEach((el) => {
    // Page-hero items already on screen at load (e.g. the lead/CTAs below the 85% line on tall
    // viewports) reveal now instead of waiting for a scroll.
    if (el.closest('.ph')) {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) { revealOne(el); return; }
    }
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => revealOne(el) });
  });
};
window.__anp.reveal = revealOne;

// Boot after arrive so the first reveals are seen
arrived.then(() => {
  initReveals();
  document.dispatchEvent(new CustomEvent('anp:ready'));
  window.__anp.ready = true;
});
addEventListener('load', () => ScrollTrigger.refresh());
