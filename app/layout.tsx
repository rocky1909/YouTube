import type { Metadata } from "next";
import { NavHeader } from "@/components/nav-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Agentic Studio",
  description: "Prompt to publish multi-agent web studio for YouTube teams."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Avenir Next, Manrope, Segoe UI, sans-serif" }}>
        <NavHeader />
        {children}
      </body>
    </html>
  );
}
