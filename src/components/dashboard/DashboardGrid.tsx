"use client";

import styles from "./dashboard.module.css";
import DashboardMap from "./DashboardMap";
import DashboardLocations from "./DashboardLocations";
export default function DashboardGrid() {
  return (
    <div className={styles.grid}>
      <div className={styles.mapBox}>
        <DashboardMap />
      </div>

      <div className={styles.activity}>
        <h3>Aktivnost</h3>
      </div>

      <div className={styles.locations}>
        <DashboardLocations />
      </div>
    </div>
  );
}
