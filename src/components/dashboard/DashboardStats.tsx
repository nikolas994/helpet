"use client";

import {
  EnvironmentOutlined,
  TeamOutlined,
  EyeOutlined,
  StarOutlined,
} from "@ant-design/icons";

import styles from "./dashboard.module.css";

const data = [
  {
    title: "Lokacije",
    value: "245",
    icon: <EnvironmentOutlined />,
  },
  {
    title: "Korisnici",
    value: "1540",
    icon: <TeamOutlined />,
  },
  {
    title: "Pregledi",
    value: "12.540",
    icon: <EyeOutlined />,
  },
  {
    title: "Ocena",
    value: "4.8",
    icon: <StarOutlined />,
  },
];

export default function DashboardStats() {
  return (
    <div className={styles.stats}>
      {data.map((item) => (
        <div className={styles.card} key={item.title}>
          <div className={styles.icon}>{item.icon}</div>

          <div>
            <span>{item.title}</span>

            <h2>{item.value}</h2>
          </div>
        </div>
      ))}
    </div>
  );
}
