/* ============================================================
   khalil store — app entry: hash-router + global event delegation.
   --------------------------------------------------------
   Why this file exists:
     - No framework, no build step. Just open index.html (via a
       static server) and it runs end-to-end.
     - Every page only writes to the #app mount point.
     - Every interaction goes through one click/change/input handler
       so re-rendering a page never breaks wiring.
   How to extend:
     - New page  → add `renderXxx()` in render.js + a branch in router()
     - New action → add a new `data-action="..."` value + a case below
     - New state  → add functions in store.js; emit the same events
   ============================================================ */

import {
  renderHome, renderShop, renderProduct, renderCart, renderFavorites,
  renderCheckout, renderOrderSuccess, renderAbout, renderNotFound, pdpState
} from "./render.js";
import {
  addToCart, updateCartLineQty, removeCartLine, cartCount, cartSubtotal,
  toggleFavorite, favoriteCount, clearCart
} from "./store.js";
import { getProductById } from "./data.js";
import { parseQuery, buildQuery, debounce, randomOrderNumber } from "./utils.js";

const app = document.getElementById("app");

/* ---------------- Shop filter state ----------------
   Lives outside the URL after the first load for snappy interactions. */
let shopFilters = { category: "", brand: "", sort: "featured", q: "", priceMax: 200 };
let heroTimer = null;
let heroIndex = 0;
let ambientPointerFrame = 0;
let themeRippleTimer = null;
let heroTouchStartX = null;

const isSmallScreen = () => window.matchMedia("(max-width: 700px)").matches;
const isLowPerformanceDevice = () => {
  const cores = Number(navigator.hardwareConcurrency || 8);
  const memory = Number(navigator.deviceMemory || 8);
  return cores <= 4 || memory <= 4;
};
if (isLowPerformanceDevice()) document.documentElement.classList.add("low-performance");

try {
  const savedThemeColor = window.sessionStorage.getItem("khalil-store-site-color");
  if (/^#[\da-f]{6}$/i.test(savedThemeColor || "")) {
    document.documentElement.style.setProperty("--site-color", savedThemeColor);
  }
} catch { /* Storage can be unavailable in private browsing; the default theme still works. */ }

window.addEventListener("pointermove", (event) => {
  if (isSmallScreen() || window.matchMedia("(prefers-reduced-motion: reduce)").matches || ambientPointerFrame) return;
  ambientPointerFrame = requestAnimationFrame(() => {
    const pointerX = event.clientX / window.innerWidth;
    const pointerY = event.clientY / window.innerHeight;
    document.documentElement.style.setProperty("--ambient-x", `${(pointerX * 100).toFixed(1)}%`);
    document.documentElement.style.setProperty("--ambient-y", `${(pointerY * 100).toFixed(1)}%`);
    document.documentElement.style.setProperty("--hero-parallax-x", `${((pointerX - .5) * 14).toFixed(1)}px`);
    document.documentElement.style.setProperty("--hero-parallax-y", `${((pointerY - .5) * 10).toFixed(1)}px`);
    ambientPointerFrame = 0;
  });
}, { passive: true });

window.addEventListener("click", (event) => {
  if (isSmallScreen()) return;
  const root = document.documentElement;
  root.style.setProperty("--click-x", `${(event.clientX / window.innerWidth * 100).toFixed(1)}%`);
  root.style.setProperty("--click-y", `${(event.clientY / window.innerHeight * 100).toFixed(1)}%`);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const body = document.body;
  body.classList.remove("theme-click-ripple");
  void body.offsetWidth;
  body.classList.add("theme-click-ripple");
  clearTimeout(themeRippleTimer);
  themeRippleTimer = setTimeout(() => body.classList.remove("theme-click-ripple"), 1150);
}, { passive: true, capture: true });

const filtersToQueryString = () => buildQuery(shopFilters);

/* ---------------- Toast (snackbar) ---------------- */
let toastTimer = null;
function showToast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ---------------- Cart + fav badges ---------------- */
function updateBadges() {
  const cartN = cartCount();
  const favN  = favoriteCount();
  document.querySelectorAll("#cartBadge, #cartBadgeMobile").forEach((el) => {
    el.textContent = String(cartN);
    el.hidden = cartN === 0;
  });
  document.querySelectorAll("#favBadge, #favBadgeMobile").forEach((el) => {
    el.textContent = String(favN);
    el.hidden = favN === 0;
  });
}
window.addEventListener("cart:change", updateBadges);
window.addEventListener("fav:change",  updateBadges);

