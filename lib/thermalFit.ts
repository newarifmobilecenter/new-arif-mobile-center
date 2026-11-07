"use client";
import { useEffect } from "react";

/**
 * Roll printers: when printing, measure the slip and force the page height to match it,
 * so no blank paper comes out after the slip. Only runs while the browser is in print mode.
 */
export function useThermalFit(selector: string, pageName: string, widthMm: number, enabled = true, forceWidth = false) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("print");
    let tag: HTMLStyleElement | null = null;
    const apply = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return;
      const old = { w: el.style.width, b: el.style.boxSizing };
      if (forceWidth) { el.style.boxSizing = "border-box"; el.style.width = `${widthMm}mm`; }
      const h = el.getBoundingClientRect().height;
      if (forceWidth) { el.style.width = old.w; el.style.boxSizing = old.b; }
      if (!h) return;
      const mm = Math.ceil((h * 25.4) / 96) + 3;
      if (!tag) { tag = document.createElement("style"); tag.setAttribute("data-thermal-fit", pageName); document.head.appendChild(tag); }
      tag.textContent = `@media print{@page ${pageName}{size:${widthMm}mm ${mm}mm;margin:0}}`;
    };
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) apply(); };
    mq.addEventListener("change", onChange);
    window.addEventListener("beforeprint", apply);
    return () => { mq.removeEventListener("change", onChange); window.removeEventListener("beforeprint", apply); tag?.remove(); };
  }, [selector, pageName, widthMm, enabled, forceWidth]);
}
