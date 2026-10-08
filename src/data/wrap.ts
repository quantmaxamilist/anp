// Greedy line-wrap for display headings rendered by Split.astro.
export const wrap = (text: string, max = 13) => {
  const out: string[] = [];
  for (const w of text.replace(/\s*\/\s*/g, ' / ').split(' ')) {
    const last = out[out.length - 1];
    if (last !== undefined && (last + ' ' + w).length <= max) out[out.length - 1] = last + ' ' + w;
    else out.push(w);
  }
  // never leave a lone slash at the start of a line
  return out.map((l, i, a) => (l === '/' && a[i + 1] ? '' : l)).filter(Boolean);
};
