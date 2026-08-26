"use client";

import { createContext, useContext, useEffect, useState } from "react";

import pb from "../lib/pocketbase";

export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  contact?: string;
  location?: string;
  avatar?: string;
  emailVisibility?: boolean;
  verified?: boolean;
  created?: string;
  updated?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initialized: false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const currentUser = pb.authStore.record as AuthUser | null;

    setUser(currentUser);
    setLoading(false);
    setInitialized(true);

    const unsubscribe = pb.authStore.onChange(() => {
      setUser(pb.authStore.record as AuthUser | null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialized,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
