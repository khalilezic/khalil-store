/* ============================================================
   khalil store — static product catalog.
   --------------------------------------------------------
   This file is intentionally the only place product data lives.
   Every other module imports PRODUCTS / getProductById, so you
   can swap this out for a real API (Strapi, Shopify Storefront,
   Medusa, a custom backend, etc.) without touching the renders.
   ============================================================ */

/** Top-level categories shown on the home + shop chips/filters. */
export const CATEGORIES = [
  { slug: "running",    name: "الجري",       icon: "speed" },
  { slug: "basketball", name: "كرة السلة",   icon: "court" },
  { slug: "lifestyle",  name: "ستايل يومي",  icon: "street" },
  { slug: "training",   name: "التدريب",     icon: "bolt" },
  { slug: "slides",     name: "شبشب رياضي", icon: "slide" },
  { slug: "kids",       name: "الأطفال",     icon: "spark" }
];

/** Brand list shown in the hero strip and filters. */
export const BRANDS = ["Nike", "Adidas", "New Balance", "Under Armour", "Puma", "Jordan"];

/**
 * Image map. Every product references one of these keys, so
 * re-skinning the catalog with new photography only touches
 * this object (and the `images` arrays on each product).
 */
const IMG = {
  runner:   "assets/runner-transparent.png",
  hoop:     "assets/hoop-transparent.png",
  cream:    "assets/cream-transparent.png",
  trail:    "assets/p4-transparent.png",
  slide:    "assets/slide-transparent.png",
  whiteLow: "assets/whiteLow-transparent.png",
  knit:     "assets/p7-transparent.png",
  fire:     "assets/p8-transparent.png",
  navy:     "assets/navy-transparent.png",
  blackout: "assets/blackout-transparent.png",
  hero:     "assets/hero-transparent.png",
  logo:     "https://media.base44.com/images/public/6a981e557cb6d3db946f8ae9/9a55004e0_generated_image.png"
};

/** Hoisted constants so render.js doesn't need IMG.x lookups. */
export const HERO_IMAGE = IMG.hero;
export const LOGO_IMAGE = IMG.logo;

/** Adult EU sizing grid (climbing down to kids). */
const SIZES_ADULT = [38, 39, 40, 41, 42, 43, 44, 45];
const SIZES_KIDS  = [28, 29, 30, 31, 32, 33];

/**
 * PRODUCT CATALOG — 12 sneakers.
 * Tags drive filter chips, sort options, badges on cards, the
 * "bestseller" grid on the home page, etc. Valid tags:
 *   "new", "sale", "bestseller"
 */
