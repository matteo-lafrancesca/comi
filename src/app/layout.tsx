import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Menu Manage",
  description: "Gestion de repas et liste de courses",
  manifest: "/menumanage/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Menu Manage",
  },
  icons: {
    icon: [
      { url: "/menumanage/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/menumanage/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/menumanage/180.png", sizes: "180x180", type: "image/png" },
      { url: "/menumanage/152.png", sizes: "152x152", type: "image/png" },
      { url: "/menumanage/120.png", sizes: "120x120", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#E64A33",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${plusJakarta.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function setAppHeight() {
                var safeBottom = 0;
                try {
                  var testEl = document.createElement('div');
                  testEl.style.cssText = 'position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);';
                  document.body.appendChild(testEl);
                  safeBottom = parseFloat(getComputedStyle(testEl).paddingBottom) || 0;
                  document.body.removeChild(testEl);
                } catch(e) {}
                var total = window.innerHeight + safeBottom;
                document.documentElement.style.setProperty('--app-height', total + 'px');
              }
              setAppHeight();
              window.addEventListener('resize', setAppHeight);
              window.addEventListener('orientationchange', function() {
                setTimeout(setAppHeight, 100);
              });
            `,
          }}
        />
      </head>
      <body className="bg-bg-light text-text-light-main dark:bg-bg-dark dark:text-text-dark-main font-sans transition-colors duration-300">
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
            Veuillez tourner votre appareil en mode portrait pour utiliser l'application.
          </p>
        </div>

        <AuthProvider>
          {children}
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
              if ('caches' in window) {
                caches.keys().then(function(names) {
                  for (let name of names) {
                    caches.delete(name);
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

