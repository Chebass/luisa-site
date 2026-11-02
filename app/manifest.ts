import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Health and Beauty",
    short_name: "Health & Beauty",
    description: "Tu agenda en orden, tu mente en calma.",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#fcf3f4",
    theme_color: "#b94a68",
    lang: "es-PE",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
