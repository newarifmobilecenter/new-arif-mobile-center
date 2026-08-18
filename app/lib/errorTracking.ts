export function trackError(context: string, message: string, stack?: string) {
  console.error(`[${context}] ${message}`, stack);
}

export function trackProductError(productId: number, action: string, message: string) {
  console.error(`[Product ${productId} - ${action}] ${message}`);
}

export function trackBugReport(title: string, description: string, severity: string) {
  console.log(`[Bug Report - ${severity}] ${title}: ${description}`);
}