/* ---------------- Nav active state ---------------- */
function navKeyForPath(path) {
  if (path === "/") return "/";
  if (path.startsWith("/shop") || path.startsWith("/product/")) return "/shop";
  if (path === "/favorites") return "/favorites";
  if (path === "/cart") return "/cart";
  if (path === "/about") return "/about";
  return null;
}
function updateActiveNav(path) {
  const key = navKeyForPath(path);
  const nav = document.querySelector(".bottom-nav");
  const links = [...document.querySelectorAll(".bottom-nav [data-route]")];
  links.forEach((el) => {
    el.classList.toggle("active", key !== null && el.dataset.route === key);
  });
  if (!nav) return;

  const indicator = nav.querySelector(".nav-indicator");
  const target = links.find((el) => key !== null && el.dataset.route === key);
  nav.classList.toggle("has-active", Boolean(target));
  if (!target || !indicator) return;

  const navList = nav.querySelector("ul");
  const targetRect = target.getBoundingClientRect();
  const listRect = navList.getBoundingClientRect();
  const changed = nav.dataset.activeRoute && nav.dataset.activeRoute !== key;
  indicator.style.width = `${targetRect.width}px`;
  indicator.style.height = `${targetRect.height}px`;
  indicator.style.transform = `translate3d(${targetRect.left - listRect.left}px, ${targetRect.top - listRect.top}px, 0)`;

  if (nav.dataset.ready === "true" && changed) {
    indicator.classList.remove("is-sweeping");
    void indicator.offsetWidth;
    indicator.classList.add("is-sweeping");
  }
  nav.dataset.activeRoute = key;
  if (nav.dataset.ready !== "true") {
    requestAnimationFrame(() => {
      nav.dataset.ready = "true";
    });
  }
}

function closeMobileMenu() {
  const nav = document.getElementById("mobileNav");
  if (nav) nav.hidden = true;
}

function applyHeroTheme(slide) {
  if (!slide) return;
  const tone = slide.dataset.shoeColor;
  if (/^#[\da-f]{6}$/i.test(tone || "")) {
    document.documentElement.style.setProperty("--site-color", tone);
    try { window.sessionStorage.setItem("khalil-store-site-color", tone); } catch { /* Keep theme in memory if storage is unavailable. */ }
  }
}

function setHeroSlide(nextIndex) {
  const slides = [...document.querySelectorAll("[data-hero-slide]")];
  const dots = [...document.querySelectorAll(".carousel-dot")];
  if (!slides.length) return;
  const next = (nextIndex + slides.length) % slides.length;
  if (next === heroIndex) return;
  const forwardSteps = (next - heroIndex + slides.length) % slides.length;
  const carousel = document.querySelector(".hero-carousel");
  const direction = forwardSteps <= slides.length / 2 ? "forward" : "backward";
  const outgoing = slides[heroIndex];
  const incoming = slides[next];
  if (carousel) carousel.dataset.direction = direction;
  if (incoming) {
    incoming.style.setProperty("--slide-x", direction === "forward" ? "54px" : "-54px");
  }
  heroIndex = next;
  slides.forEach((slide, index) => slide.classList.toggle("active", index === heroIndex));
  dots.forEach((dot, index) => dot.classList.toggle("active", index === heroIndex));
  applyHeroTheme(slides[heroIndex]);
}

function startHeroCarousel() {
  clearInterval(heroTimer);
  heroIndex = 0;
  setHeroSlide(heroIndex);
  heroTimer = setInterval(() => setHeroSlide(heroIndex + 1), 5200);
  const stage = document.querySelector(".sneaker-stage");
  if (!stage) return;
  const firstSlide = stage.querySelector(`[data-hero-slide="${heroIndex}"]`);
  applyHeroTheme(firstSlide);
  stage.addEventListener("mouseenter", () => clearInterval(heroTimer));
  stage.addEventListener("mouseleave", () => {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => setHeroSlide(heroIndex + 1), 5200);
  });
  stage.addEventListener("touchstart", (event) => {
    heroTouchStartX = event.changedTouches[0]?.clientX ?? null;
    clearInterval(heroTimer);
  }, { passive: true });
  stage.addEventListener("touchend", (event) => {
    if (heroTouchStartX === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? heroTouchStartX) - heroTouchStartX;
    if (Math.abs(delta) > 42) setHeroSlide(heroIndex + (delta < 0 ? 1 : -1));
    heroTouchStartX = null;
    heroTimer = setInterval(() => setHeroSlide(heroIndex + 1), 5200);
  }, { passive: true });
}

