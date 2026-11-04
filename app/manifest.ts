import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "セルフレジ",
    short_name: "セルフレジ",
    description: "Square Terminal セルフレジ",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f2f2f0",
    theme_color: "#0066ff",
    lang: "ja",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
