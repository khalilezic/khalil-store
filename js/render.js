/* ============================================================
   khalil store — page templates.
   --------------------------------------------------------
   Every render*() function returns an HTML string for the
   #app mount point. The router (app.js) wires up interactivity
   through global event delegation so these stay declarative
   and very easy to port to a framework later (React, Vue, etc.)
   ============================================================ */

import { PRODUCTS, CATEGORIES, HERO_IMAGE, getProductById, getRelatedProducts } from "./data.js";
import { ICONS, starRating } from "./icons.js";
import { formatPrice, escapeHtml, parseQuery } from "./utils.js";
import {
  isFavorite,
  getCartLinesWithProducts,
  cartSubtotal,
  SHIPPING_FLAT_RATE,
  getFavoriteProducts
} from "./store.js";

const categoryIcon = (type) => {
  const paths = {
    speed: '<path d="M4 16h11.5a4.5 4.5 0 1 0-4.2-6"/><path d="M4 12h6"/><path d="M4 20h14"/>',
    court: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4a12 12 0 0 1 0 16"/>',
    street: '<path d="m4 15 6-8 3 3 3-3 4 8"/><path d="M4 15h16M7 19h10"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 9-12h-7z"/>',
    slide: '<path d="M4 16c3-5 7-6 16-4v5H4z"/><path d="M7 17v2M11 17v2M15 17v2"/>',
    spark: '<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type] || paths.street}</svg>`;
};

/* ---------------- Shared bits ---------------- */

/** Toggle-favorite pill used on product cards and the PDP. */
function favButton(productId) {
  const fav = isFavorite(productId);
  return `
    <button class="fav-toggle ${fav ? "active" : ""}" data-action="toggle-fav" data-id="${productId}" aria-label="إضافة إلى المفضلة" aria-pressed="${fav}">
      ${ICONS.heart(fav)}
    </button>`;
}

/** Filter a sorted-on-render list of products into a responsive card grid. */
function productGrid(products) {
  if (!products.length) {
    return `
      <div class="empty-state">
        <h3>لم نعثر على منتجات</h3>
        <p>جرّب تعديل الفلاتر أو تغيير كلمة البحث.</p>
        <a href="#/shop" class="btn btn-primary" data-action="go-link">عرض كل الأحذية</a>
      </div>`;
  }
  return `<div class="product-grid">${products.map((product, index) => productCardHTML(product, index)).join("")}</div>`;
}

/** Standard product card used in every grid (home / shop / favorites / related). */
export function productCardHTML(product, index = 0) {
  let tag = "";
  if (product.tags.includes("sale")) {
    const pct = product.oldPrice
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : 0;
    tag = `<span class="badge-tag sale">-${pct}%</span>`;
  } else if (product.tags.includes("new")) {
    tag = `<span class="badge-tag new">جديد</span>`;
  } else if (product.tags.includes("bestseller")) {
    tag = `<span class="badge-tag">الأكثر مبيعًا</span>`;
  }

  return `
    <article class="product-card" data-product-id="${product.id}" style="--card-index:${index}">
      <a href="#/product/${product.id}" class="product-media" data-action="go-product" data-id="${product.id}">
        ${tag}
        ${favButton(product.id)}
        <img src="${product.images[0]}" alt="${escapeHtml(product.name)}" loading="lazy">
      </a>
      <a href="#/product/${product.id}" class="product-info" data-action="go-product" data-id="${product.id}">
        <span class="brand-tag">${escapeHtml(product.brand)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        ${starRating(product.rating, product.reviews)}
        <div class="price-row">
          <span class="price">${formatPrice(product.price)}</span>
          ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : ""}
        </div>
      </a>
      <div class="add-row">
        <button class="btn btn-primary btn-sm" data-action="quick-add" data-id="${product.id}">أضف إلى السلة</button>
      </div>
    </article>`;
}

/* ============================================================
   HOME PAGE
   Sections: hero · brand strip · categories · bestsellers · promo · new arrivals
   ============================================================ */
export function renderHome() {
  const bestsellers = PRODUCTS.filter((p) => p.tags.includes("bestseller")).slice(0, 4);
  const newArrivals = PRODUCTS.filter((p) => p.tags.includes("new")).slice(0, 4);
  const onSale      = PRODUCTS.filter((p) => p.tags.includes("sale")).slice(0, 2);
  const heroProducts = ["p4", "p8", "p7"].map((id) => getProductById(id)).filter(Boolean);
  const heroColors = { p4: "#118E97", p8: "#CE2633", p7: "#F08224" };

  return `
    <!-- HERO --------------------------------------------------------- -->
    <section class="hero">
      <div class="container">
        <div class="hero-copy">
          <span class="hero-eyebrow">
            <span class="dot"></span>
            موسم 2026 · الإصدار الجديد
          </span>
          <h1>أكثر من <span class="accent">حذاء</span>.<br>إنه أسلوب حياة.</h1>
          <p>علامات أصلية واتجاهات رائجة. انتقينا أحذية مصمَّمة لحركتك اليومية، لتقدّم لك تجربة شراء مختلفة كليًا.</p>
          <div class="hero-cta">
            <a href="#/shop" class="btn btn-primary" data-action="go-link">تسوّق الآن</a>
            <a href="#/shop?category=running" class="btn btn-outline" data-action="go-link">اكتشف أحذية الجري</a>
          </div>
          <div class="hero-stats">
            <div><b>+45</b><span>علامة عالمية</span></div>
            <div><b>+12k</b><span>عميل سعيد</span></div>
            <div><b>★ 4.8</b><span>متوسط التقييم</span></div>
          </div>
        </div>
        <div class="hero-media">
          <div class="layer-back"></div>
          <div class="layer-mid"></div>
          <div class="sneaker-stage">
            <div class="hero-carousel" aria-live="polite">
              ${heroProducts.map((product, index) => {
                const hex = heroColors[product.id] || product.colors?.[0]?.hex || "#BBC1CA";
                return `
                <a class="hero-slide ${index === 0 ? "active" : ""}" data-hero-slide="${index}" data-shoe-color="${hex}" href="#/product/${product.id}" data-action="go-product" aria-label="عرض ${escapeHtml(product.name)}">
                  <span class="hero-slide-backdrop-title" aria-hidden="true">${escapeHtml(product.name)}</span>
                  <img class="floating-sneaker" src="${product.images[0] || HERO_IMAGE}" alt="${escapeHtml(product.name)}">
                  <span class="hero-slide-copy">
                    <small>${escapeHtml(product.brand)} / ${escapeHtml(product.category)}</small>
                    <strong>${escapeHtml(product.name)}</strong>
                    <em>${formatPrice(product.price)}</em>
                  </span>
                </a>`;
              }).join("")}
            </div>
            <div class="hero-carousel-controls" aria-label="التحكم بعروض السنيكرز">
              <button type="button" class="carousel-btn" data-action="hero-prev" aria-label="السنيكرز السابق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
              <div class="carousel-dots">
                ${heroProducts.map((product, index) => `<button type="button" class="carousel-dot ${index === 0 ? "active" : ""}" data-action="hero-dot" data-index="${index}" aria-label="عرض ${index + 1}"></button>`).join("")}
              </div>
              <button type="button" class="carousel-btn" data-action="hero-next" aria-label="السنيكرز التالي"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>
            </div>
          </div>
          ${onSale[0] ? `
            <div class="hero-tag right">
              <div class="row">
                <span class="price-tag">${formatPrice(onSale[0].price)}</span>
                ${onSale[0].oldPrice ? `<span class="strikethrough">${formatPrice(onSale[0].oldPrice)}</span>` : ""}
              </div>
              <small>${escapeHtml(onSale[0].name)}</small>
            </div>` : ``}
        </div>
      </div>
    </section>

    <!-- BRAND STRIP -------------------------------------------------- -->
    <section class="brand-strip">
      <div class="container">
        <ul>
          <li>NIKE</li><li>ADIDAS</li><li>JORDAN</li><li>NEW BALANCE</li><li>UNDER ARMOUR</li><li>PUMA</li>
        </ul>
      </div>
    </section>

    <!-- CATEGORIES --------------------------------------------------- -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>تسوّق حسب <span class="light">الفئة</span></h2>
            <p class="sub">اعثر على الزوج المناسب لك تمامًا.</p>
          </div>
        </div>
        <div class="cat-grid">
          ${CATEGORIES.map(
            (c) => `
            <a class="cat-card" href="#/shop?category=${c.slug}" data-action="go-link">
              <div class="category-icon">${categoryIcon(c.icon)}</div>
              <span>${escapeHtml(c.name)}</span>
              <small>استكشف المجموعة</small>
            </a>`
          ).join("")}
        </div>
      </div>
    </section>

    <!-- BESTSELLERS -------------------------------------------------- -->
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>الأكثر <span class="light">طلبًا</span></h2>
            <p class="sub">اختيارات يحبّها مجتمعنا ويعود لطلبها.</p>
          </div>
          <a href="#/shop?sort=bestseller" class="see-all" data-action="go-link">
            عرض الكل ${ICONS.arrowRight()}
          </a>
        </div>
        ${productGrid(bestsellers)}
      </div>
    </section>

    <!-- PROMO BANNER ------------------------------------------------- -->
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="promo-banner">
          <div>
            <h2>خصم حتى <span class="silver-accent">45%</span><br>على اختيارات مختارة</h2>
            <p>لفترة محدودة فقط — اغتنم أحذية الأداء والستايل لهذا الموسم قبل نفاد الكميات.</p>
            <a href="#/shop?sort=sale" class="btn btn-primary" data-action="go-link">تسوّق التخفيضات</a>
          </div>
          <img src="${onSale[0] ? onSale[0].images[0] : PRODUCTS[0].images[0]}" alt="حذاء مميز ضمن التخفيضات">
        </div>
      </div>
    </section>

    <!-- NEW ARRIVALS ------------------------------------------------- -->
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>وصل <span class="light">حديثًا</span></h2>
            <p class="sub">وصلت حديثًا إلى مجموعتنا.</p>
          </div>
          <a href="#/shop?sort=newest" class="see-all" data-action="go-link">
            عرض الكل ${ICONS.arrowRight()}
          </a>
        </div>
        ${productGrid(newArrivals)}
      </div>
    </section>
  `;
}

/* ============================================================
   SHOP PAGE (with filter sidebar)
   ============================================================ */
export function renderShop(queryString) {
  const q = parseQuery(queryString);
  const activeCategories = q.category ? q.category.split(",") : [];
  const activeBrands     = q.brand ? q.brand.split(",") : [];
  const sort = q.sort || "featured";
  const search = q.q || "";
  const priceMax = q.priceMax ? Number(q.priceMax) : 200;

  // 1) Filter
  let list = PRODUCTS.filter((p) => {
    if (activeCategories.length && !activeCategories.includes(p.category)) return false;
    if (activeBrands.length && !activeBrands.includes(p.brand)) return false;
    if (p.price > priceMax) return false;
    if (search && !(p.name.toLowerCase().includes(search.toLowerCase())
                  || p.brand.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  // 2) Sort
  if (sort === "price-asc")  list = [...list].sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  else if (sort === "newest")      list = [...list].sort((a, b) => b.tags.includes("new") - a.tags.includes("new"));
  else if (sort === "bestseller")  list = [...list].sort((a, b) => b.tags.includes("bestseller") - a.tags.includes("bestseller"));
  else if (sort === "sale")        list = list.filter((p) => p.tags.includes("sale"));
  else if (sort === "rating")      list = [...list].sort((a, b) => b.rating - a.rating);

  // 3) UI strings
  const pageTitle =
    activeCategories.length === 1
      ? CATEGORIES.find((c) => c.slug === activeCategories[0])?.name || "المتجر"
      : "كل الأحذية";

  const chipAll = `<button class="chip ${activeCategories.length === 0 ? "active" : ""}" data-action="shop-category" data-value="">الكل</button>`;
  const chips = chipAll + CATEGORIES.map(
    (c) => `<button class="chip ${activeCategories.includes(c.slug) ? "active" : ""}" data-action="shop-category" data-value="${c.slug}">${escapeHtml(c.name)}</button>`
  ).join("");

  const brandBoxes = [...new Set(PRODUCTS.map((p) => p.brand))].map(
    (b) => `
      <label>
        <input type="checkbox" data-action="shop-brand" value="${escapeHtml(b)}" ${activeBrands.includes(b) ? "checked" : ""}>
        ${escapeHtml(b)}
      </label>`
  ).join("");

  return `
    <div class="container">
      <header class="shop-head">
        <div>
          <span class="shop-kicker">khalil store / collection</span>
          <h1>${escapeHtml(pageTitle)}</h1>
          <p>${list.length} منتج متاح — اختيارات منتقاة لحركتك اليومية</p>
        </div>
        <div class="shop-summary"><strong>${String(list.length).padStart(2, "0")}</strong><span>تصاميم<br>متاحة الآن</span></div>
      </header>

      <div class="filter-bar">${chips}</div>

      <div class="shop-layout">
        <aside>
          <div class="filter-group">
            <h4>البحث</h4>
            <div class="header-search" style="max-width:none;background:#fff;">
              ${ICONS.search()}
              <input id="shopSearchInput" type="text" placeholder="ابحث عن حذاء أو علامة…" value="${escapeHtml(search)}" data-action="shop-search">
            </div>
          </div>

          <div class="filter-group">
            <h4>العلامة التجارية</h4>
            ${brandBoxes}
          </div>

          <div class="filter-group">
            <h4>السعر الأقصى: ${formatPrice(priceMax)}</h4>
            <input type="range" min="40" max="200" step="5" value="${priceMax}" data-action="shop-price">
          </div>

          <div class="filter-group">
            <h4>ترتيب حسب</h4>
            <select data-action="shop-sort">
              <option value="featured"   ${sort === "featured"   ? "selected" : ""}>مميَّز</option>
              <option value="newest"     ${sort === "newest"     ? "selected" : ""}>الأحدث</option>
              <option value="bestseller" ${sort === "bestseller" ? "selected" : ""}>الأكثر مبيعًا</option>
              <option value="sale"       ${sort === "sale"       ? "selected" : ""}>التخفيضات</option>
              <option value="price-asc"  ${sort === "price-asc"  ? "selected" : ""}>السعر: من الأقل إلى الأعلى</option>
              <option value="price-desc" ${sort === "price-desc" ? "selected" : ""}>السعر: من الأعلى إلى الأقل</option>
              <option value="rating"     ${sort === "rating"     ? "selected" : ""}>الأعلى تقييمًا</option>
            </select>
          </div>
        </aside>

        <div>${productGrid(list)}</div>
      </div>
    </div>
  `;
}

/* ============================================================
   PRODUCT DETAIL PAGE
   ============================================================ */

// Transient state for the currently open product page (not persisted).
export const pdpState = { productId: null, color: null, size: null, qty: 1, activeImage: 0, activeTab: "description" };

export function renderProduct(id) {
  const product = getProductById(id);
  if (!product) return renderNotFound();

  // Reset state when switching between products
  if (pdpState.productId !== id) {
    pdpState.productId   = id;
    pdpState.color       = product.colors[0].name;
    pdpState.size        = null;
    pdpState.qty         = 1;
    pdpState.activeImage = 0;
    pdpState.activeTab   = "description";
  }

  const related = getRelatedProducts(product, 4);
  const fav     = isFavorite(product.id);
  const categoryName = CATEGORIES.find((c) => c.slug === product.category)?.name || "";

  return `
    <div class="container pdp">
      <nav class="breadcrumb">
        <a href="#/" data-action="go-link">الرئيسية</a>
        /
        <a href="#/shop" data-action="go-link">المتجر</a>
        /
        <a href="#/shop?category=${product.category}" data-action="go-link">${escapeHtml(categoryName)}</a>
        /
        <span>${escapeHtml(product.name)}</span>
      </nav>

      <div class="pdp-grid">
        <div class="pdp-gallery">
          <div class="pdp-gallery-main">
            <img src="${product.images[pdpState.activeImage]}" alt="${escapeHtml(product.name)}">
          </div>
          ${
            product.images.length > 1
              ? `<div class="pdp-thumbs">
                  ${product.images.map(
                    (img, i) => `
                    <button class="${i === pdpState.activeImage ? "active" : ""}" data-action="pdp-thumb" data-index="${i}" aria-label="صورة ${i + 1}">
                      <img src="${img}" alt="صورة مصغّرة ${i + 1}">
                    </button>`
                  ).join("")}
                </div>`
              : ""
          }
        </div>

        <div class="pdp-info">
          <span class="brand-tag">${escapeHtml(product.brand)}</span>
          <h1>${escapeHtml(product.name)}</h1>

          <div class="rating-row">
            ${starRating(product.rating, product.reviews)}
            <span class="dot"></span>
            <span>${product.reviews} تقييم</span>
          </div>

          <div class="pdp-price-row">
            <span class="price">${formatPrice(product.price)}</span>
            ${product.oldPrice ? `
              <span class="old-price">${formatPrice(product.oldPrice)}</span>
              <span class="badge-tag sale">-${Math.round((1 - product.price / product.oldPrice) * 100)}%</span>
            ` : ""}
          </div>

          <div class="option-row">
            <h4>
              <span>اللون</span>
              <span>${escapeHtml(pdpState.color)}</span>
            </h4>
            <div class="swatch-row">
              ${product.colors.map(
                (c) => `
                <button class="swatch ${c.name === pdpState.color ? "active" : ""}"
                        style="background:${c.hex}"
                        title="${escapeHtml(c.name)}"
                        data-action="pdp-color"
                        data-value="${escapeHtml(c.name)}"
                        aria-label="اللون ${escapeHtml(c.name)}"></button>`
              ).join("")}
            </div>
          </div>

          <div class="option-row">
            <h4>
              <span>اختر المقاس</span>
              <span>${pdpState.size ? "" : "يرجى اختيار المقاس"}</span>
            </h4>
            <div class="size-grid">
              ${product.sizes.map(
                (s) => `
                <button class="size-pill ${pdpState.size === s ? "active" : ""}"
                        data-action="pdp-size"
                        data-value="${s}"
                        aria-label="المقاس ${s}">${s}</button>`
              ).join("")}
            </div>
          </div>

          <div class="qty-row">
            <h4>الكمية</h4>
            <div class="qty-control">
              <button data-action="pdp-qty" data-dir="-1" aria-label="إنقاص">−</button>
              <span>${pdpState.qty}</span>
              <button data-action="pdp-qty" data-dir="1" aria-label="زيادة">+</button>
            </div>
          </div>

          <div class="pdp-actions">
            <button class="btn btn-primary" data-action="pdp-add-to-bag" data-id="${product.id}">أضف إلى السلة</button>
            <button class="icon-btn ${fav ? "active" : ""}"
                    data-action="toggle-fav"
                    data-id="${product.id}"
                    aria-label="إضافة إلى المفضلة"
                    aria-pressed="${fav}">
              ${ICONS.heart(fav)}
            </button>
          </div>

          <div class="pdp-perks">
            <div class="perk">${ICONS.truck()}  <span>شحن مجاني للطلبات فوق 75$. التوصيل خلال 2–4 أيام عمل.</span></div>
            <div class="perk">${ICONS.refresh()} <span>إرجاع واستبدال مجاني خلال 30 يومًا، دون أسئلة.</span></div>
            <div class="perk">${ICONS.shield()}  <span>أصلي 100%، من مصادر مباشرة للعلامات التي نختارها.</span></div>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn ${pdpState.activeTab === "description" ? "active" : ""}" data-action="pdp-tab" data-value="description">الوصف</button>
        <button class="tab-btn ${pdpState.activeTab === "specs"      ? "active" : ""}" data-action="pdp-tab" data-value="specs">التفاصيل</button>
        <button class="tab-btn ${pdpState.activeTab === "reviews"    ? "active" : ""}" data-action="pdp-tab" data-value="reviews">التقييمات (${product.reviews})</button>
      </div>

      <div class="tab-panel ${pdpState.activeTab === "description" ? "active" : ""}" data-tab="description">
        <p>${escapeHtml(product.description)}</p>
      </div>
      <div class="tab-panel ${pdpState.activeTab === "specs" ? "active" : ""}" data-tab="specs">
        <ul>
          ${product.specs.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
        </ul>
      </div>
      <div class="tab-panel ${pdpState.activeTab === "reviews" ? "active" : ""}" data-tab="reviews">
        ${sampleReviewsHTML()}
      </div>

      ${
        related.length
          ? `<div class="related-wrap">
              <div class="section-head"><div><h2>قد <span class="light">يعجبك</span> أيضًا</h2></div></div>
              ${productGrid(related)}
            </div>`
          : ""
      }
    </div>
  `;
}

/** A few sample reviews — static content, rich RTL display. */
function sampleReviewsHTML() {
  const base = [
    { name: "يوسف أ.", text: "مطابق تمامًا للصور، المقاس دقيق ومريح من أول لبسة.", stars: 5 },
    { name: "سارة ك.", text: "جودة عالية جدًا مقابل السعر. الشحن كان أسرع مما توقعت.", stars: 4 },
    { name: "عمر ب.", text: "اللون جميل ويليق مع كل شيء. سأشتريه مرة أخرى بكل تأكيد.", stars: 5 }
  ];
  return base.map(
    (r) => `
    <article class="review-item">
      <div class="r-head">
        <span>${escapeHtml(r.name)}</span>
        <span class="stars" aria-label="تقييم ${r.stars} من 5">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</span>
      </div>
      <p>${escapeHtml(r.text)}</p>
    </article>`
  ).join("");
}

/* ============================================================
   CART PAGE
   ============================================================ */
export function renderCart() {
  const lines = getCartLinesWithProducts();
  const subtotal = cartSubtotal();
  const shipping = lines.length === 0 ? 0 : SHIPPING_FLAT_RATE;
  const total = subtotal + shipping;

  if (!lines.length) {
    return `
      <div class="container cart-page">
        <h1>سلة مشترياتك</h1>
        <div class="empty-state">
          <h3>سلتك فارغة</h3>
          <p>لم تُضف أي منتج بعد. ابدأ من المتجر.</p>
          <a href="#/shop" class="btn btn-primary" data-action="go-link">تصفّح المتجر</a>
        </div>
      </div>`;
  }

  return `
    <div class="container cart-page">
      <h1>سلة مشترياتك (${lines.reduce((s, l) => s + l.qty, 0)})</h1>
      <div class="cart-layout">
        <div>
          ${lines.map(
            (l) => `
            <article class="cart-item">
              <div class="thumb"><img src="${l.product.images[0]}" alt="${escapeHtml(l.product.name)}"></div>
              <div>
                <h4>${escapeHtml(l.product.name)}</h4>
                <div class="meta">${escapeHtml(l.color)} · مقاس ${escapeHtml(String(l.size))}</div>
                <div class="qty-control">
                  <button data-action="cart-qty" data-index="${l.index}" data-dir="-1" aria-label="إنقاص">−</button>
                  <span>${l.qty}</span>
                  <button data-action="cart-qty" data-index="${l.index}" data-dir="1"  aria-label="زيادة">+</button>
                </div>
              </div>
              <div class="right-col">
                <span class="line-price">${formatPrice(l.product.price * l.qty)}</span>
                <button class="remove-link" data-action="cart-remove" data-index="${l.index}">حذف</button>
              </div>
            </article>`
          ).join("")}
        </div>

        <aside class="summary-card">
          <h3>ملخص الطلب</h3>
          <div class="summary-row"><span>المجموع الفرعي</span><span>${formatPrice(subtotal)}</span></div>
          <div class="summary-row"><span>الشحن</span><span>${shipping === 0 ? "مجاني" : formatPrice(shipping)}</span></div>
          <div class="promo-input">
            <input type="text" placeholder="رمز الخصم">
            <button class="btn btn-light btn-sm">تطبيق</button>
          </div>
          <div class="summary-row total"><span>الإجمالي</span><span>${formatPrice(total)}</span></div>
          <a href="#/checkout" class="btn btn-primary btn-block" data-action="go-link">إتمام الطلب</a>
          <a href="#/shop" class="btn btn-light btn-block" data-action="go-link">متابعة التسوّق</a>
        </aside>
      </div>
    </div>
  `;
}

/* ============================================================
   FAVORITES PAGE
   ============================================================ */
export function renderFavorites() {
  const items = getFavoriteProducts(); // ← fixed: previously used undefined `products` variable
  return `
    <div class="container fav-page">
      <h1>مفضلتك (${items.length})</h1>
      ${
        items.length
          ? productGrid(items)
          : `<div class="empty-state">
               <h3>لا توجد مفضلة بعد</h3>
               <p>اضغط على القلب بجانب أي حذاء لحفظه هنا.</p>
               <a href="#/shop" class="btn btn-primary" data-action="go-link">تصفّح الأحذية</a>
             </div>`
      }
    </div>
  `;
}

/* ============================================================
   CHECKOUT PAGE
   ============================================================ */
export function renderCheckout() {
  const lines = getCartLinesWithProducts();
  const subtotal = cartSubtotal();
  const shipping = lines.length ? SHIPPING_FLAT_RATE : 0;
  const total = subtotal + shipping;

  if (!lines.length) {
    return `
      <div class="container checkout-page">
        <h1>إتمام الطلب</h1>
        <div class="empty-state">
          <h3>سلتك فارغة</h3>
          <p>أضف منتجات إلى سلتك قبل إتمام الطلب.</p>
          <a href="#/shop" class="btn btn-primary" data-action="go-link">ابدأ التسوّق</a>
        </div>
      </div>`;
  }

  return `
    <div class="container checkout-page">
      <h1>إتمام الطلب</h1>
      <div class="checkout-layout">
        <form id="checkoutForm" class="form-grid" autocomplete="on">
          <div class="form-section-title">بيانات التواصل</div>

          <div class="field full">
            <label>البريد الإلكتروني</label>
            <input type="email" name="email" required placeholder="you@example.com">
          </div>
          <div class="field">
            <label>الاسم الأول</label>
            <input type="text" name="firstName" required placeholder="خليل">
          </div>
          <div class="field">
            <label>اسم العائلة</label>
            <input type="text" name="lastName" required placeholder="ناجي">
          </div>

          <div class="form-section-title">عنوان الشحن</div>

          <div class="field full">
            <label>العنوان</label>
            <input type="text" name="address" required placeholder="الشارع، رقم العمارة">
          </div>
          <div class="field">
            <label>المدينة</label>
            <input type="text" name="city" required placeholder="الدار البيضاء">
          </div>
          <div class="field">
            <label>الرمز البريدي</label>
            <input type="text" name="zip" required placeholder="20000">
          </div>
          <div class="field full">
            <label>الهاتف</label>
            <input type="tel" name="phone" required placeholder="+212 6 00 00 00 00">
          </div>

          <div class="form-section-title">طريقة الدفع</div>
          <div class="pay-methods" style="grid-column: 1/-1;">
            <div class="pay-chip active" data-action="pay-method" data-value="card">بطاقة بنكية</div>
            <div class="pay-chip"       data-action="pay-method" data-value="cod">الدفع عند الاستلام</div>
            <div class="pay-chip"       data-action="pay-method" data-value="paypal">PayPal</div>
          </div>

          <div id="cardFields" class="form-grid" style="grid-column: 1/-1; padding:0; border:0;">
            <div class="field full">
              <label>رقم البطاقة</label>
              <input type="text" inputmode="numeric" placeholder="4242 4242 4242 4242">
            </div>
            <div class="field">
              <label>تاريخ الانتهاء</label>
              <input type="text" placeholder="MM/YY">
            </div>
            <div class="field">
              <label>الرمز السري (CVC)</label>
              <input type="text" inputmode="numeric" placeholder="123">
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block checkout-submit" style="grid-column: 1/-1;">
            تأكيد الطلب — ${formatPrice(total)}
          </button>
        </form>

        <aside class="summary-card">
          <h3>ملخص الطلب</h3>
          ${lines.map(
            (l) => `
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
              <div style="width:56px;height:56px;background:var(--paper-2);border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                <img src="${l.product.images[0]}" style="width:80%;height:80%;object-fit:contain;" alt="${escapeHtml(l.product.name)}">
              </div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:13.5px;">${escapeHtml(l.product.name)}</div>
                <div style="font-size:12px;color:var(--muted);">الكمية ${l.qty} · مقاس ${escapeHtml(String(l.size))}</div>
              </div>
              <div style="font-family:var(--font-en);font-weight:800;font-size:14px;">${formatPrice(l.product.price * l.qty)}</div>
            </div>`
          ).join("")}
          <div class="summary-row"><span>المجموع الفرعي</span><span>${formatPrice(subtotal)}</span></div>
          <div class="summary-row"><span>الشحن</span><span>${shipping === 0 ? "مجاني" : formatPrice(shipping)}</span></div>
          <div class="summary-row total"><span>الإجمالي</span><span>${formatPrice(total)}</span></div>
        </aside>
      </div>
    </div>
  `;
}

export function renderOrderSuccess(orderNumber, total) {
  return `
    <div class="container">
      <div class="order-success">
        <div class="check-circle">${ICONS.check()}</div>
        <h1>تم تأكيد طلبك!</h1>
        <p>شكرًا لتسوّقك من khalil store. ستصلك رسالة تأكيد قريبًا، وسيتم شحن طلبك خلال 2–4 أيام عمل.</p>
        <div class="order-num">رقم الطلب ${escapeHtml(orderNumber)} · ${formatPrice(total)}</div>
        <a href="#/shop" class="btn btn-primary btn-block" data-action="go-link">متابعة التسوّق</a>
      </div>
    </div>
  `;
}

/* ============================================================
   ABOUT / CONTACT PAGE
   ============================================================ */
export function renderAbout() {
  return `
    <section class="about-hero">
      <div class="container">
        <h1>أكثر من مجرد <span class="silver-accent">متجر</span></h1>
        <p>khalil store ينتقي الأحذية التي تستحق أن ترتديها كل صباح — علامات أصلية، أسعار عادلة، وفريق يعرف ما يبيعه فعلًا.</p>
      </div>
    </section>

    <div class="container">
      <section class="perks-strip">
        <div class="perk-card"><div class="ic">${ICONS.shield()}</div><h4>أصلي 100%</h4><p>مصدر مباشر من العلامات التي نحملها فقط.</p></div>
        <div class="perk-card"><div class="ic">${ICONS.truck()}</div><h4>شحن لكل المدن</h4><p>2–4 أيام عمل لكل طلب، دون استثناء.</p></div>
        <div class="perk-card"><div class="ic">${ICONS.refresh()}</div><h4>إرجاع سهل</h4><p>30 يومًا، دون أسئلة أو عراقيل.</p></div>
        <div class="perk-card"><div class="ic">${ICONS.user()}</div><h4>دعم حقيقي</h4><p>بشر يردون عليك خلال ساعات، لا روبوتات.</p></div>
      </section>

      <section class="contact-grid">
        <div class="contact-card">
          <h3>تواصل معنا</h3>
          <div class="contact-row">${ICONS.phone()} <div><b>+212 6 12 34 56 78</b><small>الإثنين–السبت، 9:00–20:00</small></div></div>
          <div class="contact-row">${ICONS.mail()} <div><b>info@stride-store.com</b><small>نرد خلال ساعات قليلة</small></div></div>
          <div class="contact-row">${ICONS.pin()} <div><b>الدار البيضاء، المغرب</b><small>العرض بموعد مسبق</small></div></div>

          <form style="margin-top:24px;" data-action="contact-form">
            <div class="field"><input type="text" placeholder="اسمك" required></div>
            <div class="field"><input type="email" placeholder="بريدك الإلكتروني" required></div>
            <div class="field"><textarea rows="4" placeholder="رسالتك"></textarea></div>
            <button type="submit" class="btn btn-primary btn-block" style="margin-top:14px;">إرسال الرسالة</button>
          </form>
        </div>

        <div class="map-box">
          <iframe loading="lazy" src="https://maps.google.com/maps?q=Casablanca%2C%20Morocco&t=&z=13&ie=UTF8&iwloc=&output=embed" allowfullscreen></iframe>
        </div>
      </section>
    </div>
  `;
}

/* ============================================================
   404 PAGE
   ============================================================ */
export function renderNotFound() {
  return `
    <div class="container">
      <div class="empty-state" style="padding:120px 10px;">
        <h3>الصفحة غير موجودة</h3>
        <p>الصفحة التي تبحث عنها غير متاحة أو تم نقلها.</p>
        <a href="#/" class="btn btn-primary" data-action="go-link">العودة إلى الرئيسية</a>
      </div>
    </div>
  `;
}
