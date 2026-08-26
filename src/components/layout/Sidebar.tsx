"use client";

import {
  BellOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  HeartFilled,
  HomeOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Popover } from "antd";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./Sidebar.module.css";

/* =========================================================
   PROFILE POPOVER
========================================================= */

function ProfilePopover({
  onProfile,
  onLogout,
}: {
  onProfile: () => void;
  onLogout: () => void;
}) {
  return (
    <div className={styles.profilePopover}>
      <button
        type="button"
        className={styles.profileAction}
        onClick={onProfile}
      >
        <span className={styles.profileActionIcon}>
          <UserOutlined />
        </span>

        <span className={styles.profileActionText}>
          <strong>Idi na profil</strong>
          <small>Pogledaj i izmeni profil</small>
        </span>
      </button>

      <button
        type="button"
        className={`${styles.profileAction} ${styles.profileLogout}`}
        onClick={onLogout}
      >
        <span className={styles.profileActionIcon}>
          <LogoutOutlined />
        </span>

        <span className={styles.profileActionText}>
          <strong>Odjavi se</strong>
        </span>
      </button>
    </div>
  );
}

/* =========================================================
   NOTIFICATIONS POPOVER
========================================================= */

function NotificationsPopover() {
  const notifications = [
    {
      id: 1,
      title: "Nova poruka",
      text: "Imate novu poruku od korisnika.",
      time: "Pre 5 min",
    },
    {
      id: 2,
      title: "Nova lokacija",
      text: "Dodata je nova pet-friendly lokacija.",
      time: "Pre 20 min",
    },
    {
      id: 3,
      title: "LovePlace",
      text: "Neko je dodao novu preporuku.",
      time: "Pre 1 sat",
    },
    {
      id: 4,
      title: "Vaš ljubimac",
      text: "Vreme je za podsetnik o pregledu.",
      time: "Pre 2 sata",
    },
    {
      id: 5,
      title: "Dobrodošli na HELPet",
      text: "Hvala što koristite HELPet zajednicu.",
      time: "Juče",
    },
    {
      id: 6,
      title: "Nova preporuka",
      text: "Pogledajte novu preporuku u vašoj blizini.",
      time: "Juče",
    },
    {
      id: 7,
      title: "Nova lokacija",
      text: "Dodato je novo mesto na mapi.",
      time: "Pre 2 dana",
    },
    {
      id: 8,
      title: "LovePlace",
      text: "Nova preporuka je dostupna.",
      time: "Pre 3 dana",
    },
  ];

  return (
    <div className={styles.notificationsPopover}>
      <div className={styles.notificationsHeader}>
        <div className={styles.notificationsHeaderText}>
          <strong>Obaveštenja</strong>
          <span>Vaša najnovija obaveštenja</span>
        </div>

        <span className={styles.notificationsCount}>
          {notifications.length}
        </span>
      </div>

      <div className={styles.notificationsDivider} />

      <div className={styles.notificationsList}>
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            className={styles.notificationItem}
          >
            <span className={styles.notificationIcon}>
              <BellOutlined />
            </span>

            <span className={styles.notificationContent}>
              <strong>{notification.title}</strong>

              <span>{notification.text}</span>

              <small>{notification.time}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

type SidebarProps = {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  /* =========================================================
     RESPONSIVE BREAKPOINT
  ========================================================= */

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1100px)");

    const handleChange = () => {
      setIsMobile(mediaQuery.matches);
    };

    handleChange();

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  /* =========================================================
     NAVIGATION ITEMS
  ========================================================= */

  const navigationItems = [
    {
      key: "/dashboard",
      icon: <HomeOutlined />,
      label: "Pocetna strana",
    },
    {
      key: "/dashboard/map",
      icon: <GlobalOutlined />,
      label: "Mapa",
    },
    {
      key: "/dashboard/loveplace",
      icon: <HeartFilled />,
      label: "LovePlace",
    },
    {
      key: "/dashboard/locations",
      icon: <EnvironmentOutlined />,
      label: "Lokacije",
    },
  ];

  /* =========================================================
     ACTIVE STATE
  ========================================================= */

  const isActive = (key: string) => {
    if (key === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(key);
  };

  const profileIsActive = pathname.startsWith("/dashboard/profile");

  /* =========================================================
     PROFILE
  ========================================================= */

  const handleGoToProfile = () => {
    setProfileOpen(false);
    setNotificationsOpen(false);

    router.push("/dashboard/profile");
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    setProfileOpen(false);
    setNotificationsOpen(false);

    // Tvoj postojeći AuthContext logout
    // Ovde kasnije možeš pozvati:
    // logout();

    router.push("/");
  };

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  const handleNotificationsChange = (open: boolean) => {
    setNotificationsOpen(open);

    if (open) {
      setProfileOpen(false);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <aside className={styles.sidebar}>
      {/* =====================================================
          BRAND
      ===================================================== */}

      <div className={styles.brand}>
        <div className={styles.logoWrapper}>
          <Image
            src="/images/logo.png"
            alt="HELPet"
            width={40}
            height={40}
            className={styles.logo}
            priority
          />
        </div>

        <div className={styles.brandText}>
          <span className={styles.brandName}>HELPet</span>
          <span className={styles.brandSubtitle}>Pet community</span>
        </div>
      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <div className={styles.navigation}>
        <span className={styles.sectionTitle}>NAVIGACIJA</span>

        <div className={styles.menuContainer}>
          {/* =================================================
              STANDARD NAVIGATION
          ================================================= */}

          {navigationItems.map((item) => {
            const active = isActive(item.key);

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setNotificationsOpen(false);
                  router.push(item.key);
                }}
                className={`${styles.navButton} ${
                  active ? styles.navButtonActive : ""
                }`}
              >
                <span className={styles.navIcon}>{item.icon}</span>

                <span className={styles.navLabel}>{item.label}</span>
              </button>
            );
          })}

          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <Popover
            open={notificationsOpen}
            trigger="click"
            placement={isMobile ? "top" : "rightTop"}
            onOpenChange={handleNotificationsChange}
            overlayClassName="helpet-notifications-popover"
            content={<NotificationsPopover />}
          >
            <button
              type="button"
              className={`${styles.navButton} ${styles.notificationButton} ${
                notificationsOpen ? styles.navButtonActive : ""
              }`}
            >
              <span className={styles.navIcon}>
                <BellOutlined />
              </span>

              <span className={styles.navLabel}>Obaveštenja</span>

              <span className={styles.notificationBadge}>8</span>
            </button>
          </Popover>

          {/* =================================================
              PROFILE
          ================================================= */}

          <Popover
            open={profileOpen}
            trigger="click"
            placement={isMobile ? "top" : "rightTop"}
            onOpenChange={(open) => {
              setProfileOpen(open);

              if (open) {
                setNotificationsOpen(false);
              }
            }}
            overlayClassName="helpet-profile-popover"
            content={
              <ProfilePopover
                onProfile={handleGoToProfile}
                onLogout={handleLogout}
              />
            }
          >
            <button
              type="button"
              className={`${styles.navButton} ${
                profileIsActive || profileOpen ? styles.navButtonActive : ""
              }`}
            >
              <span className={styles.navIcon}>
                <UserOutlined />
              </span>

              <span className={styles.navLabel}>Profil</span>
            </button>
          </Popover>
        </div>
      </div>
    </aside>
  );
}
