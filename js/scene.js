/* ============================================================
   khalil store — "Ciro-style" scroll scene (حلقة الأحذية).
   ------------------------------------------------------------
   One sticky full-screen stage, driven by scroll progress p (0→1):

     0.00–0.14  line-up   : 9 sneakers stand on a curved arc, the chosen
                            one in the middle. Arrows / swipe / click change it.
     0.14–0.84  chapters  : the chosen shoe steps forward, the whole scene
                            takes its colour, and 5 chapters (name + 4 real
                            specs from data.js) read on the start side while
                            a numbered rail on the other side tracks them.
     0.84–1.00  finale    : huge ghost headline behind the shoe + buy card.

   Everything per-frame is transform/opacity. No pinning: CSS sticky holds.
   Markup contract: renderScene() in render.js.
   ============================================================ */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const NARROW = "(max-width: 760px)";

export function initScene(root) {
  if (!root) return null;
  const items = [...root.querySelectorAll("[data-cx-item]")];
  const bgs = [...root.querySelectorAll("[data-cx-bg]")];
  const names = [...root.querySelectorAll("[data-cx-name]")];
  const sets = [...root.querySelectorAll("[data-cx-chapters]")];
  const rail = [...root.querySelectorAll("[data-cx-rail]")];
  const ghost = root.querySelector("[data-cx-ghost]");
  const buy = root.querySelector("[data-cx-buy]");
  const hint = root.querySelector("[data-cx-hint]");
  const arrows = [...root.querySelectorAll("[data-cx-arrow]")];
  const bar = root.querySelector("[data-cx-bar]");
  const N = items.length;
  const tones = items.map((el) => el.dataset.tone);
  const CH = 5, A_END = .14, C_END = .84;

  let target = 0, cur = 0, p = 0, raf = 0, lastT = 0, visible = true, lastActive = -1;
  const stage = root.querySelector(".cx-sticky");
  let W = innerWidth, H = innerHeight, top0 = 0, narrow = false, size = 300;

  const measure = () => {
    W = innerWidth; H = stage.clientHeight || innerHeight;
    top0 = parseFloat(getComputedStyle(stage).top) || 0;
    narrow = matchMedia(NARROW).matches;
    size = narrow ? Math.min(W * .62, H * .34) : Math.min(W * .3, H * .46);
    root.style.setProperty("--cx-size", size + "px");
  };

  const progress = () => {
    const r = root.getBoundingClientRect();
    return clamp((top0 - r.top) / Math.max(1, r.height - H));
  };

  const activeIndex = () => ((Math.round(target) % N) + N) % N;

  function setActive(i) {
    if (i === lastActive) return;
    lastActive = i;
    root.style.setProperty("--cx-tone", tones[i]);
    root.dataset.active = i;
    if (visible) document.documentElement.style.setProperty("--site-color", tones[i]);
    names.forEach((el, k) => el.classList.toggle("on", k === i));
    sets.forEach((el, k) => el.classList.toggle("on", k === i));
    root.querySelectorAll("[data-cx-buylink]").forEach((el) => el.classList.toggle("is-off", Number(el.dataset.cxBuylink) !== i));
  }

  function frame(now = performance.now()) {
    raf = 0;
    p = progress();
    const dt = Math.min(.1, Math.max(.001, (now - (lastT || now - 16)) / 1000));
    lastT = now;
    cur += (target - cur) * (1 - Math.exp(-dt * 8));
    const settling = Math.abs(target - cur) > .002;
    if (!settling) cur = target;

    const L = 1 - ease(clamp(p / A_END));            // 1 = line-up, 0 = focused
    const F = 1 - L;
    const c = clamp((p - A_END) / (C_END - A_END));  // chapter progress
    const fin = ease(clamp((p - C_END) / (1 - C_END)));
    const gap = narrow ? W * .24 : W * .125;
    const arc = narrow ? 10 : 16;

    items.forEach((el, i) => {
      let d = (((i - cur) % N) + N + N / 2) % N - N / 2;
      const ad = Math.abs(d);
      const isSel = ad < .5;
      const x = d * gap * (1 + F * .9);
      const y = (Math.pow(ad, 1.5) * arc) * L + F * (isSel ? (narrow ? H * .03 : 0) : 40) - fin * (isSel ? H * .03 : 0);
      const z = -ad * 130 * L - F * ad * 200;
      let rz = d * 7 * L, ry = -d * 11 * L;
      let s = lerp(.62, 1, clamp(1 - ad * .22)) * (1 - .1 * L);
      if (isSel) {
        s = lerp(1, narrow ? 1.2 : 1.6, F) + fin * .12;
        rz += F * (-9 * Math.cos(c * Math.PI * 2 * CH / 2) + 4);
        ry += F * (c * 2 - 1) * 16;
      }
      const alpha = isSel ? 1 : clamp((1 - ad * .13) * L + (isSel ? 0 : 0));
      el.style.opacity = alpha.toFixed(3);
      el.style.zIndex = String(20 - Math.round(ad * 2));
      el.style.pointerEvents = alpha > .5 ? "auto" : "none";
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(3)})`;
    });

    bgs.forEach((el, i) => {
      const d = Math.abs((((i - cur) % N) + N + N / 2) % N - N / 2);
      el.style.opacity = (clamp(1 - d) * (.38 + .62 * F)).toFixed(3);
    });

    root.style.setProperty("--cx-focus", F.toFixed(3));
    names.forEach((el) => { el.style.opacity = (L * L).toFixed(3); el.style.transform = `translateY(${(F * 30).toFixed(1)}px)`; });
    arrows.forEach((el) => { el.style.opacity = L.toFixed(2); el.style.pointerEvents = L > .5 ? "auto" : "none"; });
    if (hint) hint.style.opacity = clamp(1 - p * 14).toFixed(2);
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;

    // chapters
    const k = clamp(Math.floor(c * CH), 0, CH - 1);
    const rows = root.querySelectorAll(".cx-set.on .cx-ch");
    rows.forEach((row, j) => {
      const center = (j + .5) / CH;
      const w = clamp(1 - Math.abs(c - center) / (.55 / CH));
      const o = ease(clamp(w * 1.5)) * (p > A_END * .85 && p < C_END + .03 ? 1 : 0);
      row.style.opacity = o.toFixed(3);
      row.style.transform = `translateY(${((1 - o) * 26 * (c > center ? -1 : 1)).toFixed(1)}px)`;
    });
    rail.forEach((el, j) => el.classList.toggle("on", j === k && F > .5));
    const railWrap = root.querySelector(".cx-rail-wrap");
    if (railWrap) {
      railWrap.style.opacity = clamp((F - .4) * 2.2).toFixed(2);
      railWrap.style.pointerEvents = F > .5 ? "auto" : "none";
    }
    if (ghost) {
      ghost.style.opacity = fin.toFixed(3);
      ghost.style.transform = `translate3d(0,${((1 - fin) * 60).toFixed(1)}px,0) scale(${(1 + (1 - fin) * .08).toFixed(3)})`;
    }
    if (buy) {
      buy.style.opacity = fin.toFixed(3);
      buy.style.transform = `translate(-50%,${((1 - fin) * 30).toFixed(1)}px)`;
      buy.style.pointerEvents = fin > .6 ? "auto" : "none";
    }
    setActive(activeIndex());
    if (settling) raf = requestAnimationFrame(frame); else lastT = 0;
  }

  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
  const go = (n) => { target = n; kick(); };
  const scrollToP = (v) => {
    const r = root.getBoundingClientRect();
    const top = scrollY + r.top - top0 + v * (r.height - H);
    scrollTo({ top, behavior: "smooth" });
  };

  const onClick = (e) => {
    const t = e.target.closest("[data-cx-item],[data-cx-arrow],[data-cx-rail]");
    if (!t || !root.contains(t)) return;
    if (t.matches("[data-cx-arrow]")) { go(target + Number(t.dataset.cxArrow)); return; }
    if (t.matches("[data-cx-rail]")) { scrollToP(A_END + (Number(t.dataset.cxRail) + .5) / CH * (C_END - A_END)); return; }
    const i = items.indexOf(t);
    const d = (((i - target) % N) + N + N / 2) % N - N / 2;
    if (Math.round(d) !== 0) go(target + Math.round(d)); else scrollToP(A_END + .5 / CH * (C_END - A_END));
  };

  let sx = null;
  const down = (e) => { if (p < A_END) sx = e.clientX; };
  const up = (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 48) go(target + (dx < 0 ? 1 : -1));
  };
  const key = (e) => {
    if (!visible || p > A_END) return;
    if (e.key === "ArrowRight") go(target + 1);
    if (e.key === "ArrowLeft") go(target - 1);
  };
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { lastActive = -1; kick(); } }, { threshold: 0 });
  const onResize = () => { measure(); kick(); };

  measure();
  root.addEventListener("click", onClick);
  root.addEventListener("pointerdown", down);
  addEventListener("pointerup", up);
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", onResize);
  addEventListener("keydown", key);
  io.observe(root);
  root.dataset.ready = "1";
  frame();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      root.removeEventListener("click", onClick);
      root.removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up);
      removeEventListener("scroll", kick);
      removeEventListener("resize", onResize);
      removeEventListener("keydown", key);
    }
  };
}
