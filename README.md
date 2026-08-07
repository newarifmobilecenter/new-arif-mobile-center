# NEW ARIF MOBILE CENTER

A polished Next.js + TypeScript + Tailwind starter for:

- NEW ARIF MOBILE CENTER
- Mobile parts and repairing
- Universal Tool Finder with partial-code search
- WhatsApp contact
- TikTok link
- Stock quantities and Out of Stock status
- Basic demo admin/content manager

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Demo admin

Click **Admin** in the footer.

Demo password: `1234`

This is intentionally a browser/localStorage demo lock, NOT production security.

## Production upgrade

For a real deployed shop website:

1. Use Clerk for admin authentication.
2. Store products, stock, tool codes and posts in MongoDB.
3. Add server-side authorization for every admin mutation.
4. Upload post/product images to a proper object-storage service.
5. Add Stripe only if online payments are needed.
6. Deploy on Vercel or another Next.js-compatible host.

## Add 100+ Universal Tool Finder options

In `app/page.tsx`, add records like:

```ts
{ id: 10, code: "your-code-1 your-code-2" },
{ id: 11, code: "your-code-3" },
```

The search automatically matches any part of the code and scrolls to the first match.
