import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Q — Villa & Günlük Kiralık Rezervasyon",
  description: "Azerbaycan'da villa ve günlük kiralık konaklamalar için profesyonel rezervasyon platformu.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
