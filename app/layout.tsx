import { SHOP } from "@/lib/shop";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import AuthNavigation from "./components/AuthNavigation";
import Toaster from "./components/Toaster";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/themes";

export const metadata: Metadata = {
  title: `${SHOP.nameUpper} | ${SHOP.city}`,
  description: `Mobile parts, repairing and Universal Tool Finder — ${SHOP.name}.`,
  icons: { icon: "/icon.svg" },
  openGraph: { title: SHOP.nameUpper, description: `Mobile parts, repairing and accessories — ${SHOP.city}.`, type: "website", siteName: SHOP.name },
  twitter: { card: "summary", title: SHOP.nameUpper },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ur" dir="ltr" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} /></head>
      <body>
        <AuthNavigation />
        {children}
        <div className="helplineMark no-print-hide" aria-hidden="true"><span>Helpline: {SHOP.helpline}</span></div>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}