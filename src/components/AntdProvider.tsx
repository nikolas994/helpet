"use client";

import { App as AntdApp, ConfigProvider } from "antd";

export default function AntdProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#f97316",
          borderRadius: 10,
        },

        components: {
          Menu: {
            itemSelectedBg: "#fff1e6",
            itemSelectedColor: "#f97316",
            itemHoverBg: "#fff7ed",
          },

          Button: {
            colorPrimary: "#f97316",
          },
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
