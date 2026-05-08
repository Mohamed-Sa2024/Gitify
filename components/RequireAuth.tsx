"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="font-mono text-textDim text-xs uppercase tracking-widest animate-pulse">
          restoring session
        </div>
      </div>
    );
  }
  if (status === "unauthenticated") return null;

  return <>{children}</>;
}
