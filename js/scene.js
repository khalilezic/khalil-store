/* ============================================================
   khalil store — cinematic scroll scene v2 (3D shoe + detail camera).
   ------------------------------------------------------------
   One sticky stage driven by a *smoothed* scroll progress:

     0.00–0.14  line-up   9 sneakers on a 3D arc (arrows / swipe / click).
     0.14–0.84  chapters  the chosen shoe steps forward and a camera flies
                          to a different part of it per chapter (upper,
                          midsole, toe, heel…), swinging in real 3D while a
                          pin + caption + written feature follow.
     0.84–1.00  finale    the shoe sways and settles, ghost headline, buy.

   3D: the selected shoe is a stack of a few layers (front/back in colour,
   darkened ones between; 4 on desktop, 3 on phones) so it has visible thickness when it rotates.

   Smoothness: raw scroll is never applied directly — progress is eased
   per-frame with a time-based filter, DOM refs are cached, unchanged
   styles are skipped, and only transform/opacity are written.
   Markup contract: renderScene() in render.js.
   ============================================================ */

import { createShoeRenderer } from "./shoe3d.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const NARROW = "(max-width: 760px)";
const CH = 5, A_END = .14, C_END = .84;
/* Camera swing (degrees) for each chapter: overview → 4 details. */
const KF = [
  { ry: -12, rx: 2, rz: -2 }, { ry: 18, rx: -3, rz: 1 }, { ry: -20, rx: 3, rz: -1 },
  { ry: 20, rx: -2, rz: 2 }, { ry: -14, rx: 3, rz: -1 }
];

