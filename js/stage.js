/* ============================================================
   khalil store — cinematic scroll showcase controller.
   ------------------------------------------------------------
   What this does, in one paragraph:
     The home page carries one sticky "stage" (see renderShowcase in
     render.js). While the visitor scrolls through it, three catalogue
     sneakers are choreographed like a film scene: they stand together
     as a group, then one steps into the light, its feature callouts
     assemble around it, the scene light crossfades to that shoe's own
     colour, and the next shoe takes the spotlight the same way.

   Why it is built this way:
     · CSS position:sticky does the "hold" — no JS pinning, no layout
       spacer, no jump when the scene releases.
     · ScrollTrigger only *scrubs* one timeline (exactly one trigger),
       so scroll direction, velocity and page height stay native.
     · Every per-frame property is transform or opacity. The colour
       change is a discrete crossfade between three pre-painted
       gradients, and --site-color updates only when a chapter flips.
     · No motion at all for prefers-reduced-motion (the section falls
       back to the static stacked layout in css/style.css).

   Markup contract (render.js → renderShowcase):
     [data-showcase]            section root, --stage-chapters:N
     [data-stage-panel="i"]     panel i (carries --panel-tone)
     .stage-shoe-layer          the layer that travels between slots
     .stage-shoe / .stage-pool  parallax + light pool inside the layer
     .stage-meta / .stage-feature / .stage-line   assembling content
     [data-stage-tone="i"]      scene light for product i
     [data-stage-bar="i"]       rail progress bar for chapter i
     [data-action="stage-goto"]  rail button (handled in app.js)
   ============================================================ */

import { prefersReducedMotion } from "./utils.js";

const NARROW_QUERY = "(max-width: 880px)";

/** Parked / focused geometry of panel `index` while chapter `active` runs. */
function slotFor(index, active) {
  const distance = index - active;
  const step = Math.min(Math.abs(distance), 2);
  if (step === 0) return { x: 0, scale: 1, alpha: 1, z: 30 };

  const narrow = window.matchMedia(NARROW_QUERY).matches;
  const park = narrow ? 46 : 74;
  const x = (distance > 0 ? -1 : 1) * (park + (step - 1) * (narrow ? 18 : 26));
  return {
    x,
    scale: step === 1 ? .74 : .6,
    alpha: step === 1 ? .42 : .12,
    z: step === 1 ? 20 : 12
  };
}

/** Opening arrangement: the whole line-up standing together, nobody featured. */
function groupSlot(index, total) {
  const middle = (total - 1) / 2;
  const spacing = window.matchMedia(NARROW_QUERY).matches ? 52 : 84;
  return {
    x: (middle - index) * spacing,
    scale: .68,
    alpha: .84,
    z: index === Math.round(middle) ? 26 : 16
  };
}

/**
 * Wire the scroll-driven showcase.
 * @param {HTMLElement} section the [data-showcase] element
 * @returns {{ goTo: (i:number)=>void, destroy: ()=>void } | null}
 */
