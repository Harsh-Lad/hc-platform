import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HC AI Platform",
  description: "Chat & Image Generation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
