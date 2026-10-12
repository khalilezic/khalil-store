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
import { initStageCinema } from "./stage.js";
import { initScene } from "./scene.js";
import { parseQuery, buildQuery, debounce, randomOrderNumber, prefersReducedMotion } from "./utils.js";

const app = document.getElementById("app");

/* ---------------- Shop filter state ----------------
   Lives outside the URL after the first load for snappy interactions. */
let shopFilters = { category: "", brand: "", sort: "featured", q: "", priceMax: 200 };
let heroTimer = null;
let heroIndex = 0;
let ambientPointerFrame = 0;
let themeRippleTimer = null;
let heroTouchStartX = null;

/* Motion bookkeeping: one GSAP context per route keeps scroll triggers and
   inline styles from leaking into the next page. */
let gsapContext = null;
let stageController = null;
let heroCleanupTimer = null;
const hasMotion = () => Boolean(window.gsap) && !prefersReducedMotion();

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

/** Anything that is not the live slide goes back to its pure CSS state. */
function resetHeroOffstageSlides() {
  const gsap = window.gsap;
  if (!gsap) return;
  document.querySelectorAll("[data-hero-slide]").forEach((slide) => {
    if (slide.classList.contains("active")) return;
    gsap.set([slide, slide.querySelector(".floating-sneaker"), slide.querySelector(".hero-slide-copy")], { clearProps: "all" });
  });
}

/* ============================================================
   HERO SLIDE TRANSITION  (cinematic hand-off)
   ------------------------------------------------------------
   Three layers travel at different speeds and depths so the swap
   reads as one camera move instead of a flat crossfade:

     scene  (slide)   leaves slowly, slight scale + counter-rotation
     shoe             drifts the opposite way, staying perfectly sharp
     copy             exits first, lands last → follows the product

   Timing is balanced around a single clip: out 0.60s, in 0.86s with a
   0.12s overlap, so the stage never feels empty and never double-exposes.
   ============================================================ */
function setHeroSlide(nextIndex) {
  const slides = [...document.querySelectorAll("[data-hero-slide]")];
  const dots = [...document.querySelectorAll(".carousel-dot")];
  if (!slides.length) return;
  const next = (nextIndex + slides.length) % slides.length;
  if (next === heroIndex) return;

  const forwardSteps = (next - heroIndex + slides.length) % slides.length;
  const carousel = document.querySelector(".hero-carousel");
  const direction = forwardSteps <= slides.length / 2 ? "forward" : "backward";
  const sign = direction === "forward" ? 1 : -1;
  const gsap = window.gsap;
  const animate = hasMotion();
  const outgoing = slides[heroIndex];
  const incoming = slides[next];
  const layerOf = (slide) => (slide ? {
    shoe: slide.querySelector(".floating-sneaker"),
    copy: slide.querySelector(".hero-slide-copy")
  } : { shoe: null, copy: null });
  const from = layerOf(outgoing);
  const to = layerOf(incoming);

  if (animate) {
    // A slide-in can be interrupted (fast clicks, autoplay). Every slide is
    // reset to its CSS state first, so an interrupted hand-off can never leave
    // two sneakers on stage at once.
    slides.forEach((slide) => {
      const layer = layerOf(slide);
      gsap.killTweensOf([slide, layer.shoe, layer.copy]);
      gsap.set([slide, layer.shoe, layer.copy], { clearProps: "all" });
    });
    // Pin the outgoing scene in its "on stage" state before the class swap,
    // otherwise its CSS state (hidden) would swallow the exit animation.
    gsap.set(outgoing, { autoAlpha: 1, xPercent: 0, scale: 1, rotate: 0, visibility: "visible" });
    gsap.set(from.shoe, { x: 0, y: 0, scale: 1, rotate: 0 });
    gsap.set(from.copy, { autoAlpha: 1, xPercent: 0, y: 0, rotation: -7 });
    gsap.set(incoming, { autoAlpha: 0, xPercent: sign * 9, scale: 1.05, rotate: -sign * 1.7, visibility: "visible" });
    gsap.set(to.shoe, { xPercent: sign * 4, y: 46, scale: .86, rotate: -sign * 3, transformOrigin: "50% 58%" });
    gsap.set(to.copy, { autoAlpha: 0, xPercent: sign * 14, y: 22, rotation: -7 });
  }

  if (carousel) carousel.dataset.direction = direction;
  if (incoming && !animate) {
    incoming.style.setProperty("--slide-x", direction === "forward" ? "54px" : "-54px");
  }

  heroIndex = next;
  slides.forEach((slide, index) => slide.classList.toggle("active", index === heroIndex));
  dots.forEach((dot, index) => dot.classList.toggle("active", index === heroIndex));

  if (animate) {
    // Colour wash flips with the shoe; the snap class keeps it from lagging the scene.
    const root = document.documentElement;
    root.classList.add("gsap-theme-snap");
    applyHeroTheme(slides[heroIndex]);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("gsap-theme-snap")));
  } else {
    applyHeroTheme(slides[heroIndex]);
  }

  if (!animate) return;

  const decor = document.querySelector(".hero-decor");
  clearTimeout(heroCleanupTimer);
  heroCleanupTimer = setTimeout(() => resetHeroOffstageSlides(), 1150);
  gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: () => gsap.set([outgoing, from.shoe, from.copy], { clearProps: "transform,opacity,visibility" })
  })
    // ---- exit: the whole scene (not just the picture) leaves ----
    .to(outgoing, { autoAlpha: 0, xPercent: -sign * 7, scale: .955, rotate: sign * 1.4, duration: .6, ease: "power2.in" }, 0)
    .to(from.shoe, { xPercent: -sign * 5, y: -34, scale: .93, rotate: sign * 2, duration: .6, ease: "power2.in" }, 0)
    .to(from.copy, { autoAlpha: 0, y: -16, duration: .3, ease: "power1.in" }, 0)
    // ---- enter: shoe first, information follows ----
    .to(incoming, { autoAlpha: 1, xPercent: 0, scale: 1, rotate: 0, duration: .86, ease: "power3.out" }, .12)
    .to(to.shoe, { xPercent: 0, y: 0, scale: 1, rotate: 0, duration: .92, ease: "power3.out" }, .14)
    .to(to.copy, { autoAlpha: 1, xPercent: 0, y: 0, rotation: -7, duration: .5, ease: "power3.out" }, .34)
    // depth cue: the decorative layer drifts the other way
    .to(decor, { xPercent: sign * 2.5, duration: .9, ease: "power2.inOut" }, 0)
    .to(decor, { xPercent: 0, duration: .6, ease: "power2.out" }, .5);
}

