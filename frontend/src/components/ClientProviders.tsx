"use client";

import { AuthProvider } from "@/components/AuthContext";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
