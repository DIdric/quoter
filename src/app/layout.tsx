import type { Metadata } from "next";
import Script from "next/script";
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
      <body className="antialiased">
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-J5NC0S182H"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-J5NC0S182H');
          `}
        </Script>
      </body>
    </html>
  );
}
