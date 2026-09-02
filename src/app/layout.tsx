import type { Metadata } from "next";

import "./globals.css";

import AntdProvider from "@/components/AntdProvider";
import { AuthProvider } from "@/app/context/AuthContext";

export const metadata: Metadata = {
  title: "HELPet",
  description: "HELPet pet community",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr">
      <body>
        <AntdProvider>
          <AuthProvider>{children}</AuthProvider>
        </AntdProvider>
      </body>
    </html>
  );
}
