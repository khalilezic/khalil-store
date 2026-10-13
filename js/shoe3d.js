/* ============================================================
   khalil store — real 3D shoe (WebGL, no library).
   ------------------------------------------------------------
   Each product photo becomes an actual mesh:
     1. the photo's alpha mask is turned into a distance field,
     2. the field becomes a depth map: a FLAT slab with a short rounded
        bevel at the silhouette (so the photo is never bent or stretched),
     3. a front and a back surface are built from it (front = photo,
        back = the same photo seen from behind), welded at the silhouette,
     4. real normals are computed from the depth, so lighting, specular,
        rim light and perspective respond to every rotation.
   The camera mirrors the CSS stage (perspective 1500px, origin 50% 40%),
   so a model drawn here lands exactly where the flat CSS image sat.
   ============================================================ */

const VS = `
attribute vec3 aPos; attribute vec2 aUV; attribute vec3 aN;
uniform vec2 uView, uCenter, uOrigin; uniform vec3 uTrans; uniform mat3 uRot;
uniform float uScale, uPersp;
varying vec2 vUV; varying vec3 vN;
void main() {
  vec3 P = vec3(uCenter + uTrans.xy, uTrans.z) + uRot * (aPos * uScale);
  float k = uPersp / (uPersp - P.z);
  vec2 s = uOrigin + (P.xy - uOrigin) * k;
  gl_Position = vec4(s.x / uView.x * 2.0 - 1.0, 1.0 - s.y / uView.y * 2.0, -P.z / 4000.0, 1.0);
  vUV = aUV; vN = uRot * aN;
}`;
const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec3 uTone, uLight; uniform float uAlpha;
varying vec2 vUV; varying vec3 vN;
void main() {
  vec4 c = texture2D(uTex, vUV);
  if (c.a < 0.3) discard;
  vec3 N = normalize(vN);
  vec3 L = normalize(uLight), V = vec3(0.0, 0.0, 1.0), H = normalize(L + V);
  float edge = 1.0 - clamp(abs(N.z), 0.0, 1.0);          /* 0 on the flat faces, 1 on the rim */
  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), 40.0) * 0.22 * edge;
  float rim = pow(edge, 1.6);
  vec3 col = c.rgb * (0.90 + 0.14 * diff) + vec3(spec) + uTone * rim * 0.38;
  col *= 1.0 - 0.30 * rim;                                 /* rim turns slightly darker, like a real sidewall */
  float a = smoothstep(0.3, 0.8, c.a) * uAlpha;
  gl_FragColor = vec4(col * a, a);
}`;

const rad = (d) => (d * Math.PI) / 180;
/* R = Rx * Ry * Rz (same order as the CSS transform), uploaded column-major */
function rotation(rx, ry, rz) {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(rad(rx)), Math.sin(rad(rx)), Math.cos(rad(ry)), Math.sin(rad(ry)), Math.cos(rad(rz)), Math.sin(rad(rz))];
  const X = [1, 0, 0, 0, cx, -sx, 0, sx, cx], Y = [cy, 0, sy, 0, 1, 0, -sy, 0, cy], Z = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const mul = (a, b) => { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]; return o; };
  const R = mul(mul(X, Y), Z), out = new Float32Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[c * 3 + r] = R[r * 3 + c];
  return out;
}

/* mask -> slab depth (0..1) on an (w x h) grid:
   0 on the silhouette, rising along a quarter-circle bevel of `bevel` grid px,
   then FLAT (=1) everywhere else. Flat faces keep the photo exact. */
function slab(mask, w, h, bevel) {
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? INF : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
  }
  const out = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) {
    if (!mask[i]) continue;
    const t = Math.min(1, (d[i] / 3) / bevel);
    out[i] = Math.sqrt(t * (2 - t));
  }
  const sm = new Float32Array(out.length);            // one light 3x3 pass: removes grid terraces, keeps the plateau
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!mask[i]) continue;
    let s = 0, n = 0;
    for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) { s += out[yy * w + xx]; n++; }
    sm[i] = s / n;
  }
  return sm;
}

export function createShoeRenderer(canvas) {
  let gl;
  try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, powerPreference: "high-performance" }); } catch (e) { gl = null; }
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn("shoe3d: shader failed", e); return null; }
  gl.useProgram(prog);
  const A = (n) => gl.getAttribLocation(prog, n), U = (n) => gl.getUniformLocation(prog, n);
  const loc = { pos: A("aPos"), uv: A("aUV"), n: A("aN") };
  const u = {}; ["uView", "uCenter", "uOrigin", "uTrans", "uRot", "uScale", "uPersp", "uTex", "uTone", "uLight", "uAlpha"].forEach((k) => (u[k] = U(k)));
  const models = new Map();
  let vw = 1, vh = 1;

  function build(img, box) {
    const [x0, y0, x1, y1] = box, bw = x1 - x0, bh = y1 - y0;
    const GX = 190, GY = Math.max(24, Math.round(GX * bh / bw)), MW = GX * 2, MH = GY * 2;
    const cv = document.createElement("canvas"); cv.width = MW; cv.height = MH;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, x0 * img.naturalWidth, y0 * img.naturalHeight, bw * img.naturalWidth, bh * img.naturalHeight, 0, 0, MW, MH);
    const px = cx.getImageData(0, 0, MW, MH).data, mask = new Uint8Array(MW * MH);
    for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4 + 3] > 120 ? 1 : 0;
    const HALF = Math.min(.085, .22 * bh), BEVEL = .03 * MW / bw;   // bevel = 3% of the image width (in grid px); thickness capped by the shoe height
    const D = slab(mask, MW, MH, BEVEL);
    const nodes = (GX + 1) * (GY + 1), depth = new Float32Array(nodes), alive = new Uint8Array(nodes);
    for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
      const mi = Math.min(MW - 1, i * 2) + Math.min(MH - 1, j * 2) * MW, k = j * (GX + 1) + i;
      depth[k] = D[mi] * HALF; alive[k] = mask[mi];
    }
    const V = new Float32Array(nodes * 2 * 8), dx = bw / GX, dy = bh / GY;
    const dAt = (i, j) => depth[Math.min(GY, Math.max(0, j)) * (GX + 1) + Math.min(GX, Math.max(0, i))];
    for (let side = 0; side < 2; side++) for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
      const k = j * (GX + 1) + i, o = (side * nodes + k) * 8, s = side ? -1 : 1;
      const gx = (dAt(i + 1, j) - dAt(i - 1, j)) / (2 * dx), gy = (dAt(i, j + 1) - dAt(i, j - 1)) / (2 * dy);
      const nl = Math.hypot(gx, gy, 1);
      V[o] = x0 + bw * i / GX - .5; V[o + 1] = y0 + bh * j / GY - .5; V[o + 2] = s * depth[k];
      V[o + 3] = x0 + bw * i / GX; V[o + 4] = y0 + bh * j / GY;
      V[o + 5] = -gx / nl; V[o + 6] = -gy / nl; V[o + 7] = s / nl;
    }
    const idx = [];
    for (let side = 0; side < 2; side++) for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      const a = j * (GX + 1) + i, b = a + 1, c = a + GX + 1, d = c + 1;
      if (!(alive[a] || alive[b] || alive[c] || alive[d])) continue;
      const q = side * nodes; idx.push(q + a, q + b, q + c, q + b, q + d, q + c);
    }
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    const pot = (n) => (n & (n - 1)) === 0;
    if (pot(img.naturalWidth) && pot(img.naturalHeight)) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { vb, ib, tex, count: idx.length };
  }

  return {
    /** Build (once) the mesh + texture for a shoe. Returns false if the image isn't ready. */
    prepare(key, img, box) {
      if (models.has(key)) return true;
      if (!img.complete || !img.naturalWidth) return false;
      try { models.set(key, build(img, box)); return true; } catch (e) { console.warn("shoe3d: build failed", e); return false; }
    },
    resize(w, h, dpr) {
      vw = w; vh = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    clear() { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); },
    /** st: {cx, cy, tx, ty, tz, rx, ry, rz, scale, persp, ox, oy, tone:[r,g,b], light:[x,y,z], alpha} (px / degrees) */
    draw(key, st) {
      const m = models.get(key); if (!m) return;
      this.clear();
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
      gl.enableVertexAttribArray(loc.pos); gl.vertexAttribPointer(loc.pos, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(loc.uv); gl.vertexAttribPointer(loc.uv, 2, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(loc.n); gl.vertexAttribPointer(loc.n, 3, gl.FLOAT, false, 32, 20);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, m.tex); gl.uniform1i(u.uTex, 0);
      gl.uniform2f(u.uView, vw, vh); gl.uniform2f(u.uCenter, st.cx, st.cy); gl.uniform2f(u.uOrigin, st.ox, st.oy);
      gl.uniform3f(u.uTrans, st.tx, st.ty, st.tz); gl.uniformMatrix3fv(u.uRot, false, rotation(st.rx, st.ry, st.rz));
      gl.uniform1f(u.uScale, st.scale); gl.uniform1f(u.uPersp, st.persp); gl.uniform1f(u.uAlpha, st.alpha);
      gl.uniform3f(u.uTone, st.tone[0], st.tone[1], st.tone[2]); gl.uniform3f(u.uLight, st.light[0], st.light[1], st.light[2]);
      gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
    }
  };
}
