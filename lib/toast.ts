// Non-blocking warning / info messages (replaces browser alert boxes).
export type ToastKind = "warning" | "danger" | "success" | "info";
export type ToastDetail = { message: string; title?: string; kind?: ToastKind };

export function notify(message: string, opts: { title?: string; kind?: ToastKind } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>("na-toast", { detail: { message, ...opts } }));
}
