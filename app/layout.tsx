import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
      <body>{children}</body>
    </html>
  );
}
