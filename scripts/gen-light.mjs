// Dark CSS se Light theme ke overrides banata hai (html[data-theme="light"] ...). Dobara chalane par purana block replace hota hai.
import postcss from "postcss";
import fs from "node:fs";
import path from "node:path";

const MARK = "/* ==LIGHT-THEME-GENERATED== (scripts/gen-light.mjs) */";
const PRE = 'html[data-theme="light"]';
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.css$/.test(f.name)) files.push(p); } })("app");

const named = { white: "#ffffff", black: "#000000" };
function parse(tok) {
  tok = tok.trim().toLowerCase(); if (named[tok]) tok = named[tok];
  let m;
  if ((m = tok.match(/^#([0-9a-f]{3,8})$/))) {
    let h = m[1]; if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  if ((m = tok.match(/^rgba?\(([^)]+)\)$/))) {
    const p = m[1].split(/[,\s\/]+/).filter(Boolean).map((x) => x.endsWith("%") ? parseFloat(x) * (x.length ? 2.55 : 1) : parseFloat(x));
    if (p.length < 3 || p.slice(0, 3).some(Number.isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
  }
  return null;
}
function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return { h, s, l };
}
function fromHsl(h, s, l, a) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const to = (v) => Math.round((v + m) * 255);
  return a < 1 ? `rgba(${to(r)},${to(g)},${to(b)},${+a.toFixed(3)})` : "#" + [to(r), to(g), to(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function conv(tok, kind) {
  const c = parse(tok); if (!c) return { out: tok, strong: false };
  const { h, s, l } = toHsl(c); const a = c.a;
  const FB = () => fromHsl(200, 0.86, 0.53, a); // sky blue buttons
  const bluish = h >= 165 && h <= 295 && s >= 0.3;
  if (kind === "bg") {
    if (l >= 0.8) { if (a < 0.5 && s < 0.2) return { out: `rgba(0,0,0,${+a.toFixed(3)})`, strong: false }; return { out: tok, strong: false }; }
    if (l < 0.28 || (s < 0.2 && l < 0.5)) { if (a >= 0.95 && l < 0.12) return { out: "#ffffff", strong: false }; return { out: fromHsl(200, Math.min(s, 0.5) * 0.6, 0.975 - 0.2 * l, a), strong: false }; }
    if (bluish) return { out: FB(), strong: a >= 0.7 };
    return { out: tok, strong: a >= 0.7 && l < 0.55 };
  }
  if (kind === "border") {
    if (l >= 0.8) { if (a < 0.5 && s < 0.2) return { out: `rgba(0,0,0,${+a.toFixed(3)})`, strong: false }; return { out: tok, strong: false }; }
    if (l < 0.45) return { out: fromHsl(200, 0.45, 0.85 - 0.2 * l, a), strong: false };
    if (bluish) return { out: FB(), strong: false };
    return { out: tok, strong: false };
  }
  // text
  if (l >= 0.88) return { out: fromHsl(208, 0.6, 0.12, a), strong: false };
  if (l >= 0.6 && s < 0.3) return { out: fromHsl(208, 0.2, 0.1 + (1 - l) * 1.2, a), strong: false };
  if (l >= 0.45 && s >= 0.3) { if (bluish) return { out: fromHsl(201, 0.96, 0.32, a), strong: false }; return { out: fromHsl(h, s, 0.3, a), strong: false }; }
  return { out: tok, strong: false };
}
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
const kindOf = (prop) => /^--/.test(prop) ? (/(line|border)/.test(prop) ? "border" : /(surface|bg|background)/.test(prop) ? "bg" : "text") : /^(background(-color|-image)?)$/.test(prop) ? "bg" : /^(border(-top|-right|-bottom|-left)?(-color)?|outline(-color)?|border-(block|inline)(-start|-end)?(-color)?)$/.test(prop) ? "border" : /^(color|fill|stroke|caret-color|text-decoration-color|accent-color)$/.test(prop) ? "text" : null;

function processRule(rule, isModule) {
  const sels = rule.selectors.filter((s) => !/data-theme/.test(s) && !/^(html)\b/.test(s.trim()));
  if (!sels.length) return null;
  if (isModule && sels.some((s) => !/\./.test(s))) return null;
  const decls = []; let strongBg = false;
  rule.each((n) => { if (n.type !== "decl") return; const k = kindOf(n.prop); if (!k || /var\(|gradient\(.*var\(/.test(n.value) && !COLOR_RE.test(n.value)) { COLOR_RE.lastIndex = 0; return; } COLOR_RE.lastIndex = 0; if (!COLOR_RE.test(n.value)) { COLOR_RE.lastIndex = 0; return; } COLOR_RE.lastIndex = 0; decls.push({ n, k }); });
  if (!decls.length) return null;
  const out = [];
  for (const { n, k } of decls) if (k === "bg") { let changed = false; const v = n.value.replace(COLOR_RE, (t) => { const r = conv(t, "bg"); if (r.strong) strongBg = true; if (r.out !== t) changed = true; return r.out; }); if (changed) out.push([n.prop, v, n.important]); }
  for (const { n, k } of decls) if (k === "border") { const v = n.value.replace(COLOR_RE, (t) => conv(t, "border").out); if (v !== n.value) out.push([n.prop, v, n.important]); }
  for (const { n, k } of decls) if (k === "text") { if (strongBg) continue; const v = n.value.replace(COLOR_RE, (t) => conv(t, "text").out); if (v !== n.value) out.push([n.prop, v, n.important]); }
  if (!out.length) return null;
  const sel = sels.map((s) => `${PRE} ${s.trim()}`).join(",");
  return `${sel}{${out.map(([p, v, i]) => `${p}:${v}${i ? "!important" : ""}`).join(";")}}`;
}
function processContainer(nodes, isModule) {
  let css = "";
  for (const n of nodes) {
    if (n.type === "rule") { const r = processRule(n, isModule); if (r) css += r + "\n"; }
    else if (n.type === "atrule" && /^(media|supports)$/.test(n.name)) {
      if (/print/.test(n.params)) continue;
      const inner = processContainer(n.nodes || [], isModule); if (inner.trim()) css += `@${n.name} ${n.params}{\n${inner}}\n`;
    }
  }
  return css;
}
let total = 0;
for (const f of files) {
  let src = fs.readFileSync(f, "utf8"); const i = src.indexOf(MARK); if (i >= 0) src = src.slice(0, i).trimEnd() + "\n";
  const isModule = /\.module\.css$/.test(f);
  let root = postcss.parse(src);
  // globals.css mein purana invert-filter light block hata dein
  if (f.endsWith("globals.css")) { root.walkRules((r) => { if (/data-theme="light"/.test(r.selector)) r.remove(); }); src = root.toString(); root = postcss.parse(src); }
  let gen = processContainer(root.nodes, isModule);
  if (f.endsWith("notebook.module.css")) gen += `${PRE} .button,${PRE} .buttonDanger{color:#fff}\n${PRE} .buttonSecondary{color:#050505}\n`;
  if (gen.trim()) { fs.writeFileSync(f, src.trimEnd() + "\n\n" + MARK + "\n" + gen); total += gen.length; } else fs.writeFileSync(f, src);
}
console.log("done", files.length, "files,", total, "bytes");
