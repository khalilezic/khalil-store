# STRIDE — Premium Sneaker Store v2 (static front-end)

A complete, dependency-free sneaker/shoe e-commerce storefront in a
warm editorial-meets-sport-tech style. Built as plain HTML/CSS/JS (ES
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
Tokens were extracted from the four reference mockups the user
provided:

- **ATLETE TREND** → warm off-white background (`--paper: #FAFAF7`),
  pure white product cards, pure black ink CTAs, gold star ratings.
- **Nike luxury mockups** → editorial layered hero, deep black pill
  CTAs, organic backdropped product photography.
- **Streetwear 3D concept** → large `20–28px` card radii, pill chips,
  dual CTA dock, sticky share bar in checkout.
- **Learn up concept** → high-contrast monochrome hero, line-art
  accents, premium serif-on-sans pairing.

All tokens are defined as CSS variables on `:root` in `css/style.css`,
so any future tweak is a one-line change.

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
