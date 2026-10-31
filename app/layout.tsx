import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider, themeInitScript } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ClientInit } from "@/components/ClientInit";
import { SITE } from "@/lib/config";

const description =
  "The Zcash community quiz platform. Join live quizzes with a room code or QR, answer in real time and climb the leaderboard.";

export const metadata: Metadata = {
  metadataBase: SITE.publicUrl ? new URL(SITE.publicUrl) : undefined,
  title: { default: `${SITE.name} — Zcash Community Quizzes`, template: `%s · ${SITE.name}` },
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
    title: `${SITE.name} — Zcash Community Quizzes`,
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
    { media: "(prefers-color-scheme: dark)", color: "#0F1115" },
    { media: "(prefers-color-scheme: light)", color: "#F2F3F5" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
