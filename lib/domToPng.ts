"use client";

/** DOM element ko PNG image banata hai (WhatsApp par image ke tor par share karne ke liye). Koi extra library nahi. */
/** Page ki saari CSS rules (class-based) — taake image mein wohi layout aaye jo screen par hai, px inline karne se text overlap hota tha. */
function pageCss(): string {
  let css = "";
  for (const sh of Array.from(document.styleSheets)) {
    try { for (const r of Array.from(sh.cssRules)) css += r.cssText + "\n"; } catch { /* cross-origin sheet skip */ }
  }
  return css;
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
  clone.style.margin = "0";
  clone.style.width = w + "px";
  clone.style.maxWidth = w + "px";
  clone.style.boxSizing = "border-box";
  const srcImgs = Array.from(el.querySelectorAll("img"));
  const dstImgs = Array.from(clone.querySelectorAll("img"));
  for (let i = 0; i < srcImgs.length; i++) if (dstImgs[i]) dstImgs[i].src = await imgToData(srcImgs[i]);
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const xml = new XMLSerializer().serializeToString(clone);
  const style = new XMLSerializer().serializeToString(Object.assign(document.createElementNS("http://www.w3.org/1999/xhtml", "style"), { textContent: pageCss() }));
  const hh = h + 40;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hh}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="background:#fff;width:${w}px;font-family:Arial,Helvetica,sans-serif">${style}${xml}</div></foreignObject></svg>`;
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("image render failed")); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
  const canvas = document.createElement("canvas");
  canvas.width = w * scale; canvas.height = hh * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
  return await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error("png failed")), "image/png"));
}
