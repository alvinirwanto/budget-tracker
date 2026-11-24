import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Budget Tracker",
    short_name: "Budget Tracker",
    description: "Track pockets, spending, budgets and bills.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#ff3378",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Reminders", url: "/reminders", icons: [{ src: "/icons/192.png", sizes: "192x192" }] },
      { name: "Activity", url: "/activity", icons: [{ src: "/icons/192.png", sizes: "192x192" }] },
    ],
  };
}