function observeProductCards() {
  const cards = [...document.querySelectorAll(".product-card")];
  if (!cards.length) return;
  cards.forEach((card) => card.classList.add("reveal-ready"));
  if (!("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
  cards.forEach((card) => observer.observe(card));
}

/* ============================================================
   ROUTER
   ============================================================ */
function parseHash() {
  const raw = (location.hash || "#/").slice(1);
  const [path, query = ""] = raw.split("?");
  return { path: path || "/", query };
}

function renderShopPage() {
  app.innerHTML = renderShop(filtersToQueryString());
  updateBadges();
}
function renderProductPage(id) {
  app.innerHTML = renderProduct(id);
  updateBadges();
}
function renderCartPage() {
  app.innerHTML = renderCart();
  updateBadges();
}
function renderFavoritesPage() {
  app.innerHTML = renderFavorites();
  updateBadges();
}

function router() {
  const { path, query } = parseHash();
  document.body.classList.add("site-theme");
  document.body.classList.toggle("home-theme", path === "/");
  if (path === "/") {
    app.innerHTML = renderHome();
    startHeroCarousel();
  } else if (path === "/shop") {
    const q = parseQuery(query);
    shopFilters = {
      category: q.category || "",
      brand:    q.brand || "",
      sort:     q.sort || "featured",
      q:        q.q || "",
      priceMax: q.priceMax ? Number(q.priceMax) : 200
    };
    renderShopPage();
  } else if (path.startsWith("/product/")) {
    renderProductPage(path.split("/")[2]);
  } else if (path === "/cart") {
    renderCartPage();
  } else if (path === "/favorites") {
    renderFavoritesPage();
  } else if (path === "/checkout") {
    app.innerHTML = renderCheckout();
    wireCheckoutForm();
    updateBadges();
  } else if (path === "/order-success") {
    const q = parseQuery(query);
    app.innerHTML = renderOrderSuccess(q.order || "STR-000000", Number(q.total || 0));
  } else if (path === "/about") {
    app.innerHTML = renderAbout();
  } else {
    app.innerHTML = renderNotFound();
  }
  window.scrollTo(0, 0);
  updateActiveNav(path);
  updateBadges();
  closeMobileMenu();
  requestAnimationFrame(observeProductCards);
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  router();
  updateBadges();
});

/* ============================================================
   CHECKOUT FORM
   Re-wired after every render since the form DOM nodes are
   replaced. For now: clear the cart and redirect to a receipt.
   Replace this with your real payment integration.
   ============================================================ */
function wireCheckoutForm() {
  const form = document.getElementById("checkoutForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const total = cartSubtotal();
    const orderNumber = randomOrderNumber();
    clearCart();
    location.hash = `#/order-success?order=${encodeURIComponent(orderNumber)}&total=${encodeURIComponent(total.toFixed(2))}`;
  });
}

/* ============================================================
   GLOBAL CLICK DELEGATION
   ============================================================ */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    /* ---------- navigation ---------- */
    case "go-link": {
      if (el.tagName === "BUTTON" && el.dataset.href) {
        location.hash = el.dataset.href;
      }
      closeMobileMenu();
      break;
    }
    case "go-product": {
      // default anchor navigation handles the actual hash change
      break;
    }
    case "hero-next": {
      e.preventDefault();
      setHeroSlide(heroIndex + 1);
      break;
    }
    case "hero-prev": {
      e.preventDefault();
      setHeroSlide(heroIndex - 1);
      break;
    }
    case "hero-dot": {
      e.preventDefault();
      setHeroSlide(Number(el.dataset.index));
      break;
    }

    /* ---------- favorites ---------- */
    case "toggle-fav": {
      e.preventDefault();
      const id = el.dataset.id;
      toggleFavorite(id);
      const isFav = el.classList.contains("active");
      el.classList.toggle("active", !isFav);
      el.setAttribute("aria-pressed", String(!isFav));
      el.innerHTML = !isFav
        ? `<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.8 4.6c-1.9-1.9-5-1.9-6.9 0L12 5.5l-1.9-1.9c-1.9-1.9-5-1.9-6.9 0-1.9 1.9-1.9 5 0 6.9L12 19l8.8-8.5c1.9-1.9 1.9-5 0-6.9z"/></svg>`
        : `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.8 4.6c-1.9-1.9-5-1.9-6.9 0L12 5.5l-1.9-1.9c-1.9-1.9-5-1.9-6.9 0-1.9 1.9-1.9 5 0 6.9L12 19l8.8-8.5c1.9-1.9 1.9-5 0-6.9z"/></svg>`;

      // On the favorites page, drop the card instantly on un-favorite
      if (parseHash().path === "/favorites" && isFav) {
        const card = el.closest(".product-card");
        if (card) card.remove();
        if (!document.querySelector(".product-grid .product-card")) {
          renderFavoritesPage();
        }
      }
      break;
    }

    /* ---------- add-to-cart patterns ---------- */
    case "quick-add": {
      e.preventDefault();
      const product = getProductById(el.dataset.id);
      if (!product) break;
      addToCart({
        productId: product.id,
        size:      product.sizes[0],
        color:     product.colors[0].name,
        qty:       1
      });
      showToast(`تمت إضافة "${product.name}" إلى السلة`);
      break;
    }

    /* ---------- PDP controls ---------- */
    case "pdp-color": {
      pdpState.color = el.dataset.value;
      rerenderProductInPlace();
      break;
    }
    case "pdp-size": {
      pdpState.size = Number(el.dataset.value);
      rerenderProductInPlace();
      break;
    }
    case "pdp-qty": {
      const dir = Number(el.dataset.dir);
      pdpState.qty = Math.min(10, Math.max(1, pdpState.qty + dir));
      rerenderProductInPlace();
      break;
    }
    case "pdp-thumb": {
      pdpState.activeImage = Number(el.dataset.index);
      rerenderProductInPlace();
      break;
    }
    case "pdp-tab": {
      pdpState.activeTab = el.dataset.value;
      rerenderProductInPlace();
      break;
    }
    case "pdp-add-to-bag": {
      const product = getProductById(el.dataset.id);
      if (!product) break;
      if (!pdpState.size) {
        showToast("يرجى اختيار المقاس أولًا");
        const sizeRow = document.querySelector(".size-grid");
        if (sizeRow) {
          sizeRow.style.outline = "2px solid #62676F";
          sizeRow.style.borderRadius = "10px";
          setTimeout(() => (sizeRow.style.outline = "none"), 900);
        }
        break;
      }
      addToCart({
        productId: product.id,
        size:      pdpState.size,
        color:     pdpState.color,
        qty:       pdpState.qty
      });
      showToast(`تمت إضافة "${product.name}" إلى السلة`);
      break;
    }

    /* ---------- cart line controls ---------- */
    case "cart-qty": {
      const index = Number(el.dataset.index);
      const dir = Number(el.dataset.dir);
      const cart = JSON.parse(localStorage.getItem("stride_cart_v2") || "[]");
      const current = cart[index] ? cart[index].qty : 1;
      updateCartLineQty(index, current + dir);
      renderCartPage();
      break;
    }
    case "cart-remove": {
      removeCartLine(Number(el.dataset.index));
      renderCartPage();
      break;
    }

    /* ---------- shop filters ---------- */
    case "shop-category": {
      shopFilters.category = el.dataset.value || "";
      renderShopPage();
      break;
    }
    case "pay-method": {
      el.parentElement.querySelectorAll(".pay-chip").forEach((c) => c.classList.remove("active"));
      el.classList.add("active");
      const cardFields = document.getElementById("cardFields");
      if (cardFields) cardFields.style.display = el.dataset.value === "card" ? "grid" : "none";
      break;
    }
    default:
      break;
  }
});

