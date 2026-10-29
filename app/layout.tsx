import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./interface.css";
import { PwaRegistration } from "@/components/pwa-registration";
export const metadata: Metadata = {
  title: { default: "Luisa · bienestar", template: "%s · Luisa" },
  description:
    "Tu agenda en orden, tu mente en calma. Tu espacio para masajes y bienestar.",
  applicationName: "Luisa bienestar",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Luisa" },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f4ee",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-PE" data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">
          Ir al contenido
        </a>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
