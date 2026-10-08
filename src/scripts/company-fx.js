// ANP v5 company pages (/about, /team, /careers): scroll-scrubbed details layered on core.js.
// - [data-co-words]   statement paragraph: word-by-word opacity 0.14 → 1, scrubbed
// - [data-co-parallax] photo frame: inner img drifts against the scroll
// - [data-co-fill]    display line: solid fill wipes over the outline, scrubbed
// - [data-co-draw]    svg mark: strokes draw in sequence across [data-co-draw-track]; [data-co-step] items set [data-co-count]
// - [data-co-drift]   grid items (desktop): columns drift at different speeds
// - [data-co-copy]    copy-to-clipboard button
// Reduced motion: nothing is split, hidden or scrubbed; CSS defaults are the finished state.

const splitWords = (el) => {
  if (el.dataset.coSplit) return el.querySelectorAll('.co-w');
  const text = el.textContent;
  el.textContent = '';
  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); return; }
    const s = document.createElement('span');
    s.className = 'co-w';
    s.textContent = part;
    el.appendChild(s);
  });
  el.dataset.coSplit = '1';
  return el.querySelectorAll('.co-w');
};

const initCopy = () => {
  document.querySelectorAll('[data-co-copy]').forEach((btn) => {
    const label = btn.querySelector('[data-co-copy-label]') || btn;
    const orig = label.textContent;
    btn.addEventListener('click', async () => {
      const value = btn.getAttribute('data-co-copy');
      let ok = false;
      try { await navigator.clipboard.writeText(value); ok = true; } catch (e) { ok = false; }
      label.textContent = ok ? 'Copied' : value;
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { label.textContent = orig; }, 2200);
    });
  });
};

const boot = () => {
  const A = window.__anp;
  initCopy();
  if (!A || !A.gsap || !A.ScrollTrigger) return;
  const { gsap, ScrollTrigger, reduced } = A;
  if (reduced) return;

  const ctx = gsap.context(() => {
    // Statements
    document.querySelectorAll('[data-co-words]').forEach((el) => {
      const words = splitWords(el);
      gsap.fromTo(words, { opacity: 0.14 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 84%', end: 'bottom 52%', scrub: true },
      });
    });

    // Photo parallax (the frame is the trigger; the img is oversized in CSS)
    document.querySelectorAll('[data-co-parallax]').forEach((frame) => {
      const img = frame.querySelector('img');
      if (!img) return;
      gsap.fromTo(img, { yPercent: -5 }, {
        yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Outline → fill wipes
    document.querySelectorAll('[data-co-fill]').forEach((row) => {
      const fill = row.querySelector('[data-co-fill-layer]');
      if (!fill) return;
      gsap.fromTo(fill, { clipPath: 'inset(0% 100% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
        scrollTrigger: { trigger: row, start: 'top 78%', end: 'top 38%', scrub: 0.6 },
      });
    });

    // Column drift (desktop only)
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      // Mark drawn across a track; step counter
      document.querySelectorAll('[data-co-draw]').forEach((svg) => {
        const track = svg.closest('[data-co-draw-track]') || svg;
        const paths = svg.querySelectorAll('path');
        const tl = gsap.timeline({ scrollTrigger: { trigger: track, start: 'top 35%', end: 'bottom 85%', scrub: 0.6 } });
        paths.forEach((p, i) => tl.fromTo(p, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', duration: 1 }, i * 0.8));
        const count = track.querySelector('[data-co-count]');
        if (count) {
          track.querySelectorAll('[data-co-step]').forEach((step) => {
            const set = () => { count.textContent = step.dataset.coStep; };
            ScrollTrigger.create({ trigger: step, start: 'top 60%', end: 'bottom 60%', onEnter: set, onEnterBack: set });
          });
        }
      });

      document.querySelectorAll('[data-co-drift]').forEach((el) => {
        const d = parseFloat(el.dataset.coDrift || '0');
        if (!d) return;
        gsap.fromTo(el, { y: d }, {
          y: -d, ease: 'none',
          scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    });
  });

  ScrollTrigger.refresh();
  document.addEventListener('anp:leave', () => ctx.revert(), { once: true });
};

if (window.__anp?.ready) boot();
else document.addEventListener('anp:ready', boot, { once: true });
