// Service pages: the first paragraph reads in word by word as it scrolls through (scrubbed opacity 0.14 -> 1).
// Reduced motion / no JS: the statement is simply fully visible.
const els = [...document.querySelectorAll('[data-sv-words]')];

function run() {
  const anp = window.__anp;
  if (!anp || anp.reduced || !els.length) return;
  const { gsap, ScrollTrigger } = anp;
  const tweens = els.map((el) => {
    const words = el.querySelectorAll('.sd-w');
    return gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true },
    });
  });
  const kill = () => tweens.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
  document.addEventListener('anp:leave', kill, { once: true });
  ScrollTrigger.refresh();
}

if (els.length) {
  if (window.__anp && window.__anp.ready) run();
  else document.addEventListener('anp:ready', run, { once: true });
}
