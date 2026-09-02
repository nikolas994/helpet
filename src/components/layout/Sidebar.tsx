"use client";

import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleFilled,
  GlobalOutlined,
  HeartFilled,
  HomeOutlined,
  LogoutOutlined,
  UserOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { Popover } from "antd";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/app/context/AuthContext";
import pb from "@/app/lib/pocketbase";

import styles from "./Sidebar.module.css";

/* =========================================================
   TYPES
========================================================= */

type NotificationType =
  | "appointment_created"
  | "appointment_pending"
  | "appointment_confirmed"
  | "appointment_rejected"
  | "appointment_completed";

type Notification = {
  id: string;
  recipient: string;
  tittle?: string;
  message?: string;
  type?: NotificationType;
  read: boolean;
  link?: string;
  appointment?: string;
  created: string;
  updated: string;

  expand?: {
    appointment?: Appointment;
  };
};

type Appointment = {
  id: string;
  user: string;
  location: string;
  pet?: string;
  service?: string;
  date: string;
  status?: string;

  expand?: {
    location?: Location;
    pet?: Pet;
    service?: Service;
  };
};

type Location = {
  id: string;
  name: string;
  type?: string;
};

type Pet = {
  id: string;
  name: string;
};

type Service = {
  id: string;
  name: string;
};

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
   NOTIFICATION TIME
========================================================= */

function formatNotificationTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const difference = now.getTime() - date.getTime();

  if (difference < 0) {
    return "Upravo sada";
  }

  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (minutes < 1) {
    return "Upravo sada";
  }

  if (minutes < 60) {
    return `Pre ${minutes} min`;
  }

  if (hours < 24) {
    return `Pre ${hours} ${hours === 1 ? "sat" : "sati"}`;
  }

  if (days === 1) {
    return "Juče";
  }

  if (days < 7) {
    return `Pre ${days} dana`;
  }

  return date.toLocaleDateString("sr-RS");
}

/* =========================================================
   NOTIFICATION ICON
========================================================= */

function getNotificationIcon(type?: NotificationType) {
  switch (type) {
    case "appointment_created":
    case "appointment_pending":
      return <CalendarOutlined />;

    case "appointment_confirmed":
      return <CheckCircleFilled />;

    case "appointment_rejected":
      return <CloseCircleFilled />;

    case "appointment_completed":
      return <CheckCircleOutlined />;

    default:
      return <BellOutlined />;
  }
}

/* =========================================================
   NOTIFICATION TYPE CLASS
========================================================= */

function getNotificationTypeClass(type?: NotificationType): string {
  switch (type) {
    case "appointment_created":
    case "appointment_pending":
      return styles.notificationPending;

    case "appointment_confirmed":
      return styles.notificationConfirmed;

    case "appointment_rejected":
      return styles.notificationRejected;

    case "appointment_completed":
      return styles.notificationCompleted;

    default:
      return styles.notificationDefault;
  }
}

/* =========================================================
   NOTIFICATION TITLE
========================================================= */

function getNotificationTitle(notification: Notification) {
  if (notification.tittle) {
    return notification.tittle;
  }

  switch (notification.type) {
    case "appointment_created":
    case "appointment_pending":
      return "Čeka potvrdu";

    case "appointment_confirmed":
      return "Termin je potvrđen";

    case "appointment_rejected":
      return "Termin je odbijen";

    case "appointment_completed":
      return "Termin je završen";

    default:
      return "Obaveštenje";
  }
}

/* =========================================================
   NOTIFICATION POPOVER
========================================================= */

