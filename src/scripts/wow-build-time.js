// The Build: shared scroll timeline (no three.js here, so wow-build.js stays light).
// The section's progress p (0..1) maps onto weighted slices:
//   0 plan (the drawing) · 1 rise (swoop + extrude) · 2..10 trades 01..09 · 11 finale
// Inside a trade slice the first 45% travels and the remaining 55% holds still.
// Compressed for /services (500svh desktop / 400svh mobile): the opening plan and the rise are
// shorter, so the nine trade stops keep almost the same scroll each as the 580svh homepage cut.
export const SL = [0.28, 0.82, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.0];
export const TOTAL = SL.reduce((a, b) => a + b, 0);
export const START = SL.map((_, i) => SL.slice(0, i).reduce((a, b) => a + b, 0));
export const TRAVEL = 0.45;

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const xOf = (p) => clamp01(p) * TOTAL;

export function slice(X) {
  let i = SL.length - 1;
  for (let k = 0; k < SL.length; k++) if (X < START[k] + SL[k]) { i = k; break; }
  return { i, u: clamp01((X - START[i]) / SL[i]) };
}

// UI step: 0 opening, 1..9 trades, 10 finale. A step takes over a little into its travel.
export function stepOf(X) {
  const { i, u } = slice(X);
  if (i < 2) return 0;
  const k = i - 1;
  return u >= 0.22 ? k : k - 1;
}

// progress at which step k is parked and readable
export function restP(k) {
  if (k <= 0) return 0;
  const i = Math.min(SL.length - 1, k + 1);
  const at = k >= 10 ? 0.86 : 0.64;
  return (START[i] + SL[i] * at) / TOTAL;
}
