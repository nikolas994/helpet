"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Card, Empty, Input, Spin, Tag, message } from "antd";
import {
  HeartFilled,
  SearchOutlined,
  UserOutlined,
  RightOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";
import styles from "./ProviderClients.module.css";
interface Client {
  id: string;
  name?: string;
  username?: string;
  email?: string;
}

interface Pet {
  id: string;
  name: string;
  type?: string;
  breed?: string;
  gender?: string;
  image?: string;
  owner?: string;
}

interface Appointment {
  id: string;
  user: string;
  pet: string;
  location: string;
  date: string;
  status: "pending" | "confirmed" | "rejected" | "completed";

  expand?: {
    user?: Client;
    pet?: Pet;
  };
}

interface Location {
  id: string;
  name: string;
  type?: string;
}

export default function ProviderClientsPage() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const [location, setLocation] = useState<Location | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);

        const userId = pb.authStore.model?.id;

        if (!userId) {
          router.push("/login");
          return;
        }

        /*
         * PROVIDER LOCATION
         */

        const locationResult = await pb
          .collection("locations")
          .getList<Location>(1, 1, {
            filter: `owner = "${userId}"`,
            requestKey: null,
          });

        if (locationResult.items.length === 0) {
          setLocation(null);
          setAppointments([]);
          return;
        }

        const currentLocation = locationResult.items[0];

        setLocation(currentLocation);

        /*
         * APPOINTMENTS
         *
         * Preko appointments dobijamo klijente
         * koji su koristili ovaj objekat.
         */

        const records = await pb
          .collection("appointments")
          .getFullList<Appointment>({
            filter: `location = "${currentLocation.id}"`,
            sort: "-date",
            expand: "user,pet",
            requestKey: null,
          });

        console.log("PROVIDER CLIENTS - appointments:", records);

        setAppointments(records);
      } catch (error: any) {
        if (
          error?.isAbort ||
          error?.name === "AbortError" ||
          error?.status === 0
        ) {
          return;
        }

        console.error("Greška pri učitavanju klijenata:", error);

        messageApi.error("Greška pri učitavanju klijenata.");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [router, messageApi]);

  /*
   * JEDINSTVENI KLIJENTI
   */

  const clients = useMemo(() => {
    const map = new Map<
      string,
      {
        client: Client;
        pets: Map<string, Pet>;
        appointments: Appointment[];
      }
    >();

    appointments.forEach((appointment) => {
      const user = appointment.expand?.user;
      const pet = appointment.expand?.pet;

      if (!user) {
        return;
      }

      if (!map.has(user.id)) {
        map.set(user.id, {
          client: user,
          pets: new Map(),
          appointments: [],
        });
      }

      const entry = map.get(user.id)!;

      entry.appointments.push(appointment);

      if (pet) {
        entry.pets.set(pet.id, pet);
      }
    });

    return Array.from(map.values());
  }, [appointments]);

  /*
   * SEARCH
   */

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return clients;
    }

    return clients.filter(({ client, pets }) => {
      const clientName = client.name || client.username || client.email || "";

      const clientMatches = clientName.toLowerCase().includes(query);

      const petMatches = Array.from(pets.values()).some((pet) =>
        [pet.name, pet.breed, pet.type]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      );

      return clientMatches || petMatches;
    });
  }, [clients, search]);

  /*
   * LOADING
   */

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />

        <p>Učitavanje klijenata...</p>
      </div>
    );
  }

  /*
   * NO LOCATION
   */

  if (!location) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🏢</div>

        <h2>Objekat nije pronađen</h2>

        <p>Vaš nalog nije povezan sa business objektom.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* HEADER */}

      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>BUSINESS</div>

          <h1>Klijenti</h1>

          <p>Pregled klijenata i ljubimaca koji koriste vaš objekat.</p>
        </div>

        <Tag icon={<CalendarOutlined />} color="orange">
          {appointments.length}{" "}
          {appointments.length === 1 ? "zakazivanje" : "zakazivanja"}
        </Tag>
      </div>

      {/* SEARCH */}

      <Card className={styles.searchCard}>
        <Input
          size="large"
          prefix={<SearchOutlined />}
          placeholder="Pretraži klijenta ili ljubimca..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          allowClear
        />
      </Card>

      {/* CLIENTS */}

      {filteredClients.length === 0 ? (
        <Card className={styles.emptyCard}>
          <Empty
            description={
              search ? "Nema rezultata pretrage." : "Još nema klijenata."
            }
          />
        </Card>
      ) : (
        <div className={styles.clientGrid}>
          {filteredClients.map(
            ({ client, pets, appointments: clientAppointments }) => {
              const clientName =
                client.name ||
                client.username ||
                client.email ||
                "Nepoznat klijent";

              const petList = Array.from(pets.values());

              return (
                <Card key={client.id} className={styles.clientCard}>
                  {/* CLIENT */}

                  <div className={styles.clientHeader}>
                    <Avatar size={56} icon={<UserOutlined />} />

                    <div className={styles.clientInfo}>
                      <span>KLIJENT</span>

                      <h2>{clientName}</h2>

                      {client.email && client.name && <p>{client.email}</p>}
                    </div>
                  </div>

                  {/* PETS */}

                  <div className={styles.petsSection}>
                    <div className={styles.petsHeader}>
                      <span>
                        <HeartFilled />
                        Ljubimci
                      </span>

                      <strong>{petList.length}</strong>
                    </div>

                    <div className={styles.petList}>
                      {petList.map((pet) => {
                        const petImage = pet.image
                          ? pb.files.getURL(pet as any, pet.image)
                          : null;

                        return (
                          <button
                            key={pet.id}
                            className={styles.petItem}
                            onClick={() =>
                              router.push(
                                `/dashboard/provider/clients/${pet.id}`,
                              )
                            }
                          >
                            <div className={styles.petImage}>
                              {petImage ? (
                                <img src={petImage} alt={pet.name} />
                              ) : (
                                <span>🐾</span>
                              )}
                            </div>

                            <div className={styles.petInfo}>
                              <strong>{pet.name}</strong>

                              <span>{pet.breed || pet.type || "Ljubimac"}</span>
                            </div>

                            <RightOutlined />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* APPOINTMENTS */}

                  <div className={styles.clientFooter}>
                    <span>
                      <CalendarOutlined />
                      {clientAppointments.length}{" "}
                      {clientAppointments.length === 1 ? "termin" : "termina"}
                    </span>

                    <span>
                      Poslednje zakazivanje:{" "}
                      {new Date(clientAppointments[0].date).toLocaleDateString(
                        "sr-RS",
                      )}
                    </span>
                  </div>
                </Card>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
