/* ============================================================
   khalil store — inline SVG icon library.
   --------------------------------------------------------
   All icons live here so the app stays dependency-free (no icon
   font, no external sprite). Pass plain functions, not React
   components, because render.js produces HTML strings.
   Each icon takes (filled?: boolean) where it makes sense.
   ============================================================ */

const baseProps = (size = 19) => `width="${size}" height="${size}" viewBox="0 0 24 24"`;

export const ICONS = {
  heart: (filled = false) => `
    <svg ${baseProps()} fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
      <path d="M20.8 4.6c-1.9-1.9-5-1.9-6.9 0L12 5.5l-1.9-1.9c-1.9-1.9-5-1.9-6.9 0-1.9 1.9-1.9 5 0 6.9L12 19l8.8-8.5c1.9-1.9 1.9-5 0-6.9z"/>
    </svg>`,

  cart: () => `
    <svg ${baseProps()} fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>`,

  search: () => `
    <svg ${baseProps()} fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="M21 21l-4.35-4.35"></path>
    </svg>`,

  user: () => `
    <svg ${baseProps()} fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>`,

  home: () => `
    <svg ${baseProps(20)} fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <path d="M9 22V12h6v10"></path>
    </svg>`,

  star: () => `
    <svg ${baseProps(13)} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l6.91-1.01z"/>
    </svg>`,

  menu: () => `
    <svg ${baseProps(22)} fill="none" stroke="currentColor" stroke-width="2">
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>`,

  close: () => `
    <svg ${baseProps()} fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`,

  arrowRight: () => `
    <svg ${baseProps(16)} fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>`,

  truck: () => `
    <svg ${baseProps(20)} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="3" width="15" height="13"></rect>
      <path d="M16 8h4l3 3v5h-7V8z"></path>
      <circle cx="5.5" cy="18.5" r="1.5"></circle>
      <circle cx="18.5" cy="18.5" r="1.5"></circle>
    </svg>`,

  shield: () => `
    <svg ${baseProps(20)} fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>`,

  refresh: () => `
    <svg ${baseProps(20)} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
    </svg>`,

  pin: () => `
    <svg ${baseProps(18)} fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>`,

  phone: () => `
    <svg ${baseProps(18)} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>`,

  mail: () => `
    <svg ${baseProps(18)} fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"></rect>
      <polyline points="3,7 12,13 21,7"></polyline>
    </svg>`,

  check: () => `
    <svg ${baseProps(36)} fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`
};

/**
 * Render a 5-star row + label like "4.8 (236)".
 * Used on cards and the PDP rating block — outputs a string of HTML.
 */
export function starRating(rating, reviews) {
  const full = Math.round(rating);
  const safeRating = Number(rating) || 0;
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span style="opacity:${i < full ? 1 : 0.25}">${ICONS.star()}</span>`
  ).join("");
  return `
    <div class="rating">
      <span class="stars">${stars}</span>
      <span class="count">${safeRating.toFixed(1)}${reviews ? ` <span style="color:var(--muted-2)">( ${reviews} )</span>` : ""}</span>
    </div>`;
}
