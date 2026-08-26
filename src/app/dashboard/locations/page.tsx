"use client";

import { Table, Button, Space, Tag, Image } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import pb from "../../lib/pocketbase";
import type { Location } from "@/types/location";
import { getImageUrl } from "@/lib/getImageUrl";
import styles from "./Locations.module.css";

export default function LocationsPage() {
  const router = useRouter();

  const [locations, setLocations] = useState<Location[]>([]);

  const loadLocations = async () => {
    const data = await pb.collection("locations").getFullList<Location>({
      requestKey: null,
      sort: "-created",
    });

    setLocations(data);
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const columns = [
    {
      title: "",
      key: "image",
      width: 85,
      render: (_: any, record: Location) => {
        const url = getImageUrl(record);

        if (!url) {
          return <div className={styles.imagePlaceholder}>Nema slike</div>;
        }

        return (
          <Image
            src={url}
            width={58}
            height={58}
            className={styles.locationImage}
            preview
            alt={record.name}
          />
        );
      },
    },
    {
      title: "Naziv",
      dataIndex: "name",
      render: (name: string) => (
        <div className={styles.locationName}>{name}</div>
      ),
    },

    {
      title: "Tip",
      dataIndex: "type",
      render: (type: string) => {
        const labels: Record<string, string> = {
          vet: "Veterinar",
          shop: "Pet shop",
          salon: "Salon",
          hotel: "Hotel",
        };

        const typeClass: Record<string, string> = {
          vet: styles.typeVet,
          shop: styles.typeShop,
          salon: styles.typeSalon,
          hotel: styles.typeHotel,
        };

        return (
          <Tag
            variant="filled"
            className={`${styles.typeTag} ${
              typeClass[type] || styles.typeDefault
            }`}
          >
            {labels[type] || type}
          </Tag>
        );
      },
    },
    {
      title: "Adresa",
      dataIndex: "address",
      render: (address: string) => (
        <div className={styles.locationAddress}>
          {address || "Adresa nije navedena"}
        </div>
      ),
    },

    {
      title: "Akcije",
      key: "actions",
      width: 180,
      render: (_: any, record: Location) => (
        <div className={styles.actions}>
          <Button
            className={styles.editButton}
            onClick={() => router.push(`/dashboard/locations/${record.id}`)}
          >
            Izmeni
          </Button>

          <Button danger className={styles.deleteButton}>
            Obriši
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div className={styles.headerGlow} />

        <div className={styles.headerContent}>
          <span className={styles.eyebrow}>HELPet LOKACIJE</span>

          <h1>
            Sve <span>lokacije</span>
          </h1>

          <p>
            Upravljaj veterinarima, pet shopovima, salonima i hotelima dostupnim
            na HELPet mapi.
          </p>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          className={styles.addButton}
          onClick={() => router.push("/dashboard/locations/create")}
        >
          Dodaj lokaciju
        </Button>
      </section>

      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={locations}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
          }}
        />
      </section>
    </div>
  );
}
