"use client";

/** DOM element ko PNG image banata hai (WhatsApp par image ke tor par share karne ke liye). Koi extra library nahi. */
function inlineStyles(src: Element, dst: Element) {
  const cs = getComputedStyle(src);
  let css = "";
  for (let i = 0; i < cs.length; i++) { const k = cs[i]; css += `${k}:${cs.getPropertyValue(k)};`; }
  (dst as HTMLElement).setAttribute("style", css);
  const s = Array.from(src.children), d = Array.from(dst.children);
  s.forEach((c, i) => d[i] && inlineStyles(c, d[i]));
}

async function imgToData(img: HTMLImageElement): Promise<string> {
  try {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return c.toDataURL("image/png");
  } catch { return img.src; }
}

export async function elementToPngBlob(el: HTMLElement, scale = 2): Promise<Blob> {
  const rect = el.getBoundingClientRect();
  const w = Math.ceil(rect.width), h = Math.ceil(rect.height);
  const clone = el.cloneNode(true) as HTMLElement;
  inlineStyles(el, clone);
  clone.style.margin = "0";
  const srcImgs = Array.from(el.querySelectorAll("img"));
  const dstImgs = Array.from(clone.querySelectorAll("img"));
  for (let i = 0; i < srcImgs.length; i++) if (dstImgs[i]) dstImgs[i].src = await imgToData(srcImgs[i]);
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const xml = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("image render failed")); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
  const canvas = document.createElement("canvas");
  canvas.width = w * scale; canvas.height = h * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
  return await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error("png failed")), "image/png"));
}
