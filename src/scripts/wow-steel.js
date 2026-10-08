// WOW C "Steel Mark" loader. Only observes the section; three.js and the scene module are
// dynamically imported on first approach (rootMargin 150%). Hidden variants never intersect.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// 'section' qualifier: only the Steel Mark section itself carries data-wow="steel".
const root = document.querySelector('section[data-wow="steel"]');

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    return true;
  } catch (e) {
    return false;
  }
}

function skipTo(section) {
  const lenis = window.__anp && window.__anp.lenis;
  const offset = section.offsetHeight - window.innerHeight + 1;
  if (lenis) lenis.scrollTo(section, { offset, duration: 1.2 });
  else window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' });
}

if (root && !root.dataset.wowSteelInit) {
  root.dataset.wowSteelInit = '1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const skip = root.querySelector('.wow-steel__skip');
  if (skip) skip.addEventListener('click', () => skipTo(root));

  let started = false;
  const io = new IntersectionObserver(
    (entries) => {
      if (started || !entries.some((e) => e.isIntersecting)) return;
      started = true;
      io.disconnect();
      if (reduced) return; // CSS renders the static composition.
      if (!hasWebGL()) {
        root.classList.add('is-static');
        ScrollTrigger.refresh();
        return;
      }
      import('./wow-steel-scene.js')
        .then((m) => m.init(root, { gsap, ScrollTrigger }))
        .catch(() => {
          root.classList.add('is-static');
          ScrollTrigger.refresh();
        });
    },
    { rootMargin: '150% 0px' }
  );
  io.observe(root);
}
