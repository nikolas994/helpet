"use client";

import { useEffect } from "react";
import { Spin } from "antd";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/context/AuthContext";

import styles from "./AuthGuard.module.css";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
