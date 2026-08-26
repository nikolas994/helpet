"use client";

import dynamic from "next/dynamic";
import styles from "./DashboardMap.module.css";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Učitavanje mape...</div>,
});

export default function DashboardMap() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Mapa lokacija</h3>

        <span>Sve aktivne lokacije</span>
      </div>

      <div className={styles.map}>
        <MapView />
      </div>
    </div>
  );
}
