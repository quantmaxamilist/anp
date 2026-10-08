// Accessible lightbox for any [data-gallery] container whose items are [data-gallery-item] buttons/links with
// data-full (image URL), data-w, data-h and data-alt. Hidden items ([hidden] on the item or an ancestor inside the
// gallery) are skipped, so filters only need to toggle `hidden`. Keyboard: ←/→, Home/End, Esc; focus is trapped and
// restored; swipe on touch; "Photo n of N"; scroll locked via Lenis (stop/start) + overflow, always released.
let box = null;
let state = { items: [], i: 0, opener: null };
const anp = () => window.__anp || {};

const visible = (gallery) => [...gallery.querySelectorAll('[data-gallery-item]')].filter((el) => !el.closest('[hidden]') && el.offsetParent !== null);

const build = () => {
  box = document.createElement('div');
  box.className = 'lb';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Photo viewer');
  box.hidden = true;
  box.innerHTML = `
    <div class="lb__top container">
      <p class="lb__count mono" aria-live="polite"></p>
      <button type="button" class="lb__btn lb__close" aria-label="Close photo viewer" data-cursor="link"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    </div>
    <figure class="lb__fig"><img class="lb__img" alt="" decoding="async" /><figcaption class="lb__cap mono"></figcaption></figure>
    <button type="button" class="lb__btn lb__prev" aria-label="Previous photo" data-cursor="link"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M14 8H3M7 3.5 2.5 8 7 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button type="button" class="lb__btn lb__next" aria-label="Next photo" data-cursor="link"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  document.body.appendChild(box);
  box.querySelector('.lb__close').addEventListener('click', close);
  box.querySelector('.lb__prev').addEventListener('click', () => go(state.i - 1));
  box.querySelector('.lb__next').addEventListener('click', () => go(state.i + 1));
  box.addEventListener('click', (e) => { if (e.target === box || e.target.classList.contains('lb__fig')) close(); });
  box.addEventListener('keydown', onKey);
  // swipe
  let sx = 0, sy = 0, tracking = false;
  box.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; tracking = true; sx = e.clientX; sy = e.clientY; });
  box.addEventListener('pointerup', (e) => {
    if (!tracking) return; tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) go(state.i + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) close();
  });
  box.addEventListener('pointercancel', () => { tracking = false; });
};

const show = () => {
  const el = state.items[state.i];
  const img = box.querySelector('.lb__img');
  const n = state.items.length;
  img.classList.remove('is-in');
  img.src = el.dataset.full;
  img.width = +el.dataset.w || 1600;
  img.height = +el.dataset.h || 1200;
  img.alt = el.dataset.alt || '';
  const done = () => requestAnimationFrame(() => img.classList.add('is-in'));
  if (img.complete) done(); else img.onload = done;
  box.querySelector('.lb__count').textContent = `Photo ${state.i + 1} of ${n}`;
  box.querySelector('.lb__cap').textContent = el.dataset.caption || '';
  box.querySelector('.lb__prev').hidden = n < 2;
  box.querySelector('.lb__next').hidden = n < 2;
  // preload neighbours
  [state.i + 1, state.i - 1].forEach((k) => { const it = state.items[(k + n) % n]; if (it) { const p = new Image(); p.src = it.dataset.full; } });
};
const go = (i) => { const n = state.items.length; if (!n) return; state.i = (i + n) % n; show(); };

const lock = (on) => {
  const { lenis } = anp();
  document.documentElement.classList.toggle('lb-open', on);
  if (on) { lenis?.stop(); document.body.style.overflow = 'hidden'; }
  else { document.body.style.overflow = ''; lenis?.start(); }
};

const open = (gallery, item) => {
  if (!box) build();
  state.items = visible(gallery);
  state.i = Math.max(0, state.items.indexOf(item));
  state.opener = item;
  box.hidden = false;
  lock(true);
  show();
  requestAnimationFrame(() => { box.classList.add('is-open'); box.querySelector('.lb__close').focus(); });
};
function close() {
  if (!box || box.hidden) return;
  box.classList.remove('is-open');
  box.hidden = true;
  lock(false);
  state.opener?.focus({ preventScroll: true });
}
function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); close(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); go(state.i + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); go(state.i - 1); }
  else if (e.key === 'Home') { e.preventDefault(); go(0); }
  else if (e.key === 'End') { e.preventDefault(); go(state.items.length - 1); }
  else if (e.key === 'Tab') {
    const f = [...box.querySelectorAll('button:not([hidden])')];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

document.addEventListener('click', (e) => {
  const item = e.target.closest('[data-gallery-item]');
  if (!item) return;
  const gallery = item.closest('[data-gallery]');
  if (!gallery) return;
  e.preventDefault();
  open(gallery, item);
});
// Never leave the page scroll-locked: page transitions and bfcache restores release the lock.
document.addEventListener('anp:leave', close);
addEventListener('pagehide', close);
addEventListener('pageshow', (e) => { if (e.persisted) close(); });

export { open as openLightbox, close as closeLightbox };
