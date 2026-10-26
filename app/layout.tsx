import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider, themeInitScript } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ClientInit } from "@/components/ClientInit";
import { SITE } from "@/lib/config";

const description =
  "Global live Zcash quiz competitions. Join from anywhere, answer in real time, climb the leaderboard and win ZEC prizes.";

export const metadata: Metadata = {
  metadataBase: SITE.publicUrl ? new URL(SITE.publicUrl) : undefined,
  title: { default: `${SITE.name} — Live Zcash Quiz Competitions`, template: `%s · ${SITE.name}` },
  description,
  applicationName: SITE.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.png", sizes: "64x64" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — Live Zcash Quiz Competitions`,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
    { media: "(prefers-color-scheme: light)", color: "#F6F6F4" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <ClientInit />
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
