import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { KeyboardAware } from "@/components/keyboard-aware";
import { NumberFit } from "@/components/number-fit";
import { ServiceWorkerRegister } from "@/components/pwa";
import { NO_FLASH_SCRIPT } from "@/lib/theme";

// Text and headings are set in Quicksand.
const font = Quicksand({ subsets: ["latin"], variable: "--font-sans" });
// Every amount of money is set in this one.
const money = localFont({
  variable: "--font-gt-walsheim",
  display: "swap",
  src: [
    { path: "../public/gt-walsheim-font-family/GT-Walsheim-Regular-Trial-BF651b7fc71a47d.otf", weight: "400", style: "normal" },
    { path: "../public/gt-walsheim-font-family/GT-Walsheim-Medium-Trial-BF651b7fc728fb3.otf", weight: "500 700", style: "normal" },
    { path: "../public/gt-walsheim-font-family/GT-Walsheim-Bold-Trial-BF651b7fc737c57.otf", weight: "800 900", style: "normal" },
  ],
});

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
  // Matches the page in light and dark. The inline script then follows the in-app choice.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e15" },
  ],
  // The on-screen keyboard shrinks the page (instead of covering it), so fixed bars and sheets stay above it.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${font.variable} ${money.variable} font-sans antialiased`}>
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
