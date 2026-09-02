"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  DashboardOutlined,
  ShopOutlined,
  DollarOutlined,
  CalendarOutlined,
  TeamOutlined,
  SettingOutlined,
  ArrowLeftOutlined,
  LogoutOutlined,
  MenuOutlined,
  CloseOutlined,
} from "@ant-design/icons";

import { useAuth } from "@/app/context/AuthContext";
import ProviderGuard from "@/components/auth/ProviderGuard";

import styles from "./ProviderLayout.module.css";

const menuItems = [
  {
    href: "/dashboard/provider",
    label: "Dashboard",
    icon: <DashboardOutlined />,
  },
  {
    href: "/dashboard/provider/location",
    label: "Moj objekat",
    icon: <ShopOutlined />,
  },
  {
    href: "/dashboard/provider/services",
    label: "Moje usluge",
    icon: <DollarOutlined />,
  },
  {
    href: "/dashboard/provider/appointments",
    label: "Termini",
    icon: <CalendarOutlined />,
  },
  {
    href: "/dashboard/provider/calendar",
    label: "Kalendar",
    icon: <CalendarOutlined />,
  },
  {
    href: "/dashboard/provider/clients",
    label: "Klijenti",
    icon: <TeamOutlined />,
  },
  {
    href: "/dashboard/provider/settings",
    label: "Podešavanja",
    icon: <SettingOutlined />,
  },
];

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    setMobileOpen(false);

    logout();

    router.replace("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard/provider") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  };

  return (
    <ProviderGuard>
      <div className={styles.layout}>
        {/* MOBILE OVERLAY */}

        {mobileOpen && (
          <div
            className={styles.overlay}
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* SIDEBAR */}

        <aside
          className={`${styles.sidebar} ${
            mobileOpen ? styles.sidebarOpen : ""
          }`}
        >
          <div className={styles.brand}>
            <div>
              <div className={styles.brandName}>
                <img src="/images/logo1.png" />
              </div>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setMobileOpen(false)}
              aria-label="Zatvori meni"
            >
              <CloseOutlined />
            </button>
          </div>

          <div className={styles.sectionTitle}>BUSINESS PANEL</div>

          <nav className={styles.navigation}>
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`${styles.navItem} ${
                  isActive(item.href) ? styles.active : ""
                }`}
              >
                <span className={styles.navIcon}>{item.icon}</span>

                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className={styles.sidebarBottom}>
            <Link
              href="/dashboard"
              className={styles.backLink}
              onClick={() => setMobileOpen(false)}
            >
              <ArrowLeftOutlined />

              <span>Nazad na HELPet</span>
            </Link>

            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
            >
              <LogoutOutlined />

              <span>Odjavi se</span>
            </button>
          </div>
        </aside>

        {/* MAIN */}

        <main className={styles.main}>
          <header className={styles.mobileHeader}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setMobileOpen(true)}
              aria-label="Otvori meni"
            >
              <MenuOutlined />
            </button>

            <div className={styles.mobileBrand}>
              <strong>HELPet</strong>
              <span>BUSINESS</span>
            </div>
          </header>

          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </ProviderGuard>
  );
}
