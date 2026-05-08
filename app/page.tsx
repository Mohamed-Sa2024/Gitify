"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
    else if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="font-mono text-textDim text-xs uppercase tracking-widest animate-pulse">
        loading
      </div>
    </div>
  );
}
