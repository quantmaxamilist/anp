// ANP v5 work pages: /clients (scrubbed name fill, register ↔ card links, staggered parallax grid, swipe track,
// word-by-word testimonials) and /additional-projects (client filters with ?client=, live count, animated reflow,
// staggered parallax grid). The lightbox itself is gallery.js; filters only toggle `hidden` on the cells.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { openLightbox } from './gallery.js';

gsap.registerPlugin(ScrollTrigger);

const A = () => window.__anp || {};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const triggers = [];
const mm = gsap.matchMedia();
const onReady = (fn) => {
  if (A().ready) fn();
  else document.addEventListener('anp:ready', fn, { once: true });
};
const refresh = () => (A().ScrollTrigger || ScrollTrigger).refresh();

// Smooth or instant programmatic scroll through Lenis when present.
const scrollToY = (y, immediate) => {
  const { lenis } = A();
  if (lenis) lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.1 });
  else scrollTo({ top: y, behavior: immediate || reduced ? 'auto' : 'smooth' });
};

// ---------------------------------------------------------------------------------------------------------
// /clients
// ---------------------------------------------------------------------------------------------------------
const chapters = [...document.querySelectorAll('[data-cl-chapter]')];

chapters.forEach((ch) => {
  const grid = ch.querySelector('[data-cl-grid]');
  const cells = [...ch.querySelectorAll('[data-cl-cell]')];
  const rows = [...ch.querySelectorAll('[data-cl-open], [data-cl-row]')];

  // Register rows light up their card; clicking a row opens that project in the lightbox.
  rows.forEach((row) => {
    const i = +(row.dataset.clOpen ?? row.dataset.clRow);
    const cell = cells[i];
    if (!cell) return;
    const on = () => { grid.classList.add('is-dim'); cell.classList.add('is-hot'); };
    const off = () => { grid.classList.remove('is-dim'); cell.classList.remove('is-hot'); };
    row.addEventListener('pointerenter', on);
    row.addEventListener('pointerleave', off);
    row.addEventListener('focus', on);
    row.addEventListener('blur', off);
    if (row.dataset.clOpen !== undefined) {
      row.addEventListener('click', () => {
        const item = cell.querySelector('[data-gallery-item]');
        if (item) { off(); openLightbox(grid, item); }
      });
    }
  });
  // And the reverse: hovering a card marks its register row.
  cells.forEach((cell, i) => {
    const row = rows.find((r) => +(r.dataset.clOpen ?? r.dataset.clRow) === i);
    if (!row) return;
    cell.addEventListener('pointerenter', () => row.classList.add('is-hot'));
    cell.addEventListener('pointerleave', () => row.classList.remove('is-hot'));
  });

  // Phones: progress line under the swipe track.
  const bar = ch.querySelector('[data-cl-bar]');
  if (bar && grid) {
    const upd = () => {
      const max = grid.scrollWidth;
      bar.parentElement.style.setProperty('--cl-bar', max ? Math.min(1, (grid.scrollLeft + grid.clientWidth) / max).toFixed(3) : '1');
    };
    grid.addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    upd();
  }
});

const splitWords = (el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  return words.map((w, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = w;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    return s;
  });
};

