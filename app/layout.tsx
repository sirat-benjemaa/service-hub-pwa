import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./responsive.css";

export const metadata: Metadata = {
  title: "ServiceHub — Services de proximité",
  description: "Découvrez des services de proximité, avec un catalogue accessible hors ligne.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#115e59",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
