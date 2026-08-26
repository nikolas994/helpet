import type { Metadata } from "next";

import "./globals.css";

import AntdProvider from "@/components/AntdProvider";

import { AuthProvider } from "./context/AuthContext";

export const metadata: Metadata = {
  title: "My App",
  description: "My project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AntdProvider>
          <AuthProvider>{children}</AuthProvider>
        </AntdProvider>
      </body>
    </html>
  );
}
