# Vercel Bug Tracking Setup

## Files Created

1. **`app/lib/errorTracking.ts`** - Error tracking utilities
   - `trackError()` - Track unexpected errors
   - `trackBugReport()` - Report specific bugs with severity
   - `trackProductError()` - Track product-specific errors

2. **`app/components/ErrorBoundary.tsx`** - Error boundary component
   - Catches React component errors
   - Displays error message to user
   - Automatically tracks errors to Vercel Analytics

3. **`app/admin/page.tsx`** - Updated with error handling
   - All product functions wrapped in try-catch
   - Errors tracked to Vercel Analytics

## How to Use

### Track an Error
```typescript
import { trackError } from '@/lib/errorTracking';

try {
  // your code
} catch (error) {
  trackError('functionName', (error as Error).message, (error as Error).stack);
}
```

### Report a Bug
```typescript
import { trackBugReport } from '@/lib/errorTracking';

trackBugReport('Bug Title', 'Description', 'high'); // 'low' | 'medium' | 'high'
```

### Track Product Operations
```typescript
import { trackProductError } from '@/lib/errorTracking';

trackProductError(productId, 'add', 'Error message');
```

### Use Error Boundary (in layout)
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  {children}
</ErrorBoundary>
```

## View Errors in Vercel Dashboard

1. Deploy to Vercel: `vercel --prod`
2. Go to your project dashboard
3. Navigate to **Analytics** → **Custom Events**
4. Filter by: `error`, `bug_report`, `product_error`

## What's Being Tracked

- ✅ Validation errors (missing fields)
- ✅ Storage/save errors
- ✅ Stock adjustment errors
- ✅ React component crashes
- ✅ Product operations failures
- ✅ All error messages and stack traces
- ✅ User agent and timestamps

## Next Steps

1. Install `@vercel/analytics` if not done: `npm install @vercel/analytics`
2. Deploy: `vercel --prod`
3. Test errors and view in Analytics dashboard
