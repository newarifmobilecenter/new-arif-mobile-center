"use client";
import { elementToPngBlob } from "./domToPng";

/** HTML + CSS ko (screen ke bahar) render kar ke PNG banata hai. */
export async function htmlToPng(html: string, css: string, widthPx: number, scale = 2): Promise<Blob> {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${widthPx}px;background:#fff;`;
  host.innerHTML = `<style>${css}</style><div id="__slip" style="width:${widthPx}px;background:#fff">${html}</div>`;
  document.body.appendChild(host);
  try {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    return await elementToPngBlob(host.querySelector("#__slip") as HTMLElement, scale, css);
  } finally { host.remove(); }
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Phone par share sheet (WhatsApp chunein), computer par image save + WhatsApp Web khulta hai. */
export async function sharePng(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
    try { await navigator.share({ title: filename, text, files: [file] }); } catch (e: any) { if (e?.name !== "AbortError") throw e; }
    return;
  }
  downloadBlob(blob, filename);
  window.open("https://wa.me/?text=" + encodeURIComponent(text + "\nImage save ho gayi hai. WhatsApp mein attach karein."), "_blank", "noopener");
}

/** PNG ko A4 PDF mein (lambi ho to kai pages). */
export async function pngToPdf(blob: Blob): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const url = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("image load")); i.src = url; });
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210, ph = 297, m = 8, w = pw - m * 2, pageH = ph - m * 2;
  const scale = w / img.width, sliceHpx = Math.floor(pageH / scale);
  for (let y = 0, page = 0; y < img.height; y += sliceHpx, page++) {
    const h = Math.min(sliceHpx, img.height - y);
    const c = document.createElement("canvas"); c.width = img.width; c.height = h;
    const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, h); ctx.drawImage(img, 0, y, img.width, h, 0, 0, img.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", m, m, w, h * scale);
  }
  URL.revokeObjectURL(url);
  return pdf.output("blob");
}

/** Chhupe iframe se sirf is HTML ko print karta hai. */
export function printHtml(html: string, css: string, title = "Print", pageCss = "@page{size:A4;margin:10mm}") {
  document.getElementById("slip-print-frame")?.remove();
  const f = document.createElement("iframe");
  f.id = "slip-print-frame"; f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const doc = f.contentWindow!.document;
  doc.open(); doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${pageCss}body{margin:0;background:#fff}${css}</style></head><body>${html}</body></html>`); doc.close();
  window.setTimeout(() => { try { f.contentWindow!.focus(); f.contentWindow!.print(); } catch {} }, 300);
}

/** Screen par maujood kisi bhi hisse (jo print hota hai) ki PNG banata hai. Dark theme ko safed kagaz jaisa kar deta hai. */
export async function captureLive(el: HTMLElement, opts: { white?: boolean; width?: number } = {}): Promise<Blob> {
  const w = opts.width || Math.max(320, Math.ceil(el.getBoundingClientRect().width) || 800);
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".noPrint,.no-print,button,nav,[data-noshare]").forEach((x) => x.remove());
  clone.style.setProperty("display", "block", "important");
  clone.style.setProperty("position", "static", "important");
  clone.style.setProperty("width", w + "px", "important");
  clone.style.setProperty("max-width", w + "px", "important");
  clone.style.setProperty("margin", "0", "important");
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${w}px;background:#fff;`;
  host.appendChild(clone);
  document.body.appendChild(host);
  const css = opts.white ? `.__wm,.__wm *{background:#fff !important;color:#000 !important;border-color:#000 !important;box-shadow:none !important;text-shadow:none !important}` : "";
  if (opts.white) clone.classList.add("__wm");
  try {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const { elementToPngBlob } = await import("./domToPng");
    return await elementToPngBlob(clone, 2, css + "\n@media print{*{}}");
  } finally { host.remove(); }
}

export async function shareLive(el: HTMLElement | null, mode: "png" | "whatsapp", name: string, text: string, opts: { white?: boolean; width?: number } = {}) {
  if (!el) throw new Error("Share karne ke liye kuch nahi mila.");
  const blob = await captureLive(el, opts);
  const file = `${name.replace(/[^\w.-]+/g, "_")}.png`;
  if (mode === "png") downloadBlob(blob, file); else await sharePng(blob, file, text);
}
