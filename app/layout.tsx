import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LibreLane Agent",
  description: "AI-powered design agent for LibreLane/OpenLane chip design workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full">
      <body className="h-full bg-[#0d1117] text-slate-200 antialiased">{children}</body>
    </html>
  );
}