export const PRODUCTS = [
  {
    id: "p1",
    name: "Air Pulse Runner",
    brand: "Nike",
    category: "running",
    price: 120,
    oldPrice: 150,
    rating: 4.8,
    reviews: 236,
    colors: [{ name: "أبيض وأسود", hex: "#f5f5f5" }, { name: "أسود فحمي", hex: "#111111" }],
    sizes: SIZES_ADULT,
    images: [IMG.runner, IMG.whiteLow],
    tags: ["new", "sale"],
    description: "حذاء تدريب يومي خفيف الوزن بنعل أوسط إسفنجي سريع الاستجابة. الجزء العلوي شبكي يسمح بالتهوية في الجري الطويل، والنعل المنحوت يقبض على الأرض الرطبة.",
    specs: ["جزء علوي شبكي مسامي", "نعل أوسط إسفنجي سريع الاستجابة", "نعل مطاطي متين", "عاكس خلفي للرؤية الليلية"]
  },
  {
    id: "p2",
    name: "Shadow High Hoop",
    brand: "Jordan",
    category: "basketball",
    price: 150,
    rating: 4.9,
    reviews: 412,
    colors: [{ name: "أسود ثلاثي", hex: "#0b0b0c" }],
    sizes: SIZES_ADULT,
    images: [IMG.hoop, IMG.blackout],
    tags: ["bestseller"],
    description: "حذاء بكعب مرتفع مصمَّم للانطلاق السريع والحركات الجانبية. ياقة مبطنة تثبّت الكاحل دون التضحية بالحركة.",
    specs: ["دعم كعب مرتفع للكاحل", "وحدة توسيد زووم إير", "نمط جيرنجيبون للثبات", "حماية معززة لمقدمة الحذاء"]
  },
  {
    id: "p3",
    name: "Cloud Walk Lifestyle",
    brand: "New Balance",
    category: "lifestyle",
    price: 110,
    rating: 4.6,
    reviews: 158,
    colors: [{ name: "كريم", hex: "#efe6d8" }, { name: "رمل", hex: "#d8c9ad" }],
    sizes: SIZES_ADULT,
    images: [IMG.cream],
    tags: ["new"],
    description: "تصميم هادئ وناعم للاستخدام اليومي. لوحات من الجلد السويدي وياقة مبطنة تمنحه مظهرًا بسيطًا وأنيقًا يقترن بكل شيء.",
    specs: ["جزء علوي من الجلد السويدي والشبك", "نعل داخلي مريح EVA", "نعل مطاطي خفيف الوزن", "شكل كلاسيكي بكعب منخفض"]
  },
  {
    id: "p4",
    name: "Trail Blaze Pro",
    brand: "Adidas",
    category: "running",
    price: 135,
    oldPrice: 170,
    rating: 4.7,
    reviews: 94,
    colors: [{ name: "تركوازي/ليموني", hex: "#1f8a8c" }],
    sizes: SIZES_ADULT,
    images: [IMG.trail],
    tags: ["sale"],
    description: "مصمم للأراضي الوعرة. نعل بمسامير متعددة الاتجاهات يعضّ الطين والحصى، بينما حافة واقية تحمي مقدمة القدم من الصخور والجذور.",
    specs: ["مسامير متعددة الاتجاهات", "طلاء علوي مقاوم للماء", "حماية لمقدمة القدم", "لوح صخري أسفل القدم"]
  },
  {
    id: "p5",
    name: "Comfort Slide",
    brand: "Puma",
    category: "slides",
    price: 45,
    rating: 4.4,
    reviews: 301,
    colors: [{ name: "أسود", hex: "#111111" }],
    sizes: SIZES_ADULT,
    images: [IMG.slide],
    tags: [],
    description: "الأساس بعد التمرين. فراش ملتف حول القدم والشريط العريض يبقيه ثابتًا في غرف الملابس وأحواض السباحة الرطبة.",
    specs: ["فراش منحوت مريح", "شريط صناعي يجف بسرعة", "نعل مضاد للانزلاق"]
  },
  {
    id: "p6",
    name: "Classic Leather Low",
    brand: "Nike",
    category: "lifestyle",
    price: 95,
    rating: 4.5,
    reviews: 267,
    colors: [{ name: "أبيض", hex: "#ffffff" }],
    sizes: SIZES_ADULT,
    images: [IMG.whiteLow],
    tags: ["bestseller"],
    description: "كلاسيكي مستوحى من ملاعب التنس بجلد حقيقي كامل. خطوط نظيفة ولون أبيض يجعله الحذاء الأسهل في تنسيق ملابسك.",
    specs: ["جلد طبيعي كامل الحبوب", "مقدمة مثقوبة للتهوية", "نعل مطاطي بنمط جيرنجيبون"]
  },
  {
    id: "p7",
    name: "Flex Knit Trainer",
    brand: "Under Armour",
    category: "training",
    price: 89,
    rating: 4.3,
    reviews: 77,
    colors: [{ name: "رمادي/برتقالي", hex: "#9aa0a6" }],
    sizes: SIZES_ADULT,
    images: [IMG.knit],
    tags: ["new"],
    description: "حذاء تدريب مرن يتحرك معك في الدوائر والسرعات والتمارين الجانبية. قاعدة عريضة تمنحك ثباتًا عاليًا تحت الحمل.",
    specs: ["جزء علوي مرن بأربع جهات", "قاعدة عريضة مستقرة", "نعل متعدد الأسطح"]
  },
  {
    id: "p8",
    name: "Fire Strike",
    brand: "Adidas",
    category: "basketball",
    price: 140,
    oldPrice: 165,
    rating: 4.6,
    reviews: 189,
    colors: [{ name: "أحمر/أسود", hex: "#b1272c" }],
    sizes: SIZES_ADULT,
    images: [IMG.fire],
    tags: ["sale"],
    description: "تصميم هجومي للاعبين الذين يعيشون فوق الحلبة. توسيد مزدوج الكثافة يمتص الصدمة ويحافظ على الاستجابة عند الانطلاق.",
    specs: ["توسيد مزدوج الكثافة", "دعامة التواء", "نمط جر كامل الطول"]
  },
  {
    id: "p9",
    name: "Heritage Canvas",
    brand: "New Balance",
    category: "lifestyle",
    price: 75,
    rating: 4.2,
    reviews: 64,
    colors: [{ name: "كحلي", hex: "#1f2a44" }],
    sizes: SIZES_ADULT,
    images: [IMG.navy],
    tags: [],
    description: "حذاء كانفاس مريح بروح كلاسيكية. كانفاس قطني ناعم ونعل مطاطي مفلكن يمنحان إحساسًا مريحًا منذ أول لبسة.",
    specs: ["جزء علوي كانفاس قطني", "نعل مطاطي مفلكن", "ياقة مبطنة للراحة"]
  },
  {
    id: "p10",
    name: "Midnight Edition",
    brand: "Nike",
    category: "lifestyle",
    price: 160,
    rating: 4.9,
    reviews: 522,
    colors: [{ name: "أسود بالكامل", hex: "#0b0b0c" }],
    sizes: SIZES_ADULT,
    images: [IMG.blackout],
    tags: ["bestseller", "new"],
    description: "الأيقونة الأكثر شهرة، أُعيد تصميمها بنسخة سوداء بالكامل. مواد فاخرة في كل مكان تجعلها القطعة المميزة في التشكيلة.",
    specs: ["جلد ونوبوك فاخر بلون موحَّد", "توسيد Air محصور", "لمسات منتهية يدويًا"]
  },
  {
    id: "p11",
    name: "Junior Sprint",
    brand: "Nike",
    category: "kids",
    price: 60,
    rating: 4.5,
    reviews: 48,
    colors: [{ name: "أبيض وأسود", hex: "#f5f5f5" }],
    sizes: SIZES_KIDS,
    images: [IMG.runner],
    tags: ["new"],
    description: "مصغَّر للأقدام الصغيرة بنفس تكنولوجيا التوسيد الخاصة بالبالغين. شريط فيلكرو يسهّل لبسه على الطفل بنفسه.",
    specs: ["إغلاق بشريط فيلكرو", "حماية لمقدمة القدم", "نعل أوسط إسفنجي خفيف"]
  },
  {
    id: "p12",
    name: "Pegasus Trail Lite",
    brand: "Nike",
    category: "running",
    price: 120,
    rating: 4.7,
    reviews: 143,
    colors: [{ name: "تركوازي/ليموني", hex: "#1f8a8c" }, { name: "أبيض وأسود", hex: "#f5f5f5" }],
    sizes: SIZES_ADULT,
    images: [IMG.trail, IMG.runner],
    tags: [],
    description: "النسخة الجاهزة للممرات من حذاء الجري الأكثر ثقةً. لوح صخري ونعل مسنن يمنحان الثقة على الطرقات الوعرة دون فقدان الراحة.",
    specs: ["حماية بلوح صخري", "نعل مسنن متعدد الأسطح", "جزء علوي شبكي مسامي"]
  }
];

/** Look up a single product by id (or null). */
export function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

/**
 * Return up to `limit` products related to `product`
 * (same category OR same brand, excluding the product itself).
 */
export function getRelatedProducts(product, limit = 4) {
  return PRODUCTS.filter(
    (p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand)
  ).slice(0, limit);
}
