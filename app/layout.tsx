import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, Manrope } from "next/font/google";
import "./globals.css";
import { KeyboardAware } from "@/components/keyboard-aware";
import { NumberFit } from "@/components/number-fit";
import { ServiceWorkerRegister } from "@/components/pwa";
import { NO_FLASH_SCRIPT } from "@/lib/theme";

const font = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" });
// Every amount of money is set in this one.
const money = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Budget Tracker",
  description: "Track pockets, spending and budgets by date range.",
  applicationName: "Budget Tracker",
  appleWebApp: { capable: true, title: "Budget Tracker", statusBarStyle: "default" },
  icons: { icon: "/icons/192.png", apple: "/icons/apple-180.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The on-screen keyboard shrinks the page (instead of covering it), so fixed bars and sheets stay above it.
  interactiveWidget: "resizes-content",
  themeColor: "#f7f8fa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${font.variable} ${display.variable} ${money.variable} font-sans antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegister />
        <KeyboardAware />
        <NumberFit />
      </body>
    </html>
  );
}
