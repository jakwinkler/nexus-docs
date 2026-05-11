import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchDialog } from "@/components/search/search-dialog";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import "@/styles/globals.css";

function SearchDialogWrapper() {
  return <SearchDialog />;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com";
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "nexus Docs";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Extension Documentation & Partner Portal`,
    template: `%s | ${siteName}`,
  },
  description:
    "Official documentation for nexus Magento 2 extensions. Installation guides, configuration, usage, and developer resources.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: `${siteName} — Extension Documentation & Partner Portal`,
    description:
      "Official documentation for nexus Magento 2 extensions. Installation guides, configuration, usage, and developer resources.",
    images: [
      {
        url: `${siteUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@nexusDev",
    creator: "@nexusDev",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: "/images/nexus-favicon-192.png",
    apple: "/images/nexus-favicon-192.png",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ea580c" />
        <meta name="color-scheme" content="light" />
        <meta name="msapplication-TileColor" content="#ea580c" />
        {/* Google Consent Mode v2 — set defaults BEFORE GTM loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'functionality_storage': 'granted',
                'personalization_storage': 'denied',
                'security_storage': 'granted',
                'wait_for_update': 500
              });
            `,
          }}
        />
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');
              `,
            }}
          />
        )}
        {/* Light theme only — no dark mode toggle */}
      </head>
      <body className="bg-[var(--color-surface)] text-[var(--color-text-primary)] antialiased">
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
        <SearchDialogWrapper />
        <CookieConsent />
      </body>
    </html>
  );
}
