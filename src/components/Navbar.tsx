"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Avatar, Dropdown, message } from "antd";
import {
  CompassOutlined,
  CalendarOutlined,
  SmileOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import pb from "@/app/lib/pocketbase";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Provera ulogovanog korisnika iz PocketBase AuthStore-a
    if (pb.authStore.isValid && pb.authStore.model) {
      setUser(pb.authStore.model);
    }
  }, [pathname]);

  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
    message.success("Uspešno ste se odjavili.");
    router.push("/login");
  };

  const isProvider = user?.role === "provider";

  const userMenuItems = [
    {
      key: "info",
      label: (
        <div style={{ padding: "4px 8px" }}>
          <strong>{user?.name || "Korisnik"}</strong>
          <div style={{ fontSize: 12, color: "#888" }}>{user?.email}</div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Odjavi se",
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <nav className={styles.navbar}>
      {/* BRAND / LOGO */}
      <div
        className={styles.brand}
        onClick={() =>
          router.push(isProvider ? "/dashboard/provider" : "/dashboard/map")
        }
      >
        <span className={styles.logoIcon}>🐾</span>
        <span className={styles.logoText}>
          HELP<span>et</span>
        </span>
      </div>

      {/* DINAMIČKI LINKOVI ZAVISNO OD ULOGE */}
      <div className={styles.menuItems}>
        {isProvider ? (
          <>
            <Link
              href="/dashboard/provider"
              className={`${styles.navLink} ${
                pathname === "/dashboard/provider" ? styles.activeNavLink : ""
              }`}
            >
              <AppstoreOutlined /> Provider Dashboard
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/dashboard/map"
              className={`${styles.navLink} ${
                pathname === "/dashboard/map" ? styles.activeNavLink : ""
              }`}
            >
              <CompassOutlined /> Mapa i Pretraga
            </Link>

            <Link
              href="/dashboard/my-appointments"
              className={`${styles.navLink} ${
                pathname === "/dashboard/my-appointments"
                  ? styles.activeNavLink
                  : ""
              }`}
            >
              <CalendarOutlined /> Moji Termini
            </Link>

            <Link
              href="/dashboard/pets"
              className={`${styles.navLink} ${
                pathname === "/dashboard/pets" ? styles.activeNavLink : ""
              }`}
            >
              <SmileOutlined /> Moji Ljubimci
            </Link>
          </>
        )}
      </div>

      {/* USER PROFIL / LOGOUT */}
      <div className={styles.userSection}>
        {user ? (
          <>
            <span
              className={`${styles.roleBadge} ${
                isProvider ? styles.providerBadge : styles.clientBadge
              }`}
            >
              {isProvider ? "🩺 VETERINAR / SALON" : "🐾 KLIJENT"}
            </span>

            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Avatar
                style={{
                  backgroundColor: isProvider ? "#d97706" : "#0284c7",
                  cursor: "pointer",
                }}
                icon={<UserOutlined />}
              >
                {user.name ? user.name[0].toUpperCase() : "U"}
              </Avatar>
            </Dropdown>
          </>
        ) : (
          <Button
            type="primary"
            onClick={() => router.push("/login")}
            style={{ borderRadius: 8 }}
          >
            Prijavi se
          </Button>
        )}
      </div>
    </nav>
  );
}
