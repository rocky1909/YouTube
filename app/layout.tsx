import type { Metadata } from "next";
import { Sora, Space_Grotesk } from "next/font/google";
import { NavHeader } from "@/components/nav-header";
import "./globals.css";

const headingFont = Sora({
  subsets: ["latin"],
  variable: "--font-heading"
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body"
});

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
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body style={{ fontFamily: "var(--font-body)" }}>
        <NavHeader />
        {children}
      </body>
    </html>
  );
}
