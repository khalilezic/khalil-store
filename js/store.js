/* ============================================================
   khalil store — client-side state (cart + favorites).
   --------------------------------------------------------
   All persistence is done in localStorage so the app survives
   reloads without a backend. Every page only calls the
   exported functions here — replacing localStorage with real
   API calls (Firebase, Medusa, Stripe + cart endpoint) keeps
   the same interface, so renders don't need to change.
   ============================================================ */

import { getProductById } from "./data.js";

const CART_KEY = "stride_cart_v2";
const FAV_KEY  = "stride_fav_v2";

/* ---------------- low-level storage ---------------- */

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("khalil store: failed to read storage key", key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("khalil store: failed to write storage key", key, e);
  }
}

/** Emit a DOM CustomEvent so the UI can refresh badges in place. */
function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/* ============================================================
   CART
   Each line: { productId: string, size: number, color: string, qty: number }
   ============================================================ */

export function getCart() {
  return readJSON(CART_KEY, []);
}

function saveCart(cart) {
  writeJSON(CART_KEY, cart);
  emit("cart:change", { cart });
}

/** Add a product line; merge into existing line if identical (id+size+color). */
export function addToCart({ productId, size, color, qty = 1 }) {
  const cart = getCart();
  const existing = cart.find(
    (l) => l.productId === productId && l.size === size && l.color === color
  );
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ productId, size, color, qty });
  }
  saveCart(cart);
  return cart;
}

/** Update quantity on a specific cart line (clamped to >= 1). */
export function updateCartLineQty(index, qty) {
  const cart = getCart();
  if (!cart[index]) return cart;
  cart[index].qty = Math.max(1, qty);
  saveCart(cart);
  return cart;
}

/** Remove a line entirely. */
export function removeCartLine(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  return cart;
}

/** Empty the cart entirely (called after a successful checkout). */
export function clearCart() {
  saveCart([]);
}

/** Convenience: cart lines joined to their resolved product object. */
export function getCartLinesWithProducts() {
  return getCart()
    .map((line, index) => {
      const product = getProductById(line.productId);
      if (!product) return null;
      return { ...line, index, product };
    })
    .filter(Boolean);
}

/** Total units across every line (drives the header badge). */
export function cartCount() {
  return getCart().reduce((sum, l) => sum + l.qty, 0);
}

/** Sum of price × qty across every line. */
export function cartSubtotal() {
  return getCartLinesWithProducts().reduce(
    (sum, l) => sum + l.product.price * l.qty,
    0
  );
}

/* ============================================================
   FAVORITES
   Stored as an array of productIds.
   ============================================================ */

export function getFavorites() {
  return readJSON(FAV_KEY, []);
}

function saveFavorites(favs) {
  writeJSON(FAV_KEY, favs);
  emit("fav:change", { favs });
}

/** True if productId is currently favorited. */
export function isFavorite(productId) {
  return getFavorites().includes(productId);
}

/** Toggle in/out of favorites; returns updated array. */
export function toggleFavorite(productId) {
  const favs = getFavorites();
  const idx = favs.indexOf(productId);
  if (idx === -1) favs.push(productId);
  else favs.splice(idx, 1);
  saveFavorites(favs);
  return favs;
}

/** Resolved favorite products (drops any stale ids). */
export function getFavoriteProducts() {
  return getFavorites()
    .map((id) => getProductById(id))
    .filter(Boolean);
}

/** Just the count (used by the badge). */
export function favoriteCount() {
  return getFavorites().length;
}

/* ============================================================
   Shared constants
   ============================================================ */
export const SHIPPING_FLAT_RATE = 0;   // free shipping, kept as a single tunable constant
export const TAX_RATE = 0;              // flip to e.g. 0.08 to enable tax calculation
