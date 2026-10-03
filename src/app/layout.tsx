import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { NavigationCacheProvider } from "@/contexts/NavigationCacheContext";
import GestureBlocker from "@/components/GestureBlocker";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Comi",
  description: "Gestion de repas et liste de courses",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Comi",
  },
  icons: {
    icon: [
      { url: "/comi/clear/windows/Square44x44Logo.targetsize-32.png?v=1", sizes: "32x32", type: "image/png" },
      { url: "/comi/clear/windows/Square44x44Logo.targetsize-16.png?v=1", sizes: "16x16", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${fraunces.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#E64A33" />
        <link id="manifest-link" rel="manifest" href="/comi/manifest-light.json" />
        <link id="apple-touch-icon" rel="apple-touch-icon" href="/comi/light/ios/180.png" />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />

      </head>
      <body className="bg-bg-light text-text-light-main dark:bg-bg-dark dark:text-text-dark-main font-sans transition-colors duration-300">
        <GestureBlocker />
        <div className="orientation-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-16 w-16 text-brand animate-rotate-phone mb-6"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          <h2 className="text-xl font-bold mb-2">Orientation non supportée</h2>
          <p className="text-sm text-text-light-muted dark:text-text-dark-muted max-w-xs">
            Veuillez tourner votre appareil en mode portrait pour utiliser l&apos;application.
          </p>
        </div>

        <AuthProvider>
          <SettingsProvider>
            <NavigationCacheProvider>
              {children}
            </NavigationCacheProvider>
          </SettingsProvider>
        </AuthProvider>

      </body>
    </html>
  );
}

