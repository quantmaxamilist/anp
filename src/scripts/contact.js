// /contact page script: phone odometer, postcode fill, Copy email, the live "ticked" meter beside the
// shared TenderForm, and keeping same-page "Send a tender" links on the form (no reload).
import { get } from './tender.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ROWS = 30; // digits per odometer column (3 cycles of 0-9); rest position = middle cycle
const rest = (el) => (-(10 + Number(el.dataset.d)) * 100) / ROWS;
const pad = (n) => String(n).padStart(2, '0');

// ---- Copy email (sheet) ----------------------------------------------------------
const copyBtn = document.querySelector('[data-ct-copy]');
const copyLabel = copyBtn?.querySelector('[data-ct-copy-label]');
const copyLive = document.querySelector('[data-ct-copy-live]');
let copyT = 0;
copyBtn?.addEventListener('click', async () => {
  const email = copyBtn.dataset.ctCopy || '';
  let ok = false;
  try { await navigator.clipboard.writeText(email); ok = true; } catch { /* clipboard blocked */ }
  if (copyLabel) copyLabel.textContent = ok ? 'Copied' : email;
  if (copyLive) copyLive.textContent = ok ? 'Email copied' : email;
  copyBtn.classList.toggle('is-done', ok);
  clearTimeout(copyT);
  copyT = setTimeout(() => { if (copyLabel) copyLabel.textContent = 'Copy email'; copyBtn.classList.remove('is-done'); }, 2400);
});

// ---- Ticked meter beside the submit (TenderForm is shared: inject, never edit it) ---
const wrap = document.querySelector('[data-ct-form]');
const form = wrap?.querySelector('form[data-tender-form]');
const foot = form?.querySelector('.tf__foot');
if (form && foot) {
  const boxes = [...form.querySelectorAll('input[name="pkg"]')];
  const total = boxes.length;
  const meter = document.createElement('div');
  meter.className = 'ct-meter';
  meter.style.setProperty('--n', String(total));
  meter.innerHTML = `<div class="ct-meter__bar" aria-hidden="true">${boxes.map(() => '<i></i>').join('')}</div>`
    + `<p class="ct-meter__txt"><span class="ct-meter__n" data-ct-n>00</span><span class="mono" data-ct-t></span></p>`;
  foot.before(meter);
  const ticks = [...meter.querySelectorAll('.ct-meter__bar i')];
  const N = meter.querySelector('[data-ct-n]');
  const T = meter.querySelector('[data-ct-t]');
  T.setAttribute('aria-live', 'polite');
  let last = -1;
  const update = () => {
    const cur = get();
    const n = boxes.filter((b) => cur.includes(b.value)).length;
    boxes.forEach((b, i) => ticks[i].classList.toggle('is-on', cur.includes(b.value)));
    N.textContent = pad(n);
    T.textContent = `/ ${pad(total)} ${n === 1 ? 'package' : 'packages'} ticked`;
    if (last !== -1 && n !== last && !reduced) { N.classList.remove('is-pop'); void N.offsetWidth; N.classList.add('is-pop'); }
    last = n;
  };
  document.addEventListener('tender:change', update);
  update();
}

// ---- Same-page "Send a tender" links (header, dock, footer) go to the form ---------
const tender = document.getElementById('tender');
const toForm = () => {
  const a = window.__anp;
  if (a?.lenis) a.lenis.scrollTo(tender, { duration: 1.2 });
  else tender.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  history.replaceState(null, '', `${location.pathname}${location.search}#tender`);
};
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href]');
  if (!a || !tender || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname.replace(/\.html$/, '') !== location.pathname.replace(/\.html$/, '') || url.hash) return;
  e.preventDefault();
  if (a.closest('#dock')) document.getElementById('dockToggle')?.click(); // close the open slip
  toForm();
}, true);

// The tender slip only shows over the contact sheet: in the hero it would cover the CTAs, and over the
// form it duplicates the chips (the meter above the submit shows the count there).
const sheet = document.querySelector('.ct-sheet');
if (sheet && 'IntersectionObserver' in window) {
  document.body.setAttribute('data-ct-dock-off', '');
  new IntersectionObserver(([en]) => { document.body.toggleAttribute('data-ct-dock-off', !en.isIntersecting); }, { rootMargin: '-50% 0px -35% 0px' }).observe(sheet);
}

// ---- Motion (after core.js reveals are ready) ---------------------------------------
const boot = () => {
  const { gsap, ScrollTrigger } = window.__anp || {};
  if (!gsap || reduced) return;

  // Phone: odometer roll on reveal, a full spin on hover/focus.
  const phone = document.querySelector('[data-ct-phone]');
  if (phone) {
    const cols = [...phone.querySelectorAll('.ct-col')];
    let ready = false;
    gsap.set(cols, { y: 0, yPercent: 0 });
    ScrollTrigger.create({
      trigger: phone, start: 'top 88%', once: true,
      onEnter: () => gsap.to(cols, {
        yPercent: (i, el) => rest(el), duration: 2, ease: 'expo.out', stagger: 0.055,
        onComplete: () => { ready = true; },
      }),
    });
    const spin = () => {
      if (!ready) return;
      ready = false;
      gsap.fromTo(cols, { yPercent: (i, el) => rest(el) }, {
        yPercent: (i, el) => rest(el) - 1000 / ROWS, duration: 0.9, ease: 'power3.inOut', stagger: 0.025,
        onComplete: () => { gsap.set(cols, { yPercent: (i, el) => rest(el) }); ready = true; },
      });
    };
    phone.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') spin(); });
    phone.addEventListener('focus', spin);
  }

  // Postcode monument: the solid fill sweeps across the outline with scroll.
  const fill = document.querySelector('[data-ct-post-fill]');
  if (fill) {
    gsap.fromTo(fill, { clipPath: 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: fill, start: 'top 95%', end: 'bottom 55%', scrub: 0.6 },
    });
  }
};
if (window.__anp?.ready) boot();
else document.addEventListener('anp:ready', boot, { once: true });