function NotificationsPopover({
  notifications,
  onNotificationClick,
  onMarkAllAsRead,
}: {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllAsRead: () => void;
}) {
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <div className={styles.notificationsPopover}>
      {/* HEADER */}

      <div className={styles.notificationsHeader}>
        <div className={styles.notificationsHeaderText}>
          <strong>Obaveštenja</strong>

          <span>
            {unreadCount > 0
              ? `${unreadCount} nepročitano`
              : "Sve je pročitano"}
          </span>
        </div>

        {notifications.length > 0 && (
          <span className={styles.notificationsCount}>
            {notifications.length}
          </span>
        )}
      </div>

      {/* MARK ALL */}

      {unreadCount > 0 && (
        <button
          type="button"
          className={styles.markAllButton}
          onClick={onMarkAllAsRead}
        >
          Označi sve kao pročitano
        </button>
      )}

      <div className={styles.notificationsDivider} />

      {/* LIST */}

      <div className={styles.notificationsList}>
        {notifications.length === 0 ? (
          <div className={styles.statusMessage}>
            <BellOutlined />

            <strong>Nema obaveštenja</strong>

            <span>Kada se nešto važno desi, ovde ćete dobiti obaveštenje.</span>
          </div>
        ) : (
          notifications.map((notification) => {
            const appointment = notification.expand?.appointment;

            const location = appointment?.expand?.location;

            const locationName = location?.name || "Nepoznata ordinacija";

            return (
              <button
                key={notification.id}
                type="button"
                className={`${styles.notificationItem} ${
                  !notification.read ? styles.notificationUnread : ""
                }`}
                onClick={() => onNotificationClick(notification)}
              >
                {/* ICON */}

                <span
                  className={`${
                    styles.notificationIcon
                  } ${getNotificationTypeClass(notification.type)}`}
                >
                  {getNotificationIcon(notification.type)}
                </span>

                {/* CONTENT */}

                <span className={styles.notificationContent}>
                  <strong>{getNotificationTitle(notification)}</strong>

                  {/* ORDINACIJA */}

                  <span className={styles.notificationLocation}>
                    <EnvironmentOutlined />
                    {locationName}
                  </span>

                  {/* MESSAGE */}

                  <span>{notification.message || ""}</span>

                  {/* TIME */}

                  <small>{formatNotificationTime(notification.created)}</small>
                </span>

                {/* UNREAD */}

                {!notification.read && <span className={styles.unreadDot} />}
              </button>
            );
          })
        )}
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

  const { user, logout } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);

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
     LOAD NOTIFICATIONS
  ========================================================= */

  useEffect(() => {
    if (!user?.id || !pb.authStore.isValid) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        const records = await pb
          .collection("notifications")
          .getFullList<Notification>({
            filter: `recipient = "${user.id}"`,
            sort: "-created",

            expand: "appointment,appointment.location",

            requestKey: null,
          });

        if (!cancelled) {
          setNotifications(records);
        }
      } catch (error: any) {
        if (
          error?.isAbort ||
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError" ||
          error?.status === 0
        ) {
          return;
        }

        console.error("Greška pri učitavanju obaveštenja:", error);
      }
    };

    fetchNotifications();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* =========================================================
     REALTIME NOTIFICATIONS
  ========================================================= */

  useEffect(() => {
    if (!user?.id || !pb.authStore.isValid) {
      return;
    }

    let active = true;

    const subscribe = async () => {
      try {
        await pb.collection("notifications").subscribe("*", async (event) => {
          if (!active) {
            return;
          }

          let notification = event.record as unknown as Notification;

          if (notification.recipient !== user.id) {
            return;
          }

          if (event.action === "create") {
            try {
              notification = await pb
                .collection("notifications")
                .getOne<Notification>(notification.id, {
                  expand: "appointment,appointment.location",
                  requestKey: null,
                });
            } catch (error) {
              console.error(
                "Greška pri učitavanju appointment podataka:",
                error,
              );
            }

            setNotifications((current) => {
              const exists = current.some(
                (item) => item.id === notification.id,
              );

              if (exists) {
                return current;
              }

              return [notification, ...current];
            });
          }

          if (event.action === "update") {
            try {
              notification = await pb
                .collection("notifications")
                .getOne<Notification>(notification.id, {
                  expand: "appointment,appointment.location",
                  requestKey: null,
                });
            } catch {
              // Ako expand ne uspe, koristimo realtime record.
            }

            setNotifications((current) =>
              current.map((item) =>
                item.id === notification.id ? notification : item,
              ),
            );
          }

          if (event.action === "delete") {
            setNotifications((current) =>
              current.filter((item) => item.id !== notification.id),
            );
          }
        });
      } catch (error) {
        console.error("Greška pri povezivanju notifications realtime:", error);
      }
    };

    subscribe();

    return () => {
      active = false;

      pb.collection("notifications").unsubscribe("*");
    };
  }, [user?.id]);

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
      key: "/dashboard/my-appointments",
      icon: <CalendarOutlined />,
      label: "Moja zakazivanja",
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
     UNREAD COUNT
  ========================================================= */

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

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

    logout();

    router.replace("/login");
  };

  /* =========================================================
     MARK ONE AS READ
  ========================================================= */

  const markNotificationAsRead = async (notification: Notification) => {
    if (notification.read) {
      return;
    }

    try {
      const updated = await pb
        .collection("notifications")
        .update<Notification>(notification.id, {
          read: true,
        });

      setNotifications((current) =>
        current.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                ...updated,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Greška pri označavanju obaveštenja:", error);
    }
  };

  /* =========================================================
     MARK ALL AS READ
  ========================================================= */

  const markAllNotificationsAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification) => !notification.read,
    );

    if (unreadNotifications.length === 0) {
      return;
    }

    // Odmah ažuriramo lokalno stanje za trenutan prikaz
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      })),
    );

    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          pb.collection("notifications").update(notification.id, {
            read: true,
          }),
        ),
      );
    } catch (error) {
      console.error("Greška pri označavanju svih obaveštenja:", error);
    }
  };

  /* =========================================================
     NOTIFICATIONS OPEN (Automatsko označavanje kao pročitano)
  ========================================================= */

  const handleNotificationsChange = (open: boolean) => {
    setNotificationsOpen(open);

    if (open) {
      setProfileOpen(false);

      // Automatski označava sva obaveštenja kao pročitana čim se otvori
      if (notifications.some((n) => !n.read)) {
        markAllNotificationsAsRead();
      }
    }
  };

  /* =========================================================
     NOTIFICATION CLICK
  ========================================================= */

  const handleNotificationClick = async (notification: Notification) => {
    await markNotificationAsRead(notification);

    setNotificationsOpen(false);

    if (notification.link) {
      router.push(notification.link);
      return;
    }

    if (notification.appointment) {
      router.push("/dashboard/my-appointments");
    }
  };

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const handleNavigation = (path: string) => {
    setNotificationsOpen(false);
    setProfileOpen(false);

    router.push(path);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <aside className={styles.sidebar}>
      {/* BRAND */}

      <div className={styles.brand}>
        <div className={styles.logoWrapper}>
          <Image
            src="/images/logo1.png"
            alt="HELPet"
            width={300}
            height={100}
            className={styles.logo}
            priority
          />
        </div>
      </div>

      {/* NAVIGATION */}

      <div className={styles.navigation}>
        <span className={styles.sectionTitle}>NAVIGACIJA</span>

        <div className={styles.menuContainer}>
          {navigationItems.map((item) => {
            const active = isActive(item.key);

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigation(item.key)}
                className={`${styles.navButton} ${
                  active ? styles.navButtonActive : ""
                }`}
              >
                <span className={styles.navIcon}>{item.icon}</span>

                <span className={styles.navLabel}>{item.label}</span>
              </button>
            );
          })}

          {/* NOTIFICATIONS */}

          <Popover
            open={notificationsOpen}
            trigger="click"
            placement={isMobile ? "top" : "rightTop"}
            onOpenChange={handleNotificationsChange}
            overlayClassName="helpet-notifications-popover"
            content={
              <NotificationsPopover
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAllAsRead={markAllNotificationsAsRead}
              />
            }
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

              {unreadCount > 0 && (
                <span className={styles.notificationBadge}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </Popover>

          {/* PROFILE */}

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
