import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quoter - Professionele Offertes voor Aannemers",
  description:
    "Genereer professionele offertes met AI. Beheer materialen, bereken kosten en maak indruk op je klanten.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
