import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLang } from "@/lib/t";

export const metadata: Metadata = {
  title: "Pharmalive",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e7c66" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={await getLang()}>
      <body>{children}</body>
    </html>
  );
}
