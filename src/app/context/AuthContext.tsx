"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";

export type UserRole = "client" | "provider";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  role?: UserRole;
  avatar?: string;
  verified?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const syncAuth = () => {
      const model = pb.authStore.model;

      if (pb.authStore.isValid && model) {
        // Normalizujemo rolu na mala slova radi bezbednog poređenja u Guard-u
        const rawRole = model.role
          ? String(model.role).toLowerCase().trim()
          : undefined;

        setUser({
          id: model.id,
          email: model.email,
          name: model.name,
          username: model.username,
          role: rawRole as UserRole | undefined,
          avatar: model.avatar,
          verified: model.verified,
        });
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    syncAuth();

    // Slušamo promene u PocketBase skladištu sesije (login/logout iz bilo kod dela app)
    const unsubscribe = pb.authStore.onChange(() => {
      syncAuth();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const logout = () => {
    // 1. Čistimo PocketBase lokalno skladište
    pb.authStore.clear();
    // 2. Brišemo korisnika iz stanja
    setUser(null);
    // 3. Preusmeravamo na login stranicu i osvežavamo rute
    router.replace("/login");
    router.refresh();
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth mora biti korišćen unutar AuthProvider-a.");
  }

  return context;
}
