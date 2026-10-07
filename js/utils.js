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
