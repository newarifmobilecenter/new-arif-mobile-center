export function trackError(errorName: string, errorMessage: string, errorStack?: string) {
  console.error(`[Error Tracked] ${errorName}:`, errorMessage, errorStack);
}

export function trackBugReport(bugTitle: string, bugDescription: string, severity: 'low' | 'medium' | 'high') {
  console.log(`[Bug Report] ${bugTitle} (${severity}):`, bugDescription);
}

export function trackProductError(productId: number, action: string, errorDetails: string) {
  console.error(`[Product ${productId} - ${action}] ${errorDetails}`);
}
