import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arch.AI — AI Architecture Designer",
  description:
    "Convert your product idea into a production-grade system architecture with AI. Visual diagrams, tech stack recommendations, and scalability insights in seconds.",
  keywords: ["architecture", "AI", "system design", "tech stack", "startup", "software architecture"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}

