"use client";

import styles from "./dashboard.module.css";

export default function DashboardHeader() {
  return (
    <div className={styles.header}>
      <div>
        <h1>Dobrodošao nazad 👋</h1>

        <p>Pregled HELPet platforme</p>
      </div>

      <button>+ Dodaj lokaciju</button>
    </div>
  );
}
