# Khalil Store — Dynamic Streetwear Sneaker Storefront

A complete, dependency-free sneaker/shoe e-commerce storefront in a
bold streetwear style with a live sneaker-color theme. Built as plain HTML/CSS/JS (ES
modules) — no framework, no build step, no backend — so it is easy to
open, read and hand off to any other AI model or developer.

---

## What's new in v2

The original `shoe-store-arabic-premium` zip was already a clean
plain-JS rebuild of the original React/Vite/Manus starter kit. This v2
keeps **every piece of functionality intact** (catalog, cart,
favorites, checkout, order receipt, RTL Arabic copy, hash router,
localStorage persistence) and improves two layers:

### 1. Visual identity (design system)

- **Live sneaker palette** → every hero slide changes the site-wide
  accent and tinted surfaces; the full-page color wash fades elegantly
  into graphite black while product cards stay crisp and readable.
- **Streetwear typography** → heavy Arabic Cairo paired with compact,
  athletic Barlow Condensed for Latin headings, prices and labels.
- **Atmosphere** → shoe-matched color washes over deep black gradients,
  animated across the page and softly following the pointer; no flashlight
  or slide-driven shadow is applied to the sneaker.
- **Storefront details** → large cards, pill controls, and a floating
  bottom dock with a sliding light indicator that follows the live theme.

Design tokens live on `:root` in `css/style.css`; the hero carousel updates
`--site-color` at runtime so the whole storefront follows the active shoe.

### 2. Bug fixes
The original had two regressions that made the build feel unfinished:

| Where | Old | New |
|-------|-----|-----|
| `render.js` → `renderFavorites()` | referenced an **undefined `products`** variable | calls `getFavoriteProducts()` correctly |
| `render.js` → checkout / cart strings | mixed English fragments like `"Start المتجرping"`, `"بطاقة بنكية number"` | fully Arabic, RTL-friendly labels |

---

## Project structure

```
stride-v2/
├── index.html         # single HTML shell (header / footer / bottom nav / #app mount)
├── css/
│   └── style.css      # complete design system (tokens + components + responsive)
├── js/
│   ├── data.js        # 12 products, categories, image map — swap for an API later
│   ├── store.js       # cart + favorites state, localStorage persistence
│   ├── icons.js       # inline SVG icon library (no icon font dependency)
│   ├── utils.js       # formatPrice, escape, parseQuery, debounce, order number
│   ├── render.js      # pure render* functions, one per page
│   └── app.js          # hash router, event delegation, toast, badges, mobile menu
└── README.md
```

## Pages implemented

- **Home** (`#/`) — layered hero, brand strip, categories, bestsellers,
  promo banner, new arrivals.
- **Shop** (`#/shop?category=&brand=&sort=&q=&priceMax=`) — category
  chips, brand checkboxes, price slider, sort dropdown, live debounced
  search, responsive grid.
- **Product detail** (`#/product/:id`) — image gallery + thumbs,
  color swatches, size pills, quantity stepper, add-to-cart,
  description / specs / reviews tabs, related products.
- **Cart** (`#/cart`) — line items, quantity controls, promo input,
  summary card.
- **Favorites** (`#/favorites`) — heart-toggled wishlist.
- **Checkout** (`#/checkout`) — address + payment form → generates an
  order number, clears the cart, lands on the receipt.
- **Order success** (`#/order-success`) — confirmation screen.
- **About / contact** (`#/about`) — brand story, trust badges,
  contact form, embedded map.
- **404** for unknown routes.

## How to run

ES module imports are blocked on `file://`, so use any tiny static
server:

```bash
cd stride-v2
python3 -m http.server 8080
# open http://localhost:8080
```

Or `npx serve .`, or drop the folder onto Netlify Drop / Vercel /
GitHub Pages — all of them serve it correctly as-is.

## How to extend

- **Real backend** → replace `data.js` with `fetch` calls; every other
  file only uses `PRODUCTS` and `getProductById`, so nothing else
  needs to change.
- **Real payments** → `app.js` → `wireCheckoutForm()` and
  `store.js.clearCart()` are the two touch-points.
- **Port to React / Vue / Next** → each `render*()` function maps 1:1
  to a future page component; `store.js` maps 1:1 to a future cart
  store (Zustand / Pinia / Context).
- **Product images** → the `IMG` map at the top of `data.js` is the
  only place image URLs live; swap in real photography here and
  every product automatically updates.

---

## v3 — cinematic scroll showcase

The storefront keeps every page, route and interaction of v2 and adds one
scroll-driven scene on the home page (`js/stage.js` + the `CINEMATIC SCROLL
SHOWCASE` block in `css/style.css`):

- three catalogue sneakers share one sticky stage; scrolling walks the line-up,
  steps one shoe into the middle and lets the others recede and dim;
- the scene light crossfades to the tone of the sneaker on stage (hue taken from
  `product.colors[0].hex`, clamped by `accentTone()` so white/black shoes still
  read as light);
- that shoe's real feature callouts (`product.specs`) plus brand, category,
  price, rating and sizes assemble around it, then hand over to the next one;
- a product rail under the stage mirrors the chapters and jumps between them;
- the hero slides themselves now leave as a three-layer camera move (scene,
  shoe, information) with a 0.12s overlap instead of a flat crossfade.

Implementation notes that keep it honest:

- **No invented assets** — only the existing `assets/*-transparent.png`
  photography and `js/data.js` copy; no burger/drink imagery, no 3D claims.
- **Cheap by design** — transform/opacity only, one ScrollTrigger for the whole
  scene (`scrub`), grouped reveal triggers elsewhere, no pinning (CSS
  `position: sticky` does the hold), and per-route cleanup of every trigger,
  tween and inline style.
- **Reduced motion** — `prefers-reduced-motion: reduce` renders the same section
  as a plain stacked layout (`[data-stage-mode="static"]`), and the hero falls
  back to a CSS crossfade.
- **Self-contained runtime** — GSAP 3.12.5 (`js/vendor/`) and Cairo /
  Barlow Condensed (`assets/fonts/`, OFL) are served from the repo, so the store
  has no third-party CDN dependency.