function rerenderProductInPlace() {
  const scrollY = window.scrollY;
  app.innerHTML = renderProduct(pdpState.productId);
  window.scrollTo(0, scrollY);
  updateBadges();
}

/* ============================================================
   CHANGE / INPUT DELEGATION (filters, range slider, search)
   ============================================================ */
document.addEventListener("change", (e) => {
  const el = e.target;
  if (!el.dataset || !el.dataset.action) return;

  if (el.dataset.action === "shop-brand") {
    const checked = [...document.querySelectorAll('[data-action="shop-brand"]:checked')].map((c) => c.value);
    shopFilters.brand = checked.join(",");
    renderShopPage();
  } else if (el.dataset.action === "shop-sort") {
    shopFilters.sort = el.value;
    renderShopPage();
  }
});

const debouncedShopSearch = debounce((value) => {
  shopFilters.q = value;
  renderShopPage();
  // Preserve focus + cursor after re-render so typing stays smooth
  const input = document.getElementById("shopSearchInput");
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}, 300);

const debouncedPriceFilter = debounce((value) => {
  shopFilters.priceMax = Number(value);
  renderShopPage();
}, 150);

document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.dataset || !el.dataset.action) return;
  if (el.dataset.action === "shop-search") debouncedShopSearch(el.value);
  if (el.dataset.action === "shop-price") debouncedPriceFilter(el.value);
});

/* ============================================================
   FORM SUBMIT (header search, newsletter, contact)
   ============================================================ */
document.addEventListener("submit", (e) => {
  if (e.target.id === "headerSearchForm") {
    e.preventDefault();
    const value = document.getElementById("headerSearchInput").value.trim();
    location.hash = `#/shop${buildQuery({ q: value })}`;
    return;
  }
  if (e.target.dataset && e.target.dataset.action === "newsletter-form") {
    e.preventDefault();
    e.target.reset();
    showToast("تم الاشتراك بنجاح. راقب بريدك الإلكتروني.");
    return;
  }
  if (e.target.dataset && e.target.dataset.action === "contact-form") {
    e.preventDefault();
    e.target.reset();
    showToast("تم إرسال رسالتك — سنرد عليك خلال ساعات.");
    return;
  }
});

/* ============================================================
   MOBILE MENU TOGGLE
   ============================================================ */
document.getElementById("burgerBtn").addEventListener("click", () => {
  const nav = document.getElementById("mobileNav");
  nav.hidden = !nav.hidden;
});
