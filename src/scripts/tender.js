// Tender store (ported from v4). localStorage 'anp:tender' → JSON array of service slugs, in service order.
// Data comes from the JSON <script id="tender-data"> written by TenderDock.astro.
const KEY = 'anp:tender';
const dataEl = document.getElementById('tender-data');
const DATA = dataEl ? JSON.parse(dataEl.textContent || '{}') : { services: [], email: '' };
const ORDER = DATA.services.map((s) => s.slug);
const NAME = Object.fromEntries(DATA.services.map((s) => [s.slug, s.name]));
const EMAIL = DATA.email;

let mem = [];
const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return mem; }
};
const write = (v) => {
  mem = v;
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ }
};
const norm = (list) => ORDER.filter((s) => list.includes(s));
const emit = () => document.dispatchEvent(new CustomEvent('tender:change', { detail: { slugs: get() } }));

export const get = () => norm(read());
export const has = (slug) => get().includes(slug);
export const set = (slugs) => { write(norm(slugs)); emit(); };
export const toggle = (slug) => { const c = get(); set(c.includes(slug) ? c.filter((s) => s !== slug) : [...c, slug]); };
export const clear = () => set([]);
export const names = (slugs = get()) => slugs.map((s) => NAME[s]).filter(Boolean);
export const mailto = (slugs = get(), fields) => {
  const n = names(slugs);
  const subject = n.length ? `Tender enquiry: ${n.join(', ')}` : 'Tender enquiry';
  const lines = fields
    ? [
        `Name: ${fields.name || ''}`,
        `Company: ${fields.company || '-'}`,
        `Email: ${fields.email || ''}`,
        `Phone: ${fields.tel || '-'}`,
        `Package(s): ${n.join(', ') || '-'}`,
        '',
        fields.message || '',
      ]
    : n.length ? [`Package(s): ${n.join(', ')}`, ''] : [];
  const body = lines.join('\n');
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
};
export const email = EMAIL;

let synced = false;
const sync = () => {
  const cur = get();
  document.querySelectorAll('[data-add]').forEach((b) => {
    const on = cur.includes(b.dataset.add);
    b.setAttribute('aria-pressed', String(on));
    const lab = b.querySelector('.add-l');
    if (lab) lab.textContent = on ? 'In tender' : 'Add to tender';
  });
  document.querySelectorAll('input[data-tender-box]').forEach((x) => { x.checked = cur.includes(x.value); });
  document.querySelectorAll('a[data-mailto]').forEach((a) => { a.href = mailto(cur); });
  const dock = document.getElementById('dock');
  if (dock) {
    const n = cur.length;
    const was = dock.classList.contains('is-on');
    dock.classList.toggle('is-on', n > 0);
    dock.toggleAttribute('inert', n === 0);
    if (n && !was && synced) { dock.classList.add('is-new'); setTimeout(() => dock.classList.remove('is-new'), 600); }
    const N = document.getElementById('dockN');
    const U = document.getElementById('dockU');
    const L = document.getElementById('dockNames');
    if (N) N.textContent = String(n);
    if (U) U.textContent = n === 1 ? 'package' : 'packages';
    if (L) L.innerHTML = names(cur).map((x) => `<li>${x}</li>`).join('');
  }
  synced = true;
};

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]');
  if (b) { e.preventDefault(); toggle(b.dataset.add); return; }
  if (e.target.closest('#dockClear')) clear();
  const t = e.target.closest('#dockToggle');
  if (t) {
    const dock = document.getElementById('dock');
    const open = !dock.classList.contains('is-open');
    dock.classList.toggle('is-open', open);
    t.setAttribute('aria-expanded', String(open));
  }
});
document.addEventListener('change', (e) => {
  const x = e.target.closest('input[data-tender-box]');
  if (!x) return;
  const boxes = [...document.querySelectorAll(`input[data-tender-box][name="${x.name}"]`)];
  set(boxes.filter((b) => b.checked).map((b) => b.value));
});
document.addEventListener('tender:change', sync);

// /contact?package=<slug>[,<slug>] (or repeated ?package=) adds those packages to the tender before first sync.
try {
  const q = new URLSearchParams(location.search).getAll('package').flatMap((v) => v.split(','));
  const add = q.filter((s) => ORDER.includes(s));
  if (add.length) write(norm([...read(), ...add]));
} catch { /* ignore */ }

// Shared tender form (TenderForm.astro): validate, store the ticked trades, open a prefilled mailto.
document.querySelectorAll('form[data-tender-form]').forEach((form) => {
  const note = form.querySelector('[data-note]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let bad = null;
    form.querySelectorAll('input[required]').forEach((x) => {
      const ok = x.checkValidity() && x.value.trim() !== '';
      x.setAttribute('aria-invalid', String(!ok));
      if (!ok && !bad) bad = x;
    });
    if (bad) { bad.focus(); if (note) note.textContent = 'Please add your name and a valid email.'; return; }
    const f = new FormData(form);
    const slugs = [...form.querySelectorAll('input[name="pkg"]')].filter((x) => x.checked).map((x) => x.value);
    set(slugs);
    if (note) note.textContent = 'Your email app should open with the details filled in. If it does not, copy the email address and send your tender directly.';
    location.href = mailto(slugs, {
      name: String(f.get('name') || ''), company: String(f.get('company') || ''), email: String(f.get('email') || ''),
      tel: String(f.get('tel') || ''), message: String(f.get('message') || ''),
    });
  });
  const cp = form.querySelector('[data-copy]');
  cp?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(cp.dataset.copy || ''); cp.textContent = 'Copied'; }
    catch { cp.textContent = cp.dataset.copy || ''; }
    setTimeout(() => { cp.textContent = 'Copy email'; }, 2400);
  });
});
sync();
