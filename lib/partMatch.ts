// Suggest stock products for a repair from the mobile model and the fault text.
const GROUPS: { fault: RegExp; words: RegExp }[] = [
  { fault: /panel|lcd|display|screen|touch|folder|led|incell|tft/i, words: /panel|lcd|display|screen|touch|folder|led|incell|tft/i },
  { fault: /charging|charger|\bch\b|strip|port|pcb|board|charge/i, words: /charging|charger|\bch\b|chb|strip|port|board|pcb/i },
  { fault: /batter/i, words: /batter/i },
  { fault: /camera/i, words: /camera/i },
  { fault: /speaker|ringer|buzzer|sound|awaz/i, words: /speaker|ringer|buzzer/i },
  { fault: /\bmic\b|microphone/i, words: /\bmic\b|microphone/i },
  { fault: /back|body|housing|frame|cover/i, words: /back|body|housing|frame|cover/i },
  { fault: /button|power|volume|flex/i, words: /button|power|volume|flex/i },
];

const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function suggestParts(products: any[], model: string, fault: string) {
  const modelTokens = model.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 2);
  const faultText = fault || "";
  if (!modelTokens.length || faultText.trim().length < 3) return [];
  const active = GROUPS.filter(g => g.fault.test(faultText));
  if (!active.length) return [];
  return products.filter(p => {
    const text = `${p.name || ""} ${p.model || ""} ${p.brand || ""}`.toLowerCase();
    const modelOk = modelTokens.every(t => new RegExp(`(^|[^a-z0-9])${esc(t)}([^a-z0-9]|$)`).test(text));
    return modelOk && active.some(g => g.words.test(text));
  }).slice(0, 12);
}
