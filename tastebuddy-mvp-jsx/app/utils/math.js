const ALPHA = 0.35;
const CLIP = (x) => Math.max(0, Math.min(1, x));

export const ratingToGain = (r) => (r - 3) / 2.0;

export function cosine(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return na * nb === 0 ? 0 : dot / (na * nb);
}

export function ewmaUpdate(vUser, vRecipe, rating) {
  const r = ratingToGain(rating);
  return vUser.map((u, i) => CLIP((1 - ALPHA) * u + ALPHA * (u + r * (vRecipe[i] - u))));
}
