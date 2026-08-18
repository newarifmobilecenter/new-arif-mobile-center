import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEW ARIF MOBILE CENTER | Kamar Mushani",
  description: "Mobile parts, repairing and Universal Tool Finder — New Arif Mobile Center.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ur" dir="ltr">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}