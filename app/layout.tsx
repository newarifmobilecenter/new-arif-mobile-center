import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import AuthNavigation from "./components/AuthNavigation";
import Toaster from "./components/Toaster";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/themes";

export const metadata: Metadata = {
  title: "NEW ARIF MOBILE CENTER | Kamar Mushani",
  description: "Mobile parts, repairing and Universal Tool Finder — New Arif Mobile Center.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ur" dir="ltr" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} /></head>
      <body>
        <AuthNavigation />
        {children}
        <div className="helplineMark no-print-hide" aria-hidden="true"><span>Helpline: 03290882200</span></div>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}