/* The hero owns the storefront colour while it is on screen. Once it scrolls
   away the showcase (or any other section) takes over, so the autoplay must not
   keep repainting --site-color — and an off-screen carousel costs nothing. */
let heroInView = true;
function setHeroAutoplay(on) {
  clearInterval(heroTimer);
  heroTimer = null;
  if (on && heroInView) heroTimer = setInterval(() => setHeroSlide(heroIndex + 1), 5200);
}

function startHeroCarousel() {
  clearInterval(heroTimer);
  heroIndex = 0;
  setHeroSlide(heroIndex);
  const heroSection = document.querySelector(".hero");
  const stage = document.querySelector(".sneaker-stage");
  if (!stage) return;
  const firstSlide = stage.querySelector(`[data-hero-slide="${heroIndex}"]`);
  applyHeroTheme(firstSlide);

  heroInView = true;
  setHeroAutoplay(true);

  if (heroSection && "IntersectionObserver" in window) {
    const heroWatcher = new IntersectionObserver((entries) => {
      heroInView = entries[0].isIntersecting;
      setHeroAutoplay(heroInView);
    }, { threshold: .12 });
    heroWatcher.observe(heroSection);
  }

  stage.addEventListener("mouseenter", () => setHeroAutoplay(false));
  stage.addEventListener("mouseleave", () => setHeroAutoplay(true));
  stage.addEventListener("touchstart", (event) => {
    heroTouchStartX = event.changedTouches[0]?.clientX ?? null;
    clearInterval(heroTimer);
  }, { passive: true });
  stage.addEventListener("touchend", (event) => {
    if (heroTouchStartX === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? heroTouchStartX) - heroTouchStartX;
    if (Math.abs(delta) > 42) setHeroSlide(heroIndex + (delta < 0 ? 1 : -1));
    heroTouchStartX = null;
    setHeroAutoplay(true);
  }, { passive: true });
}

