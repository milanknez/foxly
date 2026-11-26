import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DialogProvider } from "@/components/ui/dialog-provider";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Foxly - Chytré tabulky pro moderní firmy",
  description: "Chytré tabulky pro firmy, které vyrostly z Excelu. Evidence zakázek, AI vytěžování faktur a webové formuláře na jednom místě.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className={inter.className}>
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
