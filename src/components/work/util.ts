// Helpers for the work pages (/clients, /additional-projects).
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const pad = (n: number) => String(n).padStart(2, '0');
// Meta description: a verbatim passage cut on a word boundary, at most `max` characters.
export const excerpt = (s: string, max = 155) => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—–-]\s*$/, '') + '…';
};