export function initStageCinema(section) {
  if (!section) return null;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const panels = [...section.querySelectorAll("[data-stage-panel]")];

  /** Anything missing → the CSS static layout takes over. */
  const fallBackToStatic = () => {
    section.dataset.stageMode = "static";
    return null;
  };

  if (panels.length < 2 || !gsap || !ScrollTrigger || prefersReducedMotion()) return fallBackToStatic();

  const total = panels.length;
  const pick = (selector) => panels.map((panel) => panel.querySelector(selector));
  const pickAll = (selector) => panels.map((panel) => [...panel.querySelectorAll(selector)]);

  const shoeLayers = pick(".stage-shoe-layer");
  const shoes = pick(".stage-shoe");
  const pools = pick(".stage-pool");
  const metas = pick(".stage-meta");
  const features = pickAll(".stage-feature");
  const lines = pickAll(".stage-line");
  const tones = panels.map((_, i) => section.querySelector(`[data-stage-tone="${i}"]`));
  const toneColors = panels.map((panel) => panel.style.getPropertyValue("--panel-tone").trim());
  const railItems = [...section.querySelectorAll(".rail-item")];
  const railBars = [...section.querySelectorAll("[data-stage-bar]")];

  const headerOffset = () => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--header-h").trim();
    return value || "84px";
  };

  let activeChapter = -1;

  /**
   * Chapter hand-off: rail state + the storefront colour wash.
   * Runs every frame but exits on the first comparison unless something actually
   * changed — including "another section painted over our tone", which is how the
   * light always matches the shoe that is on stage.
   */
  function setActiveChapter(next) {
    if (next !== activeChapter) {
      activeChapter = next;
      railItems.forEach((item, i) => {
        const isActive = i === next;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-current", isActive ? "true" : "false");
      });
    }
    const tone = toneColors[next];
    if (!/^#[\da-f]{6}$/i.test(tone || "")) return;
    const root = document.documentElement;
    if (root.style.getPropertyValue("--site-color").trim().toLowerCase() === tone.toLowerCase()) return;
    root.style.setProperty("--site-color", tone);
    try { window.sessionStorage.setItem("khalil-store-site-color", tone); } catch { /* private mode: keep it in memory */ }
  }

  const timeline = gsap.timeline({
    defaults: { ease: "power2.out" },
    scrollTrigger: {
      trigger: section,
      start: () => `top top+=${headerOffset()}`,
      end: "bottom bottom",
      scrub: .55,
      invalidateOnRefresh: true
    }
  });

  /* The rail follows the playhead (so it flips exactly when a shoe takes the
     spotlight) and keeps doing so after the scrubbed scroll has settled.
     setActiveChapter() exits immediately while the chapter is unchanged, so this
     is one comparison per frame — and it is removed with the controller. */
  const followChapters = () => setActiveChapter(Math.min(total - 1, Math.max(0, Math.floor(timeline.time()))));
  gsap.ticker.add(followChapters);
  followChapters();

  for (let i = 0; i < total; i++) {
    const chapterStart = i;
    const first = i === 0;

    /* --- 1. the shoes travel: group → spotlight → the rest recede --------- */
    shoeLayers.forEach((layer, index) => {
      const from = first ? groupSlot(index, total) : slotFor(index, i - 1);
      const to = slotFor(index, i);
      timeline.fromTo(layer,
        { x: `${from.x}%`, scale: from.scale, opacity: from.alpha, transformOrigin: "50% 62%", zIndex: from.z },
        {
          x: `${to.x}%`, scale: to.scale, opacity: to.alpha,
          duration: .3, ease: "power2.inOut",
          immediateRender: first
        },
        first ? 0 : chapterStart - .04
      );
      timeline.set(layer, { zIndex: to.z }, Math.max(0, chapterStart - .04));
    });

    /* --- 2. scene light for this chapter --------------------------------- */
    timeline.fromTo(tones[i],
      { opacity: first ? .62 : 0 },
      { opacity: 1, duration: .3, ease: "power1.out", immediateRender: first },
      chapterStart - .06
    );
    if (i < total - 1) {
      timeline.fromTo(tones[i],
        { opacity: 1 },
        { opacity: 0, duration: .34, ease: "power1.in", immediateRender: false },
        chapterStart + .72
      );
    }

    /* --- 3. the shoe settles + its light pool breathes ------------------- */
    if (pools[i]) {
      timeline.fromTo(pools[i],
        { scale: .82, opacity: .42 },
        { scale: 1.06, opacity: .82, duration: .8, ease: "sine.inOut", immediateRender: first },
        chapterStart + .16
      );
    }
    if (shoes[i]) {
      timeline.fromTo(shoes[i],
        { yPercent: 3.5, rotate: -1.2 },
        { yPercent: -3, rotate: 1.1, duration: .8, ease: "sine.inOut", immediateRender: first },
        chapterStart + .2
      );
    }

    /* --- 4. product info assembles beside it ----------------------------- */
    timeline.fromTo(metas[i],
      { autoAlpha: 0, yPercent: 5, xPercent: -7 },
      { autoAlpha: 1, yPercent: 0, xPercent: 0, duration: .28, ease: "power3.out", immediateRender: first },
      chapterStart + .12
    );

    /* --- 5. the feature callouts build up around the shoe ---------------- */
    if (lines[i].length) {
      timeline.fromTo(lines[i],
        { scaleX: 0 },
        { scaleX: 1, duration: .26, stagger: .055, ease: "power2.out", immediateRender: false },
        chapterStart + .28
      );
    }
    if (features[i].length) {
      timeline.fromTo(features[i],
        { autoAlpha: 0, xPercent: 9, yPercent: 6 },
        { autoAlpha: 1, xPercent: 0, yPercent: 0, duration: .22, stagger: .055, ease: "power3.out", immediateRender: false },
        chapterStart + .32
      );
    }

    /* --- 6. hand-off to the next chapter -------------------------------- */
    if (i < total - 1) {
      timeline.fromTo(metas[i],
        { autoAlpha: 1, yPercent: 0 },
        { autoAlpha: 0, yPercent: -6, duration: .18, ease: "power2.in", immediateRender: false },
        chapterStart + .8
      );
      if (features[i].length) {
        timeline.fromTo(features[i],
          { autoAlpha: 1, xPercent: 0 },
          { autoAlpha: 0, xPercent: 9, duration: .16, stagger: { each: .02, from: "end" }, ease: "power2.in", immediateRender: false },
          chapterStart + .8
        );
      }
    }

    /* --- 7. rail progress ------------------------------------------------ */
    if (railBars[i]) {
      timeline.fromTo(railBars[i],
        { scaleX: first ? .04 : 0 },
        { scaleX: 1, ease: "none", duration: 1, immediateRender: first },
        chapterStart
      );
    }
  }

  /* --- deep link from the rail / keyboard -------------------------------- */
  function goTo(index) {
    const trigger = timeline.scrollTrigger;
    if (!trigger) return;
    const target = Math.min(Math.max(index, 0), total - 1);
    const position = trigger.start + (trigger.end - trigger.start) * ((target + .58) / total);
    window.scrollTo({ top: position, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function destroy() {
    gsap.ticker.remove(followChapters);
    const trigger = timeline.scrollTrigger;
    if (trigger) trigger.kill();
    timeline.kill();
  }

  return { goTo, destroy };
}
