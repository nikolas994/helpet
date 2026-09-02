"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  RightOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Empty, Spin, Tag } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import pb from "@/app/lib/pocketbase";
import styles from "./ProviderDashboard.module.css";

interface Location {
  id: string;
  name: string;
  type?: "vet" | "salon" | string;
  address?: string;
  phone?: string;
  owner?: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  location: string;
}

interface Appointment {
  id: string;
  user?: string;
  pet?: string;
  service?: string;
  location: string;
  date: string;
  note?: string;
  status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
  expand?: {
    user?: {
      id: string;
      name?: string;
      email?: string;
    };
    pet?: {
      id: string;
      name?: string;
      type?: string;
    };
    service?: {
      id: string;
      name?: string;
      price?: number;
      duration?: number;
    };
  };
}

export default function ProviderDashboard() {
  const [loading, setLoading] = useState(true);

  const [location, setLocation] = useState<Location | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const fetchProviderData = async () => {
    try {
      setLoading(true);

      const userId = pb.authStore.model?.id;

      if (!userId) {
        setLoading(false);
        return;
      }

      // ============================
      // 1. PROVIDER LOCATION
      // ============================

      const locList = await pb.collection("locations").getList<Location>(1, 1, {
        filter: `owner = "${userId}"`,
        requestKey: null,
      });

      if (locList.items.length === 0) {
        setLocation(null);
        setServices([]);
        setAppointments([]);
        return;
      }

      const currentLocation = locList.items[0];

      setLocation(currentLocation);

      // ============================
      // 2. SERVICES
      // ============================

      const servicesData = await pb
        .collection("services")
        .getFullList<Service>({
          filter: `location = "${currentLocation.id}"`,
          sort: "name",
          requestKey: null,
        });

      setServices(servicesData);

      // ============================
      // 3. APPOINTMENTS
      // ============================

      const appointmentsData = await pb
        .collection("appointments")
        .getFullList<Appointment>({
          filter: `location = "${currentLocation.id}"`,
          expand: "user,pet,service",
          sort: "-date",
          requestKey: null,
        });

      setAppointments(appointmentsData);
    } catch (error) {
      console.error("Greška pri učitavanju provider dashboarda:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderData();
  }, []);

  // ============================
  // STATISTIKA
  // ============================

  const pendingAppointments = useMemo(
    () => appointments.filter((item) => item.status === "pending"),
    [appointments],
  );

  const confirmedAppointments = useMemo(
    () => appointments.filter((item) => item.status === "confirmed"),
    [appointments],
  );

  const todayAppointments = useMemo(() => {
    return appointments
      .filter((item) => dayjs(item.date).isSame(dayjs(), "day"))
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  }, [appointments]);

  const completedAppointments = useMemo(
    () => appointments.filter((item) => item.status === "completed"),
    [appointments],
  );

  const todayRevenue = useMemo(() => {
    return todayAppointments
      .filter(
        (appointment) =>
          appointment.status === "confirmed" ||
          appointment.status === "completed",
      )
      .reduce((total, appointment) => {
        return total + Number(appointment.expand?.service?.price || 0);
      }, 0);
  }, [todayAppointments]);

  const getTypeLabel = () => {
    if (location?.type === "vet") return "Veterinarska ordinacija";
    if (location?.type === "salon") return "Pet grooming salon";

    return "Business objekat";
  };

  const getStatusTag = (status: Appointment["status"]) => {
    switch (status) {
      case "pending":
        return <Tag color="orange">NA ČEKANJU</Tag>;

      case "confirmed":
        return <Tag color="green">POTVRĐENO</Tag>;

      case "completed":
        return <Tag color="blue">ZAVRŠENO</Tag>;

      case "rejected":
        return <Tag color="red">ODBIJENO</Tag>;

      case "cancelled":
        return <Tag color="default">OTKAZANO</Tag>;

      default:
        return <Tag>{(status as string).toUpperCase()}</Tag>;
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
        <p>Učitavanje Business Dashboarda...</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className={styles.emptyState}>
        <ShopOutlined className={styles.emptyIcon} />

        <h2>Nemate registrovan objekat</h2>

        <p>Vaš nalog trenutno nije povezan ni sa jednim business objektom.</p>

        <Link href="/dashboard">
          <Button type="primary">Nazad na HELPet</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* =================================
          HEADER
      ================================= */}

      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>BUSINESS DASHBOARD</div>

          <h1>Dobrodošli nazad 👋</h1>

          <p>
            Upravljajte svojim objektom, uslugama i terminima na jednom mestu.
          </p>
        </div>

        <Link href="/dashboard/provider/services">
          <Button type="primary" icon={<DollarOutlined />} size="large">
            Upravljaj uslugama
          </Button>
        </Link>
      </div>

      {/* =================================
          BUSINESS CARD
      ================================= */}

      <Card className={styles.businessCard}>
        <div className={styles.businessIcon}>
          {location.type === "vet" ? "🩺" : "✂️"}
        </div>

        <div className={styles.businessInfo}>
          <span className={styles.businessType}>{getTypeLabel()}</span>

          <h2>{location.name}</h2>

          <div className={styles.businessMeta}>
            {location.address && (
              <span>
                <EnvironmentOutlined />
                {location.address}
              </span>
            )}

            {location.phone && (
              <span>
                <PhoneOutlined />
                {location.phone}
              </span>
            )}
          </div>
        </div>

        <Link href="/dashboard/provider/location">
          <Button>
            Moj objekat
            <RightOutlined />
          </Button>
        </Link>
      </Card>

      {/* =================================
          STATISTICS
      ================================= */}

      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.orange}`}>
            <CalendarOutlined />
          </div>

          <div>
            <span className={styles.statLabel}>Ukupno termina</span>

            <strong className={styles.statValue}>{appointments.length}</strong>
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.yellow}`}>
            <ClockCircleOutlined />
          </div>

          <div>
            <span className={styles.statLabel}>Na čekanju</span>

            <strong className={styles.statValue}>
              {pendingAppointments.length}
            </strong>
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.green}`}>
            <CheckCircleOutlined />
          </div>

          <div>
            <span className={styles.statLabel}>Potvrđeni termini</span>

            <strong className={styles.statValue}>
              {confirmedAppointments.length}
            </strong>
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blue}`}>
            <DollarOutlined />
          </div>

          <div>
            <span className={styles.statLabel}>Današnji prihod</span>

            <strong className={styles.statValue}>
              {todayRevenue.toLocaleString("sr-RS")} RSD
            </strong>
          </div>
        </Card>
      </div>

      {/* =================================
          CONTENT GRID
      ================================= */}

      <div className={styles.contentGrid}>
        {/* ===============================
            TODAY
        =============================== */}

        <Card
          className={styles.mainCard}
          title={
            <div className={styles.cardTitle}>
              <div>
                <h3>Današnji termini</h3>
                <span>{dayjs().format("DD. MMMM YYYY.")}</span>
              </div>

              <Link href="/dashboard/provider/appointments">
                <Button type="link">
                  Svi termini <RightOutlined />
                </Button>
              </Link>
            </div>
          }
        >
          {todayAppointments.length === 0 ? (
            <Empty
              description="Danas nema zakazanih termina"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <div className={styles.appointmentsList}>
              {todayAppointments.map((appointment) => (
                <div key={appointment.id} className={styles.appointment}>
                  <div className={styles.time}>
                    {dayjs(appointment.date).format("HH:mm")}
                  </div>

                  <div className={styles.appointmentAvatar}>🐾</div>

                  <div className={styles.appointmentInfo}>
                    <strong>
                      {appointment.expand?.pet?.name || "Nepoznat ljubimac"}
                    </strong>

                    <span>
                      {appointment.expand?.service?.name || "Nepoznata usluga"}
                    </span>

                    <small>
                      Klijent:{" "}
                      {appointment.expand?.user?.name ||
                        appointment.expand?.user?.email ||
                        "N/A"}
                    </small>
                  </div>

                  <div className={styles.appointmentStatus}>
                    {getStatusTag(appointment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ===============================
            RIGHT COLUMN
        =============================== */}

        <div className={styles.rightColumn}>
          {/* SERVICES */}
          <Card
            className={styles.smallCard}
            title={
              <div className={styles.cardTitle}>
                <h3>Moje usluge</h3>

                <Link href="/dashboard/provider/services">
                  <RightOutlined />
                </Link>
              </div>
            }
          >
            {services.length === 0 ? (
              <div className={styles.noData}>
                <DollarOutlined />

                <p>Još nemate dodate usluge.</p>

                <Link href="/dashboard/provider/services">
                  <Button type="primary">Dodaj prvu uslugu</Button>
                </Link>
              </div>
            ) : (
              <div className={styles.serviceList}>
                {services.slice(0, 5).map((service) => (
                  <div key={service.id} className={styles.serviceRow}>
                    <div>
                      <strong>{service.name}</strong>

                      <span>{service.duration} min</span>
                    </div>

                    <b>{Number(service.price).toLocaleString("sr-RS")} RSD</b>
                  </div>
                ))}
              </div>
            )}

            {services.length > 5 && (
              <Link
                href="/dashboard/provider/services"
                className={styles.viewAll}
              >
                Prikaži sve usluge <RightOutlined />
              </Link>
            )}
          </Card>

          {/* QUICK ACTIONS */}
          <Card className={styles.smallCard} title="Brze akcije">
            <div className={styles.quickActions}>
              <Link href="/dashboard/provider/services">
                <Button block icon={<DollarOutlined />}>
                  Upravljaj uslugama
                </Button>
              </Link>

              <Link href="/dashboard/provider/appointments">
                <Button block icon={<CalendarOutlined />}>
                  Pregledaj termine
                </Button>
              </Link>

              <Link href="/dashboard/provider/location">
                <Button block icon={<ShopOutlined />}>
                  Izmeni objekat
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* =================================
          SUMMARY
      ================================= */}

      <div className={styles.bottomSummary}>
        <div>
          <UserOutlined />

          <div>
            <strong>{completedAppointments.length}</strong>

            <span>Završena termina</span>
          </div>
        </div>

        <div>
          <DollarOutlined />

          <div>
            <strong>{services.length}</strong>

            <span>Aktivnih usluga</span>
          </div>
        </div>

        <div>
          <CalendarOutlined />

          <div>
            <strong>{todayAppointments.length}</strong>

            <span>Termina danas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
