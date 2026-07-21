import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Champion Equipment",
  description: "Equipment hire management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
