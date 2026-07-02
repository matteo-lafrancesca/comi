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
    statusBarStyle: "default",
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
      className={`${plusJakarta.variable} h-dvh overflow-hidden antialiased`}
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
      </head>
      <body className="h-dvh flex flex-col bg-bg-light text-text-light-main dark:bg-bg-dark dark:text-text-dark-main overflow-hidden font-sans transition-colors duration-300">
        <AuthProvider>
          {children}
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/menumanage/sw.js', { scope: '/menumanage/' }).then(
                    function(reg) {
                      console.log('Service Worker registered successfully with scope: ', reg.scope);
                    },
                    function(err) {
                      console.log('Service Worker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