function observeProductCards() {
  const cards = [...document.querySelectorAll(".product-card")];
  if (!cards.length) return;
  if (window.gsap && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cards.forEach((card) => card.classList.remove("reveal-ready", "is-visible"));
    return;
  }
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
   GSAP SCROLL STORYTELLING
   ------------------------------------------------------------
   Kept deliberately lean for phones and low-power laptops:
     · one gsap.context per route → everything is reverted on navigation
     · one ScrollTrigger per *group* (grid / head / banner) instead of
       one per card, so the home page runs a handful of triggers
     · only transform + opacity are animated
   ============================================================ */
function initGSAPAnimations() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  if (prefersReducedMotion()) {
    document.body.classList.remove("gsap-ready");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add("gsap-ready");

  gsapContext?.revert();
  gsapContext = gsap.context(() => {
    const home = document.body.classList.contains("home-theme");
    const productPage = location.hash.startsWith("#/product/");

    gsap.fromTo(".site-header", { y: -22, opacity: 0 }, { y: 0, opacity: 1, duration: .75, ease: "power3.out", clearProps: "transform" });

    if (home) {
      // Ciro-style scroll scene (js/scene.js) — drives its own rAF loop.
      stageController = initScene(document.querySelector("[data-cx]"));
    }

    if (productPage) {
      // The product page "assembles" itself the same way the stage does:
      // gallery first, then the info column, then the detail rows.
      gsap.fromTo(".pdp-gallery-main img", { scale: 1.06, opacity: 0 }, { scale: 1, opacity: 1, duration: .9, ease: "power3.out" });
      gsap.fromTo(".pdp-info > *", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .055, ease: "power3.out" });
      const detailRows = gsap.utils.toArray(".tab-panel.active li, .pdp-perks .perk, .related-wrap .product-card");
      if (detailRows.length) {
        gsap.fromTo(detailRows, { y: 20, opacity: 0 }, {
          y: 0, opacity: 1, duration: .55, stagger: .06, ease: "power2.out",
          scrollTrigger: { trigger: ".tabs", start: "top 92%", once: true }
        });
      }
    }

    revealGroup(gsap, ".section-head", ".section-head", 0);
    revealGroup(gsap, ".cat-grid", ".cat-card", .05);
    revealGroup(gsap, ".product-grid", ".product-card", .06);
    revealGroup(gsap, ".brand-strip ul", "li", .05);
    revealGroup(gsap, ".promo-banner", ".promo-banner", 0);

    ScrollTrigger.refresh();
  }, document.body);
}

/** One trigger per group: fade + rise the children of `rootSelector` together. */
function revealGroup(gsap, rootSelector, childSelector, stagger) {
  gsap.utils.toArray(rootSelector).forEach((root) => {
    const targets = root.matches(childSelector)
      ? [root]
      : gsap.utils.toArray(childSelector, root);
    if (!targets.length) return;
    gsap.fromTo(targets, { y: 32, opacity: 0 }, {
      y: 0, opacity: 1, duration: .7, ease: "power3.out", stagger,
      scrollTrigger: { trigger: root, start: "top 90%", once: true }
    });
  });
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
  // Leave no motion behind: kill scroll triggers, the showcase controller and
  // every inline style the previous page's context wrote.
  if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  stageController?.destroy();
  stageController = null;
  gsapContext?.revert();
  gsapContext = null;
  document.body.classList.remove("gsap-ready");
  clearInterval(heroTimer);
  clearTimeout(heroCleanupTimer);
  heroTimer = null;
  heroCleanupTimer = null;

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
  requestAnimationFrame(initGSAPAnimations);
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  router();
  updateBadges();
});

// Fonts and hero/stage art can change the measured page height: re-measure once
// they arrive so the scrubbed scene stays aligned with the scrollbar.
window.addEventListener("load", () => window.ScrollTrigger?.refresh());
if (document.fonts?.ready) document.fonts.ready.then(() => window.ScrollTrigger?.refresh());

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
      setHeroAutoplay(true); // restart the dwell time after a manual jump
      break;
    }
    case "hero-prev": {
      e.preventDefault();
      setHeroSlide(heroIndex - 1);
      setHeroAutoplay(true);
      break;
    }
    case "hero-dot": {
      e.preventDefault();
      setHeroSlide(Number(el.dataset.index));
      setHeroAutoplay(true);
      break;
    }
    case "stage-goto": {
      // Scroll-showcase rail: glide to that chapter's part of the timeline.
      e.preventDefault();
      stageController?.goTo(Number(el.dataset.index) || 0);
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
