import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finandance",
  description: "Premium personal finance platform with shared projects and cash flow control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistMono.variable} bg-background font-mono text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
