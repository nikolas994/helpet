"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Empty, Modal, Select, Spin, Tag, message } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  UserOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/sr";

import pb from "@/app/lib/pocketbase";

import styles from "./ProviderAppointments.module.css";

dayjs.locale("sr");

/* =========================================================
   TYPES
========================================================= */

type AppointmentStatus = "pending" | "confirmed" | "rejected" | "completed";

interface AppointmentService {
  id?: string;
  name?: string;
  price?: number | string;
  duration?: number | string;
}

interface AppointmentUser {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
}

interface AppointmentPet {
  id?: string;
  name?: string;
}

interface Appointment {
  id: string;
  user: string;
  location: string;
  pet: string;
  service: string;
  date: string;
  status: AppointmentStatus;
  note?: string;

  expand?: {
    user?: AppointmentUser;
    pet?: AppointmentPet;
    service?: AppointmentService;
  };
}

interface Location {
  id: string;
  name: string;
  type?: string;
}

type StatusFilter = "all" | AppointmentStatus;

/* =========================================================
   PAGE
========================================================= */

export default function ProviderAppointmentsPage() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const [location, setLocation] = useState<Location | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = useCallback((date: string) => {
    return dayjs(date).format("DD.MM.YYYY. [u] HH:mm");
  }, []);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const userId = pb.authStore.model?.id;

      if (!userId) {
        router.replace("/login");
        return;
      }

      /* -------------------------------------------------------
         FIND PROVIDER LOCATION
      ------------------------------------------------------- */

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

      /* -------------------------------------------------------
         LOAD APPOINTMENTS
      ------------------------------------------------------- */

      const appointmentResult = await pb
        .collection("appointments")
        .getFullList<Appointment>({
          filter: `location = "${currentLocation.id}"`,
          sort: "date",
          expand: "user,pet,service",
          requestKey: null,
        });

      setAppointments(appointmentResult);
    } catch (error: any) {
      if (
        error?.isAbort ||
        error?.name === "AbortError" ||
        error?.originalError?.name === "AbortError" ||
        error?.status === 0
      ) {
        return;
      }

      console.error("Greška pri učitavanju zakazivanja:", error);

      messageApi.error("Greška pri učitavanju zakazivanja.");
    } finally {
      setLoading(false);
    }
  }, [messageApi, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const statistics = useMemo(() => {
    return {
      total: appointments.length,

      pending: appointments.filter(
        (appointment) => appointment.status === "pending",
      ).length,

      confirmed: appointments.filter(
        (appointment) => appointment.status === "confirmed",
      ).length,

      completed: appointments.filter(
        (appointment) => appointment.status === "completed",
      ).length,

      rejected: appointments.filter(
        (appointment) => appointment.status === "rejected",
      ).length,
    };
  }, [appointments]);

  /* =========================================================
     FILTERED APPOINTMENTS
  ========================================================= */

  const filteredAppointments = useMemo(() => {
    if (statusFilter === "all") {
      return appointments;
    }

    return appointments.filter(
      (appointment) => appointment.status === statusFilter,
    );
  }, [appointments, statusFilter]);

  /* =========================================================
     STATUS TAG
  ========================================================= */

  const getStatusTag = (status: AppointmentStatus) => {
    switch (status) {
      case "pending":
        return (
          <Tag icon={<ClockCircleOutlined />} color="orange">
            ČEKA POTVRDU
          </Tag>
        );

      case "confirmed":
        return (
          <Tag icon={<CheckCircleOutlined />} color="green">
            POTVRĐENO
          </Tag>
        );

      case "rejected":
        return (
          <Tag icon={<CloseCircleOutlined />} color="red">
            ODBIJENO
          </Tag>
        );

      case "completed":
        return (
          <Tag icon={<CheckCircleOutlined />} color="blue">
            ZAVRŠENO
          </Tag>
        );

      default:
        return <Tag>NEPOZNATO</Tag>;
    }
  };

  /* =========================================================
     UPDATE STATUS
  ========================================================= */

  const updateStatus = async (
    appointment: Appointment,
    status: AppointmentStatus,
  ) => {
    try {
      setUpdatingId(appointment.id);

      /* -------------------------------------------------------
         UPDATE APPOINTMENT
      ------------------------------------------------------- */

      await pb.collection("appointments").update(
        appointment.id,
        {
          status,
        },
        {
          requestKey: null,
        },
      );

      /* -------------------------------------------------------
         UPDATE LOCAL STATE
      ------------------------------------------------------- */

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id
            ? {
                ...item,
                status,
              }
            : item,
        ),
      );

      /* -------------------------------------------------------
         CREATE USER NOTIFICATION
      ------------------------------------------------------- */

      let notification: {
        recipient: string;
        tittle: string;
        message: string;
        type:
          | "appointment_confirmed"
          | "appointment_rejected"
          | "appointment_completed";
        read: boolean;
        link: string;
        appointment: string;
      } | null = null;

      if (status === "confirmed") {
        notification = {
          recipient: appointment.user,
          tittle: "Termin je potvrđen",
          message: `Vaš termin je potvrđen za ${formatDate(appointment.date)}.`,
          type: "appointment_confirmed",
          read: false,
          link: "/dashboard/my-appointments",
          appointment: appointment.id,
        };
      }

      if (status === "rejected") {
        notification = {
          recipient: appointment.user,
          tittle: "Termin je odbijen",
          message: `Nažalost, vaš termin za ${formatDate(
            appointment.date,
          )} nije moguće potvrditi.`,
          type: "appointment_rejected",
          read: false,
          link: "/dashboard/my-appointments",
          appointment: appointment.id,
        };
      }

      if (status === "completed") {
        notification = {
          recipient: appointment.user,
          tittle: "Termin je završen",
          message: `Vaš termin od ${formatDate(
            appointment.date,
          )} je označen kao završen.`,
          type: "appointment_completed",
          read: false,
          link: "/dashboard/my-appointments",
          appointment: appointment.id,
        };
      }

      if (notification) {
        try {
          await pb.collection("notifications").create(notification, {
            requestKey: null,
          });
        } catch (notificationError: any) {
          console.error("NOTIFICATION ERROR:", notificationError);
          console.error(
            "NOTIFICATION RESPONSE:",
            notificationError?.response?.data,
          );
          console.error("NOTIFICATION STATUS:", notificationError?.status);

          messageApi.error(
            notificationError?.response?.message ||
              "Termin je ažuriran, ali notification nije kreiran.",
          );
        }
      }

      /* -------------------------------------------------------
         SUCCESS MESSAGE
      ------------------------------------------------------- */

      const messages: Record<AppointmentStatus, string> = {
        pending: "Zakazivanje je vraćeno na čekanje.",
        confirmed: "Zakazivanje je potvrđeno.",
        rejected: "Zakazivanje je odbijeno.",
        completed: "Zakazivanje je označeno kao završeno.",
      };

      messageApi.success(messages[status]);
    } catch (error) {
      console.error("Greška pri promeni statusa:", error);

      messageApi.error("Nije moguće promeniti status zakazivanja.");
    } finally {
      setUpdatingId(null);
    }
  };

  /* =========================================================
     OPEN DETAILS
  ========================================================= */

  const openDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailsOpen(true);
  };

  /* =========================================================
     CLOSE DETAILS
  ========================================================= */

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedAppointment(null);
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />

        <p>Učitavanje zakazivanja...</p>
      </div>
    );
  }

  /* =========================================================
     NO LOCATION
  ========================================================= */

  if (!location) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🏢</div>

        <h2>Objekat nije pronađen</h2>

        <p>Vaš nalog nije povezan sa business objektom.</p>

        <Button
          type="primary"
          onClick={() => router.push("/dashboard/provider")}
        >
          Nazad na dashboard
        </Button>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>BUSINESS</div>

          <h1>Zakazivanja</h1>

          <p>Upravljajte terminima i zahtevima vaših klijenata.</p>
        </div>

        <Button onClick={() => router.push("/dashboard/provider")}>
          ← Nazad
        </Button>
      </div>

      {/* =====================================================
          LOCATION
      ===================================================== */}

      <div className={styles.locationCard}>
        <div className={styles.locationIcon}>
          {location.type === "vet" ? "🩺" : "🐾"}
        </div>

        <div>
          <span>VAŠ OBJEKAT</span>

          <h2>{location.name}</h2>
        </div>
      </div>

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <div className={styles.stats}>
        <div
          className={`${styles.statCard} ${styles.statAll}`}
          onClick={() => setStatusFilter("all")}
        >
          <div className={styles.statIcon}>
            <CalendarOutlined />
          </div>

          <div>
            <span>Ukupno</span>

            <strong>{statistics.total}</strong>
          </div>
        </div>

        <div
          className={`${styles.statCard} ${styles.statPending}`}
          onClick={() => setStatusFilter("pending")}
        >
          <div className={styles.statIcon}>
            <ClockCircleOutlined />
          </div>

          <div>
            <span>Čekaju potvrdu</span>

            <strong>{statistics.pending}</strong>
          </div>
        </div>

        <div
          className={`${styles.statCard} ${styles.statConfirmed}`}
          onClick={() => setStatusFilter("confirmed")}
        >
          <div className={styles.statIcon}>
            <CheckCircleOutlined />
          </div>

          <div>
            <span>Potvrđeno</span>

            <strong>{statistics.confirmed}</strong>
          </div>
        </div>

        <div
          className={`${styles.statCard} ${styles.statCompleted}`}
          onClick={() => setStatusFilter("completed")}
        >
          <div className={styles.statIcon}>
            <CheckCircleOutlined />
          </div>

          <div>
            <span>Završeno</span>

            <strong>{statistics.completed}</strong>
          </div>
        </div>
      </div>

      {/* =====================================================
          TOOLBAR
      ===================================================== */}

      <div className={styles.toolbar}>
        <div>
          <h2>Termini</h2>

          <p>Pregled svih zakazivanja vašeg objekta.</p>
        </div>

        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          size="large"
          className={styles.filter}
          options={[
            {
              value: "all",
              label: "Sva zakazivanja",
            },
            {
              value: "pending",
              label: "Čekaju potvrdu",
            },
            {
              value: "confirmed",
              label: "Potvrđena",
            },
            {
              value: "completed",
              label: "Završena",
            },
            {
              value: "rejected",
              label: "Odbijena",
            },
          ]}
        />
      </div>

      {/* =====================================================
          APPOINTMENTS
      ===================================================== */}

      {filteredAppointments.length === 0 ? (
        <Card className={styles.emptyAppointments}>
          <Empty
            description={
              statusFilter === "all"
                ? "Još nema zakazivanja."
                : "Nema zakazivanja sa ovim statusom."
            }
          />
        </Card>
      ) : (
        <div className={styles.appointmentsList}>
          {filteredAppointments.map((appointment) => {
            const user = appointment.expand?.user;

            const pet = appointment.expand?.pet;

            const service = appointment.expand?.service;

            return (
              <Card key={appointment.id} className={styles.appointmentCard}>
                {/* TOP */}

                <div className={styles.appointmentTop}>
                  <div>
                    <div className={styles.date}>
                      <CalendarOutlined />

                      {formatDate(appointment.date)}
                    </div>

                    <div className={styles.serviceName}>
                      {service?.name || "Usluga"}
                    </div>
                  </div>

                  {getStatusTag(appointment.status)}
                </div>

                {/* BODY */}

                <div className={styles.appointmentBody}>
                  <div className={styles.infoItem}>
                    <UserOutlined />

                    <div>
                      <span>Klijent</span>

                      <strong>
                        {user?.name ||
                          user?.username ||
                          user?.email ||
                          "Nepoznat korisnik"}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.infoItem}>
                    <HeartOutlined />

                    <div>
                      <span>Ljubimac</span>

                      <strong>{pet?.name || "Nepoznat ljubimac"}</strong>
                    </div>
                  </div>

                  <div className={styles.infoItem}>
                    <ClockCircleOutlined />

                    <div>
                      <span>Trajanje</span>

                      <strong>
                        {service?.duration != null
                          ? `${service.duration} min`
                          : "—"}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.infoItem}>
                    <MedicineBoxOutlined />

                    <div>
                      <span>Cena</span>

                      <strong>
                        {service?.price != null
                          ? `${Number(service.price).toLocaleString(
                              "sr-RS",
                            )} RSD`
                          : "—"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* NOTE */}

                {appointment.note && (
                  <div className={styles.note}>
                    <span>Napomena klijenta</span>

                    <p>{appointment.note}</p>
                  </div>
                )}

                {/* ACTIONS */}

                <div className={styles.actions}>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => openDetails(appointment)}
                  >
                    Detalji
                  </Button>

                  <div className={styles.statusActions}>
                    {appointment.status === "pending" && (
                      <>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          loading={updatingId === appointment.id}
                          onClick={() => updateStatus(appointment, "confirmed")}
                        >
                          Potvrdi
                        </Button>

                        <Button
                          danger
                          icon={<CloseCircleOutlined />}
                          loading={updatingId === appointment.id}
                          onClick={() => updateStatus(appointment, "rejected")}
                        >
                          Odbij
                        </Button>
                      </>
                    )}

                    {appointment.status === "confirmed" && (
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        loading={updatingId === appointment.id}
                        onClick={() => updateStatus(appointment, "completed")}
                      >
                        Označi kao završeno
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      <Modal
        title="Detalji zakazivanja"
        open={detailsOpen}
        onCancel={closeDetails}
        footer={[
          <Button key="close" onClick={closeDetails}>
            Zatvori
          </Button>,
        ]}
      >
        {selectedAppointment && (
          <div className={styles.details}>
            <div className={styles.detailsStatus}>
              {getStatusTag(selectedAppointment.status)}
            </div>

            <div className={styles.detailRow}>
              <span>Datum i vreme</span>

              <strong>{formatDate(selectedAppointment.date)}</strong>
            </div>

            <div className={styles.detailRow}>
              <span>Usluga</span>

              <strong>
                {selectedAppointment.expand?.service?.name || "—"}
              </strong>
            </div>

            <div className={styles.detailRow}>
              <span>Cena</span>

              <strong>
                {selectedAppointment.expand?.service?.price != null
                  ? `${Number(
                      selectedAppointment.expand.service.price,
                    ).toLocaleString("sr-RS")} RSD`
                  : "—"}
              </strong>
            </div>

            <div className={styles.detailRow}>
              <span>Trajanje</span>

              <strong>
                {selectedAppointment.expand?.service?.duration != null
                  ? `${selectedAppointment.expand.service.duration} min`
                  : "—"}
              </strong>
            </div>

            <div className={styles.detailRow}>
              <span>Klijent</span>

              <strong>
                {selectedAppointment.expand?.user?.name ||
                  selectedAppointment.expand?.user?.username ||
                  selectedAppointment.expand?.user?.email ||
                  "—"}
              </strong>
            </div>

            <div className={styles.detailRow}>
              <span>Ljubimac</span>

              <strong>{selectedAppointment.expand?.pet?.name || "—"}</strong>
            </div>

            {selectedAppointment.note && (
              <div className={styles.detailNote}>
                <span>Napomena</span>

                <p>{selectedAppointment.note}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
