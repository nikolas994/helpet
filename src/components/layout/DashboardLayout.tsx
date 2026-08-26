"use client";

import { Layout } from "antd";
import { useState } from "react";

import Sidebar from "./Sidebar";

import styles from "./DashboardLayout.module.css";

const { Content } = Layout;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout className={styles.layout}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <Layout>
        <Content className={styles.content}>{children}</Content>
      </Layout>
    </Layout>
  );
}
