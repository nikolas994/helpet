"use client";

import { Dropdown, Avatar } from "antd";

import { UserOutlined } from "@ant-design/icons";

import { useRouter } from "next/navigation";

import { useAuth } from "@/app/context/AuthContext";
import Image from "next/image";

import styles from "./Header.module.css";

export default function Header() {
  const router = useRouter();

  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();

    router.push("/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Image
          src="/images/logo1.png"
          alt="Logo"
          width={150}
          height={40}
          style={{
            width: "150px",
            height: "auto",
          }}
        />
      </div>

      <Dropdown
        menu={{
          items: [
            {
              key: "logout",
              label: "Odjavi se",
              onClick: handleLogout,
            },
          ],
        }}
      >
        <div className={styles.user}>
          <Avatar icon={<UserOutlined />} />

          <span>{user?.name}</span>
        </div>
      </Dropdown>
    </header>
  );
}