export function initScene(root) {
  if (!root) return null;
  const items = [...root.querySelectorAll("[data-cx-item]")];
  const bgs = [...root.querySelectorAll("[data-cx-bg]")];
  const names = [...root.querySelectorAll("[data-cx-name]")];
  const sets = [...root.querySelectorAll("[data-cx-chapters]")];
  const rows = sets.map((s) => [...s.querySelectorAll(".cx-ch")]);
  const rail = [...root.querySelectorAll("[data-cx-rail]")];
  const buyLinks = [...root.querySelectorAll("[data-cx-buylink]")];
  const ghost = root.querySelector("[data-cx-ghost]");
  const buy = root.querySelector("[data-cx-buy]");
  const hint = root.querySelector("[data-cx-hint]");
  const arrows = [...root.querySelectorAll("[data-cx-arrow]")];
  const bar = root.querySelector("[data-cx-bar]");
  const railWrap = root.querySelector(".cx-rail-wrap");
  const pin = root.querySelector("[data-cx-pin]");
  const pinLabel = root.querySelector("[data-cx-pinlabel]");
  const stage = root.querySelector(".cx-sticky");
  const N = items.length;
  /* real 3D shoe (WebGL). If it can't start, the CSS layered fallback below is used. */
  const canvas = document.createElement("canvas");
  canvas.className = "cx-gl";
  stage.appendChild(canvas);
  const gl3d = createShoeRenderer(canvas);
  if (gl3d) root.classList.add("gl-on"); else canvas.remove();
  const mains = items.map((el) => el.querySelector(".cx-main"));
  const boxes = items.map((el) => el.dataset.box.split(",").map(Number));
  const rgb = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  let glLive = false, glInfo = null, slowFrames = 0, prevNow = 0, animPrev = false, quality = 0;
  /* adaptive resolution: slow devices step down 2x -> 1x -> .75x -> .5x automatically */
  const glScale = () => Math.min(devicePixelRatio || 1, [2, 1, .75, .5][quality]);
  const tones = items.map((el) => el.dataset.tone);
  const focus = items.map((el) => el.dataset.focus.split(";").map((s) => s.split(",").map(Number)));
  const regions = items.map((el) => el.dataset.regions.split(","));

  let target = 0, cur = 0, p = 0, sp = 0, raf = 0, lastT = 0, visible = true, lastActive = -1, lastCam = -1;
  let W = innerWidth, H = innerHeight, top0 = 0, rootTop = 0, rootH = 1, narrow = false, size = 300;
  let ptX = 0, ptY = 0, ptTX = 0, ptTY = 0, fine = false;
  let tgtX = 0, tgtY = 0, baseY = 0;
  const built = new Set();

  /* write a style value only when it changed (cheap diff) */
  const put = (el, k, v) => { const c = el._c || (el._c = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } };

  const measure = () => {
    W = stage.clientWidth || innerWidth; H = stage.clientHeight || innerHeight;
    top0 = parseFloat(getComputedStyle(stage).top) || 0;
    rootTop = root.getBoundingClientRect().top + scrollY;
    rootH = root.offsetHeight;
    narrow = matchMedia(NARROW).matches;
    fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
    size = narrow ? Math.min(W * .62, H * .34) : Math.min(W * .3, H * .46);
    root.style.setProperty("--cx-size", size + "px");
    if (gl3d) gl3d.resize(W, H, glScale());
    baseY = H * (narrow ? .40 : .44);
    tgtX = narrow ? W * .5 : W * .38;
    tgtY = narrow ? H * .33 : H * .44;
    if (pin) { pin.style.left = tgtX + "px"; pin.style.top = tgtY + "px"; }
  };

  const progress = () => clamp((scrollY + top0 - rootTop) / Math.max(1, rootH - H));
  const activeIndex = () => ((Math.round(target) % N) + N) % N;

  /* 3D thickness: front + back layers in colour, dark slices between. */
  function build3D(el) {
    if (gl3d || built.has(el)) return;
    built.add(el);
    const src = el.querySelector("img").src, layers = narrow ? 3 : 4, D = narrow ? 12 : 18;
    const host = document.createElement("div");
    host.className = "cx-slices";
    for (let k = 0; k < layers; k++) {
      const im = new Image();
      im.src = src; im.alt = ""; im.draggable = false; im.decoding = "async";
      const edge = k === 0 || k === layers - 1;
      im.className = "cx-slice" + (edge ? " edge" : "");
      im.style.transform = `translateZ(${(D / 2 - (D * k) / (layers - 1)).toFixed(2)}px)`;
      host.appendChild(im);
    }
    el.appendChild(host);
  }

  function setActive(i) {
    if (i === lastActive) return;
    lastActive = i; lastCam = -1;
    root.style.setProperty("--cx-tone", tones[i]);
    root.dataset.active = i;
    if (visible) document.documentElement.style.setProperty("--site-color", tones[i]);
    names.forEach((el, k) => el.classList.toggle("on", k === i));
    sets.forEach((el, k) => el.classList.toggle("on", k === i));
    buyLinks.forEach((el, k) => el.classList.toggle("is-off", k !== i));
    items.forEach((el, k) => el.classList.toggle("is-sel", k === i));
    build3D(items[i]);
    if (gl3d) {
      const warm = (k) => { if (!gl3d.prepare("s" + k, mains[k], boxes[k]) && !mains[k].complete) mains[k].addEventListener("load", () => { gl3d.prepare("s" + k, mains[k], boxes[k]); kick(); }, { once: true }); };
      warm(i);
      const idle = window.requestIdleCallback || ((f) => setTimeout(f, 250));
      idle(() => { warm((i + 1) % N); idle(() => warm((i + N - 1) % N)); });
    }
  }

  function frame(now = performance.now()) {
    raf = 0;
    p = progress();
    const dt = Math.min(.1, Math.max(.001, (now - (lastT || now - 16)) / 1000));
    lastT = now;
    if (gl3d && animPrev && prevNow && now - prevNow > 48 && quality < 3 && ++slowFrames > 8) { quality++; slowFrames = 0; gl3d.resize(W, H, glScale()); }
    prevNow = now;
    sp += (p - sp) * (1 - Math.exp(-dt * 7));
    cur += (target - cur) * (1 - Math.exp(-dt * 8));
    ptX += (ptTX - ptX) * (1 - Math.exp(-dt * 5));
    ptY += (ptTY - ptY) * (1 - Math.exp(-dt * 5));
    const settling = Math.abs(p - sp) > 1e-4 || Math.abs(target - cur) > .002 || Math.abs(ptTX - ptX) > .002 || Math.abs(ptTY - ptY) > .002;
    if (!settling) { sp = p; cur = target; ptX = ptTX; ptY = ptTY; }

    const L = 1 - ease(clamp(sp / A_END)), F = 1 - L;
    const u = clamp((sp - A_END) / (C_END - A_END)) * CH;           // 0..5 chapter units
    const fin = ease(clamp((sp - C_END) / (1 - C_END)));
    let cam = 0;                                                   // 0..4, holds on integers
    for (let b = 1; b < CH; b++) cam += ease(clamp((u - b + .2) / .4));
    const ci = Math.min(CH - 2, Math.floor(cam)), cf = cam - ci;
    const sel = activeIndex();
    const gap = narrow ? W * .24 : W * .125;
    const arc = narrow ? 10 : 16;

    items.forEach((el, i) => {
      const d = (((i - cur) % N) + N + N / 2) % N - N / 2;
      const ad = Math.abs(d), isSel = i === sel && ad < .5;
      const alpha = isSel ? 1 : clamp((1 - ad * .13) * L);
      if (!isSel) put(mains[i], "opacity", "1");
      if (alpha < .01) { put(el, "visibility", "hidden"); return; }
      put(el, "visibility", "visible");
      put(el, "opacity", alpha.toFixed(2));
      put(el, "pointerEvents", alpha > .5 ? "auto" : "none");
      let x = d * gap * (1 + F * .9), y = Math.pow(ad, 1.5) * arc * L + F * (isSel ? 0 : 40);
      const z = -ad * 130 * L - F * ad * 200;
      let rz = d * 7 * L, ry = -d * 11 * L, rx = 0;
      let s = lerp(.62, 1, clamp(1 - ad * .22)) * (1 - .1 * L);
      if (isSel) {
        const f = focus[i], a = f[ci], b = f[ci + 1];
        const zoom = lerp(1, lerp(a[2], b[2], cf), F);
        const fx = lerp(a[0], b[0], cf), fy = lerp(a[1], b[1], cf);
        const k0 = KF[ci], k1 = KF[ci + 1];
        const base = lerp(1, narrow ? 1.2 : 1.45, F) * (1 - fin * .1);
        s = base * zoom;
        // aim the camera: bring focus point (fx,fy) to the target spot on screen
        const goalX = lerp(tgtX, W / 2, fin), goalY = lerp(tgtY, baseY - H * .02, fin);
        const fxE = lerp(fx, f[0][0], fin), fyE = lerp(fy, f[0][1], fin);
        x = F * (goalX - W / 2 - (fxE - .5) * size * s);
        y = F * (goalY - baseY - (fyE - .5) * size * s);
        ry = F * (lerp(lerp(k0.ry, k1.ry, cf), 0, fin) + Math.sin(fin * Math.PI * 2) * 22 * fin) + ptX * 9 * F;   // finale: a gentle sway that settles facing front (no full turn, so the shape is never seen edge-on)
        rx = F * lerp(k0.rx, k1.rx, cf) - ptY * 7 * F;
        rz = F * lerp(k0.rz, k1.rz, cf) * (1 - fin);
        if (!gl3d) el.classList.toggle("is-3d", F > .02);
        glInfo = { i, x, y, z, rx, ry, rz, s };
      }
      put(el, "transform", `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(3)})`);
    });

    if (gl3d) {
      const ga = clamp(F / .06);
      if (ga > 0 && glInfo && gl3d.prepare("s" + glInfo.i, mains[glInfo.i], boxes[glInfo.i])) {
        gl3d.draw("s" + glInfo.i, {
          cx: W / 2, cy: baseY, tx: glInfo.x, ty: glInfo.y, tz: glInfo.z, rx: glInfo.rx, ry: glInfo.ry, rz: glInfo.rz,
          scale: size * glInfo.s, persp: 1500, ox: W / 2, oy: H * .4, tone: rgb(tones[glInfo.i]),
          light: [-.45 + .6 * Math.sin(sp * 14), -.6, .65], alpha: ga
        });
        put(mains[glInfo.i], "opacity", (1 - ga).toFixed(2));
        glLive = true;
      } else if (glLive) { gl3d.clear(); glLive = false; }
    }
    glInfo = null;

    bgs.forEach((el, i) => {
      const d = Math.abs((((i - cur) % N) + N + N / 2) % N - N / 2);
      put(el, "opacity", (clamp(1 - d) * (.38 + .62 * F)).toFixed(2));
    });

    names.forEach((el) => { put(el, "opacity", (L * L).toFixed(2)); put(el, "transform", `translateY(${(F * 30).toFixed(0)}px)`); });
    arrows.forEach((el) => { put(el, "opacity", L.toFixed(2)); put(el, "pointerEvents", L > .5 ? "auto" : "none"); });
    if (hint) put(hint, "opacity", clamp(1 - sp * 14).toFixed(2));
    if (bar) put(bar, "transform", `scaleX(${sp.toFixed(4)})`);

    // chapter text (synced to the camera: crossfades while the camera flies)
    const gate = clamp((F - .6) * 5) * (1 - clamp(fin * 4));
    const set = rows[sel] || [];
    set.forEach((row, j) => {
      const dj = j - cam, o = ease(clamp(1 - Math.abs(dj) * 2.2)) * gate;
      put(row, "opacity", o.toFixed(2));
      put(row, "transform", `translate3d(0,${(clamp(dj, -1, 1) * 38).toFixed(1)}px,0)`);
    });
    const rc = Math.round(cam);
    if (rc !== lastCam || true) {
      lastCam = rc;
      rail.forEach((el, j) => el.classList.toggle("on", j === rc && F > .5));
      if (pinLabel && pinLabel.dataset.v !== regions[sel][rc]) { pinLabel.dataset.v = regions[sel][rc]; pinLabel.textContent = regions[sel][rc]; }
    }
    if (railWrap) { put(railWrap, "opacity", clamp((F - .4) * 2.2).toFixed(2)); put(railWrap, "pointerEvents", F > .5 ? "auto" : "none"); }
    if (pin) {
      const po = ease(clamp((cam - .35) / .4)) * gate;
      put(pin, "opacity", po.toFixed(2));
      put(pin, "transform", `translate(-50%,-50%) scale(${(.6 + .4 * po).toFixed(2)})`);
    }
    if (ghost) { put(ghost, "opacity", fin.toFixed(2)); put(ghost, "transform", `translate3d(0,${((1 - fin) * 60).toFixed(0)}px,0)`); }
    if (buy) {
      put(buy, "opacity", fin.toFixed(2));
      put(buy, "transform", `translate(-50%,${((1 - fin) * 30).toFixed(0)}px)`);
      put(buy, "pointerEvents", fin > .6 ? "auto" : "none");
    }
    setActive(sel);
    animPrev = settling;
    if (settling) raf = requestAnimationFrame(frame); else { lastT = 0; prevNow = 0; }
  }

  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
  const go = (n) => { target = n; kick(); };
  const scrollToP = (v) => scrollTo({ top: rootTop - top0 + v * (rootH - H), behavior: "smooth" });

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
  const down = (e) => { if (sp < A_END) sx = e.clientX; };
  const up = (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 48) go(target + (dx < 0 ? 1 : -1));
  };
  const key = (e) => {
    if (!visible || sp > A_END) return;
    if (e.key === "ArrowRight") go(target + 1);
    if (e.key === "ArrowLeft") go(target - 1);
  };
  const move = (e) => {
    if (!fine || !visible) return;
    ptTX = e.clientX / W - .5; ptTY = e.clientY / innerHeight - .5; kick();
  };
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { lastActive = -1; kick(); } }, { threshold: 0 });
  const ro = new ResizeObserver(() => { measure(); kick(); });

  measure();
  root.addEventListener("click", onClick);
  root.addEventListener("pointerdown", down);
  addEventListener("pointerup", up);
  addEventListener("pointermove", move, { passive: true });
  addEventListener("scroll", kick, { passive: true });
  addEventListener("keydown", key);
  io.observe(root); ro.observe(document.body); ro.observe(root);
  root.dataset.ready = "1";
  sp = progress();
  frame();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      root.removeEventListener("click", onClick);
      root.removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up);
      removeEventListener("pointermove", move);
      removeEventListener("scroll", kick);
      removeEventListener("keydown", key);
    }
  };
}
