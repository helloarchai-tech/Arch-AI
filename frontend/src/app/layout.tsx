import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "Arch.AI — AI-Powered System Architecture Designer",
  description:
    "Transform your product idea into a production-grade system architecture in seconds. AI-powered design, crystal-clear diagrams, and expert tech stack recommendations.",
  keywords: [
    "architecture",
    "AI",
    "system design",
    "tech stack",
    "startup",
    "software architecture",
    "system design tool",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
