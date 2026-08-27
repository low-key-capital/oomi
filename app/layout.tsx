import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oomi — Your private health story",
  description: "A calm, sovereignty-first health companion that helps you notice what matters.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  // Added to the Home Screen from the iOS Simulator, so it runs standalone with
  // the real status bar drawn over the page. `black-translucent` lets the wash
  // reach under the notch; the safe-area insets in globals.css keep content clear
  // of it. This is also why the fake 9:41 / dynamic island / battery were removed.
  appleWebApp: {
    capable: true,
    title: "Oomi",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Required for env(safe-area-inset-*) to resolve to anything but 0.
  viewportFit: "cover",
  themeColor: "#112b22",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300,0,0&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
