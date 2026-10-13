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


---

## v4 — Ciro-style scroll scene (الحلقة السينمائية)

The home hero + showcase were replaced by one full-screen sticky scene
(`js/scene.js`, markup in `renderScene()` inside `js/render.js`, styles in the
`CIRO-STYLE SCROLL SCENE` block of `css/style.css`):

1. **Line-up** — 9 sneakers on a curved 3D arc; arrows, swipe, click or ←/→ pick one.
2. **Chapters** — scrolling brings the chosen shoe forward, floods the scene with its
   colour, and reads 5 chapters (name + 4 specs from `data.js`) beside a numbered rail.
3. **Finale** — giant ghost headline behind the shoe + buy button.
4. Below: `THE LINEUP.` diagonal row and an Arabic FAQ.

Edit the shoes/colours in `SCENE_SHOES` (render.js). Reduced-motion visitors get a static stack.

---

## v5 — 3D detail camera + smoothness

- Scroll progress is eased per frame (time-based), DOM refs cached, unchanged styles skipped.
- Each chapter flies a camera to a different part of the shoe (upper, midsole, outsole, toe, heel) with a pin + caption, while the shoe swings in 3D (layered thickness) and spins a full turn in the finale.
- Camera targets per shoe: `SHOE_BOX`, `TOE_RIGHT`, `REGION_INFO` in `js/render.js`; swing angles: `KF` in `js/scene.js`.
- Lag fixes: no global `--site-color` transition or pointer-driven ambient wash on the home page, no per-image drop-shadow filters, header blur off on home.

---

## v6 — real 3D shoe (WebGL, no library)

`js/shoe3d.js` turns each product photo into an actual mesh: the alpha mask becomes a distance
field, is inflated into a depth map, and a front + back surface are welded at the silhouette.
Real normals give true lighting, specular and a rim light in the stage colour, and the camera
matches the CSS stage (perspective 1500px), so the model lands exactly where the flat image was.
`js/scene.js` drives it (swing angles `KF`, light sweep, adaptive resolution on slow devices).
If WebGL is unavailable the previous CSS layered fallback is used automatically.
Serve over http (`python3 -m http.server`) — WebGL textures can't load from `file://`.

---

## v7 — shape-preserving 3D (no more warped shoes)

`js/shoe3d.js` no longer "inflates" the photo into a pillow (that bent the texture and stretched
the sole/toe when rotated). Now each shoe is a **flat slab with a short rounded bevel**:

- front/back faces are perfectly flat, so the photo keeps its exact proportions and details;
- depth exists only as a thin bevel along the silhouette (3% of image width) + thickness capped by shoe height;
- grid raised to 190 columns for a cleaner silhouette; lighting keeps the photo's own colours
  (only the rim picks up the stage colour);
- `js/scene.js`: swing angles reduced (max ±20°) and the finale is a gentle ±22° sway that settles
  facing front, instead of a full 360° turn (a flat photo seen edge-on looks like cardboard).

Tuning knobs in `build()`: `HALF` (thickness), `BEVEL` (rim width); `KF` + the finale line in `scene.js` (angles).
Note: a photo can never reveal the far side of a shoe — for true 360° views, add real GLB models.
