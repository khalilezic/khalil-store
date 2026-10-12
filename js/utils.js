/* ============================================================
   khalil store — small helper functions used everywhere.
   ============================================================ */

/** Format a number into a "$xx.xx" price string (USD). */
export function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

/**
 * Use whenever rendering user-controlled text into a template string
 * (product names, descriptions, etc.) so injected markup can't break
 * the page. Mirrors a minimal HTML-escape helper.
 */
export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Parse "a=1&b=2" — the part after "?" — into a plain object. */
export function parseQuery(queryString = "") {
  const params = {};
  const usp = new URLSearchParams(queryString);
  for (const [key, value] of usp.entries()) params[key] = value;
  return params;
}

/** Inverse of parseQuery: object → "?a=1&b=2" (drops empty values). */
export function buildQuery(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, v);
  });
  const str = usp.toString();
  return str ? `?${str}` : "";
}

/** Trailing-edge debounce; used by the shop's live search filter. */
export function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Random 6-digit order number, prefixed for the receipt. */
export function randomOrderNumber() {
  return "STR-" + Math.floor(100000 + Math.random() * 899999);
}

/**
 * Turn a product's own swatch colour into an accent tone that can actually
 * carry a dark stage light. The hue always comes from the product (never
 * invented); only lightness/saturation are clamped so near-white and
 * near-black shoes still read as light instead of washing out.
 * Achromatic shoes (pure white / black) get a cool steel cast, matching the
 * silver direction of the storefront.
 *
 * @param {string} hex  e.g. "#1f8a8c" (product.colors[0].hex)
 * @returns {string}    hex accent tone, e.g. "#1F8A8C"
 */
export function accentTone(hex) {
  const match = /^#([\da-f]{6})$/i.exec(String(hex || ""));
  if (!match) return "#8FA3B8";
  const int = parseInt(match[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = lightness > .5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
  } else {
    // Achromatic swatch → cool steel hue keeps white/black shoes legible.
    hue = 214;
  }

  const s = Math.max(0.24, Math.min(0.72, saturation * 1.18));
  const l = Math.max(0.36, Math.min(0.62, lightness));

  // HSL → RGB → hex
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = hue / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb = [0, 0, 0];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = l - c / 2;
  const toHex = (v) => Math.round(Math.min(255, Math.max(0, (v + m) * 255))).toString(16).padStart(2, "0");
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`.toUpperCase();
}

/** True when the visitor asked the OS to reduce motion. */
export function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
