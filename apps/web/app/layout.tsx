import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PesaRoute | Kenya-first investment decisions",
  description: "Educational comparison, simulation, scam checks, journaling, and private portfolio mirroring for Kenyan investors."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
