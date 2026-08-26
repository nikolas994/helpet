"use client";

import { useEffect, useState } from "react";

import pb from "../../app/lib/pocketbase";
import { EnvironmentOutlined } from "@ant-design/icons";

import type { Location } from "@/types/location";

import styles from "./DashboardLocations.module.css";

const typeNames = {
  vet: "Veterinar",
  shop: "Pet shop",
  salon: "Salon",
  hotel: "Hotel",
};

export default function DashboardLocations() {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchLocations = async () => {
      try {
        const data = await pb.collection("locations").getList<Location>(1, 5, {
          sort: "-created",
          requestKey: null,
        });

        if (mounted) {
          setLocations(data.items);
        }
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Greška pri učitavanju lokacija:", error);
      }
    };

    fetchLocations();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Poslednje lokacije</h3>

        <span>Prikaz poslednjih dodatih</span>
      </div>

      <div className={styles.list}>
        {locations.map((location) => (
          <div className={styles.item} key={location.id}>
            <div className={styles.icon}>
              <EnvironmentOutlined />
            </div>

            <div className={styles.info}>
              <h4>{location.name}</h4>

              <p>{typeNames[location.type]}</p>
            </div>

            <div className={styles.address}>{location.address || "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
