"use client";

import { Spin } from "antd";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/app/context/AuthContext";

export default function ProviderGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  // U ProviderGuard.tsx
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Normalizujemo rolu na mala slova radi bezbedne provere
    const userRole = user.role?.toLowerCase().trim();

    if (userRole !== "provider") {
      router.replace("/dashboard/map");
    }
  }, [loading, user, router]);

  // Dok proveravamo sesiju
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Sprečava render provider stranice pre redirecta
  if (!user || user.role !== "provider") {
    return null;
  }

  return <>{children}</>;
}