if (chapters.length && !reduced) {
  onReady(() => {
    // The client name: the solid fill pours across the outline as the name scrolls through the viewport.
    document.querySelectorAll('[data-cl-name]').forEach((name) => {
      const tw = gsap.fromTo(name, { '--cl-p': 0 }, {
        '--cl-p': 1, ease: 'none',
        scrollTrigger: { trigger: name, start: 'top 82%', end: 'bottom 34%', scrub: 0.6 },
        onUpdate() { const p = this.progress(); name.classList.toggle('is-pouring', p > 0.004 && p < 0.996); },
      });
      triggers.push(tw.scrollTrigger);
    });

    // Testimonials: word-by-word opacity, scrubbed (the house statement move).
    document.querySelectorAll('[data-cl-words]').forEach((el) => {
      const words = splitWords(el);
      const tw = gsap.fromTo(words, { opacity: 0.16 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true },
      });
      triggers.push(tw.scrollTrigger);
    });

    // Desktop: the right-hand card column drifts against the left one.
    mm.add('(min-width: 900px)', () => {
      document.querySelectorAll('[data-cl-grid]').forEach((grid) => {
        if (grid.children.length < 2) return;
        gsap.fromTo(grid, { '--cl-par': 1 }, {
          '--cl-par': -1, ease: 'none',
          scrollTrigger: { trigger: grid, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    });
    refresh();
  });
}

// ---------------------------------------------------------------------------------------------------------
// /additional-projects
// ---------------------------------------------------------------------------------------------------------
const ap = document.querySelector('[data-ap]');
if (ap) {
  const grid = ap.querySelector('[data-ap-grid]');
  const cells = [...grid.querySelectorAll('.ap__cell')];
  const chips = [...ap.querySelectorAll('[data-ap-filter]')];
  const status = ap.querySelector('[data-ap-status]');
  const chipRow = ap.querySelector('.ap__chips');
  const bar = ap.querySelector('.ap__bar');
  const keys = new Set(chips.map((c) => c.dataset.apFilter));
  let current = 'all';
  let busy = null;

  const reindex = () => {
    let i = 0;
    cells.forEach((c) => {
      if (c.hidden) return;
      c.dataset.c3 = String(i % 3);
      c.dataset.c2 = String(i % 2);
      i++;
    });
    return i;
  };
  const say = (n) => { status.textContent = `${n} ${n === 1 ? 'project' : 'projects'}`; };

  const press = (key) => {
    chips.forEach((c) => {
      const on = c.dataset.apFilter === key;
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && chipRow.scrollWidth > chipRow.clientWidth) {
        const left = c.offsetLeft - (chipRow.clientWidth - c.offsetWidth) / 2;
        chipRow.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
      }
    });
  };

  const toggleCells = (key) => {
    cells.forEach((c) => { c.hidden = key !== 'all' && c.dataset.apClient !== key; });
    const n = reindex();
    say(n);
    return n;
  };

  const syncUrl = (key) => {
    const url = new URL(location.href);
    if (key === 'all') url.searchParams.delete('client'); else url.searchParams.set('client', key);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  };

  // If the grid's top has scrolled above the filter dock, bring it back under the dock.
  const settleScroll = () => {
    const dock = bar.getBoundingClientRect().bottom;
    const top = grid.getBoundingClientRect().top;
    if (top < dock) scrollToY(top + scrollY - dock - 8, true);
  };

  const apply = (key, animate = true) => {
    if (!keys.has(key)) key = 'all';
    if (key === current && animate) return;
    current = key;
    press(key);
    syncUrl(key);
    if (busy) { busy.kill(); busy = null; }
    if (reduced || !animate) {
      toggleCells(key);
      cells.forEach((c) => c.classList.add('is-in'));
      refresh();
      return;
    }
    busy = gsap.to(grid, {
      opacity: 0, y: 14, duration: 0.24, ease: 'power2.in',
      onComplete: () => {
        toggleCells(key);
        settleScroll();
        refresh();
        gsap.set(grid, { opacity: 1, y: 0 });
        const shown = cells.filter((c) => !c.hidden);
        shown.forEach((c) => c.classList.add('is-in'));
        const near = shown.filter((c) => c.getBoundingClientRect().top < innerHeight * 1.1);
        busy = gsap.fromTo(near.map((c) => c.firstElementChild), { y: 44, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06, clearProps: 'transform,opacity',
        });
      },
    });
  };

  chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.apFilter)));

  // ?client=<slug> (or the client's name) preselects a filter.
  const q = new URLSearchParams(location.search).get('client');
  if (q) {
    const k = q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (keys.has(k) && k !== 'all') apply(k, false);
  }

  if (reduced) {
    cells.forEach((c) => c.classList.add('is-in'));
  } else {
    // Safety net: never leave cards invisible if the reveal system doesn't boot.
    const fallback = setTimeout(() => cells.forEach((c) => c.classList.add('is-in')), 6000);
    onReady(() => {
      clearTimeout(fallback);
      ScrollTrigger.batch(cells, {
        start: 'top 92%', once: true,
        onEnter: (batch) => {
          const fresh = batch.filter((c) => !c.classList.contains('is-in'));
          fresh.forEach((c) => c.classList.add('is-in'));
          gsap.fromTo(fresh.map((c) => c.firstElementChild), { y: 56, opacity: 0 }, {
            y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity',
          });
        },
      });
      mm.add('(min-width: 560px)', () => {
        gsap.fromTo(grid, { '--ap-par': 1 }, {
          '--ap-par': -1, ease: 'none',
          scrollTrigger: { trigger: grid, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
      refresh();
    });
  }
}

// Page transition: drop our triggers before navigating away.
document.addEventListener('anp:leave', () => {
  triggers.forEach((t) => t?.kill());
});
