// ─── Labs — one slug per organisation, shared by links and the lab page ─────

/** "Z.ai" → "z-ai", "Thinking Machines" → "thinking-machines", "xAI" → "xai". */
export function labSlug(org) {
  return String(org ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** The organisation name behind a slug, read from the models on the board. */
export function orgForSlug(slug, models) {
  if (!slug) return null;
  for (const m of models ?? []) if (m?.org && labSlug(m.org) === slug) return m.org;
  return null;
}
