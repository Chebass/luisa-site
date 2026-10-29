import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Luisa · bienestar",
    short_name: "Luisa",
    description: "Tu agenda en orden, tu mente en calma.",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#f6f4ee",
    theme_color: "#5b6548",
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
