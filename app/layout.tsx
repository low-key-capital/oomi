import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Unlisted prototype -- the repo is public so preview links can be shared,
  // but nothing here should turn up in search results.
  robots: { index: false, follow: false, nocache: true },
  title: "Oomi — Your private health story",
  description: "A calm, sovereignty-first health companion that helps you notice what matters.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
