import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa";
import { NO_FLASH_SCRIPT } from "@/lib/theme";

const font = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" });

export const metadata: Metadata = {
  title: "Luar — budget tracker",
  description: "Track pockets, spending and budgets by date range.",
  applicationName: "Luar",
  appleWebApp: { capable: true, title: "Luar", statusBarStyle: "default" },
  icons: { icon: "/icons/192.png", apple: "/icons/apple-180.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ff3378" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1214" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${font.variable} ${display.variable} font-sans antialiased`}>
      <head>
        <meta name="color-scheme" content="light dark" suppressHydrationWarning />
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
