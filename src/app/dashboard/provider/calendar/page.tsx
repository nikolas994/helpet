"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Empty, Modal, Select, Spin, Tag, message } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  LeftOutlined,
  RightOutlined,
  ArrowLeftOutlined,
  FilterOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";

import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/sr";

import { useRouter } from "next/navigation";
import pb from "@/app/lib/pocketbase";
import styles from "./ProviderCalendar.module.css";

dayjs.locale("sr");

/* =========================================================
   TYPES
========================================================= */

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
}

interface Pet {
  id: string;
  name?: string;
  type?: string;
  breed?: string;
  image?: string;
}

interface Service {
  id: string;
  name?: string;
  price?: number;
  duration?: number;
}

interface Appointment {
  id: string;
  user: string;
  location: string;
  pet: string;
  service: string;
  date: string;
  status: "pending" | "confirmed" | "rejected" | "completed";
  note?: string;

  expand?: {
    user?: User;
    pet?: Pet;
    service?: Service;
  };
}

interface Location {
  id: string;
  name: string;
  type?: string;
}

type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "rejected";

/* =========================================================
   PAGE
========================================================= */

export default function ProviderCalendarPage() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const [location, setLocation] = useState<Location | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  /* =========================================================
     FETCH DATA
  ========================================================= */

  const fetchData = async () => {
    try {
      setLoading(true);

      const userId = pb.authStore.model?.id;

      if (!userId) {
        router.push("/login");
        return;
      }

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
        error?.status === 0
      ) {
        return;
      }

      console.error("Greška pri učitavanju kalendara:", error);
      messageApi.error("Greška pri učitavanju termina.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* =========================================================
     FILTER & STATS
  ========================================================= */

  const filteredAppointments = useMemo(() => {
    if (statusFilter === "all") {
      return appointments;
    }
    return appointments.filter(
      (appointment) => appointment.status === statusFilter,
    );
  }, [appointments, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "pending").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      completed: appointments.filter((a) => a.status === "completed").length,
    };
  }, [appointments]);

  /* =========================================================
     GET APPOINTMENTS FOR DATE
  ========================================================= */

  const getAppointmentsForDate = (date: Dayjs) => {
    return filteredAppointments.filter((appointment) =>
      dayjs(appointment.date).isSame(date, "day"),
    );
  };

  const selectedDayAppointments = useMemo(() => {
    return getAppointmentsForDate(selectedDate).sort(
      (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
    );
  }, [filteredAppointments, selectedDate]);

  /* =========================================================
     STATUS TAG
  ========================================================= */

  const getStatusTag = (status: Appointment["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Tag
            icon={<ClockCircleOutlined />}
            color="warning"
            className={styles.statusTag}
          >
            Čeka potvrdu
          </Tag>
        );
      case "confirmed":
        return (
          <Tag
            icon={<CheckCircleOutlined />}
            color="success"
            className={styles.statusTag}
          >
            Potvrđeno
          </Tag>
        );
      case "completed":
        return (
          <Tag
            icon={<CheckCircleOutlined />}
            color="processing"
            className={styles.statusTag}
          >
            Završeno
          </Tag>
        );
      case "rejected":
        return (
          <Tag
            icon={<CloseCircleOutlined />}
            color="error"
            className={styles.statusTag}
          >
            Odbijeno
          </Tag>
        );
      default:
        return <Tag className={styles.statusTag}>Nepoznato</Tag>;
    }
  };

  /* =========================================================
     ACTIONS
  ========================================================= */

  const openDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailsOpen(true);
  };

  const updateAppointmentStatus = async (status: Appointment["status"]) => {
    if (!selectedAppointment) return;

    try {
      setUpdatingStatus(true);

      const updated = await pb
        .collection("appointments")
        .update<Appointment>(
          selectedAppointment.id,
          { status },
          { requestKey: null, expand: "user,pet,service" },
        );

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === updated.id ? updated : appointment,
        ),
      );

      setSelectedAppointment(updated);

      messageApi.success(
        status === "confirmed"
          ? "Termin je uspešno potvrđen."
          : status === "rejected"
          ? "Termin je odbijen."
          : "Termin je označen kao završen.",
      );
    } catch (error: any) {
      if (
        error?.isAbort ||
        error?.name === "AbortError" ||
        error?.status === 0
      ) {
        return;
      }
      console.error("Greška pri promeni statusa:", error);
      messageApi.error("Nije moguće promeniti status termina.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  /* =========================================================
     MONTH NAVIGATION
  ========================================================= */

  const previousMonth = () => {
    const newMonth = currentMonth.subtract(1, "month");
    setCurrentMonth(newMonth);
    setSelectedDate(newMonth.startOf("month"));
  };

  const nextMonth = () => {
    const newMonth = currentMonth.add(1, "month");
    setCurrentMonth(newMonth);
    setSelectedDate(newMonth.startOf("month"));
  };

  const goToday = () => {
    const today = dayjs();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  /* =========================================================
     CALENDAR CELLS GENERATION
  ========================================================= */

  const calendarCells = useMemo(() => {
    const startOfMonth = currentMonth.startOf("month");
    const daysInMonth = currentMonth.daysInMonth();
    const firstDay = (startOfMonth.day() + 6) % 7;

    const cells: React.ReactNode[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          className={`${styles.dayCell} ${styles.emptyDay}`}
        />,
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = currentMonth.date(day);
      const dayAppointments = getAppointmentsForDate(date);
      const isToday = date.isSame(dayjs(), "day");
      const isSelected = date.isSame(selectedDate, "day");

      cells.push(
        <button
          key={day}
          type="button"
          className={`
            ${styles.dayCell}
            ${isToday ? styles.today : ""}
            ${isSelected ? styles.selectedDay : ""}
          `}
          onClick={() => setSelectedDate(date)}
        >
          <div className={styles.dayHeader}>
            <span className={styles.dayNumber}>{day}</span>
            {dayAppointments.length > 0 && (
              <span className={styles.badgeCount}>
                {dayAppointments.length}
              </span>
            )}
          </div>

          {dayAppointments.length > 0 && (
            <div className={styles.dayAppointments}>
              {dayAppointments.slice(0, 2).map((appointment) => (
                <div
                  key={appointment.id}
                  className={`${styles.miniAppointment} ${
                    styles[appointment.status]
                  }`}
                >
                  <span className={styles.miniTime}>
                    {dayjs(appointment.date).format("HH:mm")}
                  </span>
                  <span className={styles.miniTitle}>
                    {appointment.expand?.service?.name || "Termin"}
                  </span>
                </div>
              ))}

              {dayAppointments.length > 2 && (
                <div className={styles.moreAppointments}>
                  +{dayAppointments.length - 2} više
                </div>
              )}
            </div>
          )}
        </button>,
      );
    }

    return cells;
  }, [currentMonth, selectedDate, filteredAppointments]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Spin size="large" />
        <p>Učitavanje kalendara i zakazanih termina...</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🏢</div>
        <h2>Objekat nije pronađen</h2>
        <p>Vaš nalog trenutno nije povezan sa registovanim objektom.</p>
        <Button
          type="primary"
          size="large"
          onClick={() => router.push("/dashboard/provider")}
        >
          Nazad na komandnu tablu
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.eyebrow}>
            <CalendarOutlined /> Kalendar Upravljanja
          </span>
          <h1>Raspored zakazivanja</h1>
          <p>
            Objekat: <strong>{location.name}</strong>
          </p>
        </div>

        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/dashboard/provider")}
          className={styles.backBtn}
        >
          Nazad na dashboard
        </Button>
      </header>

      {/* STATS & CONTROLS */}
      <div className={styles.topSection}>
        {/* STATS CARDS */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Ukupno</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statPending}`}>
            <span className={styles.statLabel}>Čeka potvrdu</span>
            <span className={styles.statValue}>{stats.pending}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statConfirmed}`}>
            <span className={styles.statLabel}>Potvrđeno</span>
            <span className={styles.statValue}>{stats.confirmed}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCompleted}`}>
            <span className={styles.statLabel}>Završeno</span>
            <span className={styles.statValue}>{stats.completed}</span>
          </div>
        </div>

        {/* FILTERS & LEGEND CONTAINER */}
        <Card className={styles.controlCard}>
          <div className={styles.controlRow}>
            <div className={styles.filterBox}>
              <span className={styles.controlLabel}>
                <FilterOutlined /> Filtriraj po statusu:
              </span>
              <Select
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                className={styles.filterSelect}
                options={[
                  { value: "all", label: "Svi termini" },
                  { value: "pending", label: "Čekaju potvrdu" },
                  { value: "confirmed", label: "Potvrđeni" },
                  { value: "completed", label: "Završeni" },
                  { value: "rejected", label: "Odbijeni" },
                ]}
              />
            </div>

            <div className={styles.legendBox}>
              <div className={styles.legendItem}>
                <span className={`${styles.dot} ${styles.pending}`} /> Čeka
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.dot} ${styles.confirmed}`} />{" "}
                Potvrđeno
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.dot} ${styles.completed}`} />{" "}
                Završeno
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.dot} ${styles.rejected}`} /> Odbijeno
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* MAIN CALENDAR GRID */}
      <Card className={styles.calendarCard}>
        <div className={styles.calendarHeader}>
          <h2>{currentMonth.format("MMMM YYYY.")}</h2>

          <div className={styles.calendarNav}>
            <Button icon={<LeftOutlined />} onClick={previousMonth} />
            <Button onClick={goToday} className={styles.todayBtn}>
              Danas
            </Button>
            <Button icon={<RightOutlined />} onClick={nextMonth} />
          </div>
        </div>

        <div className={styles.customCalendar}>
          {["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"].map((day) => (
            <div key={day} className={styles.weekDay}>
              {day}
            </div>
          ))}

          {calendarCells}
        </div>
      </Card>

      {/* SELECTED DAY SECTION */}
      <section className={styles.daySection}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Pregled dana</span>
            <h2>{selectedDate.format("dddd, DD. MMMM YYYY.")}</h2>
          </div>

          <span className={styles.dayBadge}>
            {selectedDayAppointments.length}{" "}
            {selectedDayAppointments.length === 1 ? "termin" : "termina"}
          </span>
        </div>

        {selectedDayAppointments.length === 0 ? (
          <Card className={styles.emptyCard}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Nema zakazanih termina za izabrani datum."
            />
          </Card>
        ) : (
          <div className={styles.appointmentsList}>
            {selectedDayAppointments.map((appointment) => {
              const user = appointment.expand?.user;
              const pet = appointment.expand?.pet;
              const service = appointment.expand?.service;

              return (
                <div
                  key={appointment.id}
                  className={`${styles.appointmentCard} ${
                    styles[`border_${appointment.status}`]
                  }`}
                >
                  <div className={styles.appointmentTimeBlock}>
                    <span className={styles.timeText}>
                      {dayjs(appointment.date).format("HH:mm")}
                    </span>
                    <span className={styles.durationText}>
                      {service?.duration ? `${service.duration} min` : "—"}
                    </span>
                  </div>

                  <div className={styles.appointmentContent}>
                    <div className={styles.appointmentMetaHeader}>
                      <h3>{service?.name || "Usluga"}</h3>
                      {getStatusTag(appointment.status)}
                    </div>

                    <div className={styles.appointmentDetails}>
                      <div className={styles.detailChip}>
                        <UserOutlined />
                        <span>
                          {user?.name ||
                            user?.username ||
                            user?.email ||
                            "Klijent"}
                        </span>
                      </div>

                      <div className={styles.detailChip}>
                        <HeartOutlined />
                        <span>{pet?.name || "Ljubimac"}</span>
                      </div>

                      <div className={styles.detailChip}>
                        <MedicineBoxOutlined />
                        <span>
                          {service?.price != null
                            ? `${Number(service.price).toLocaleString(
                                "sr-RS",
                              )} RSD`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.appointmentActions}>
                    {appointment.status === "pending" && (
                      <>
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          className={styles.quickConfirmBtn}
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            updateAppointmentStatus("confirmed");
                          }}
                        />
                        <Button
                          danger
                          icon={<CloseOutlined />}
                          className={styles.quickRejectBtn}
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            updateAppointmentStatus("rejected");
                          }}
                        />
                      </>
                    )}
                    <Button
                      type="default"
                      icon={<EyeOutlined />}
                      onClick={() => openDetails(appointment)}
                      className={styles.detailsBtn}
                    >
                      Detalji
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* DETAILS MODAL */}
      <Modal
        title="Detalji zakazivanja"
        open={detailsOpen}
        onCancel={() => {
          setDetailsOpen(false);
          setSelectedAppointment(null);
        }}
        centered
        className={styles.detailsModal}
        footer={[
          selectedAppointment?.status === "pending" && (
            <Button
              key="reject"
              danger
              icon={<CloseCircleOutlined />}
              loading={updatingStatus}
              onClick={() => updateAppointmentStatus("rejected")}
            >
              Odbij termin
            </Button>
          ),
          selectedAppointment?.status === "pending" && (
            <Button
              key="confirm"
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={updatingStatus}
              onClick={() => updateAppointmentStatus("confirmed")}
            >
              Potvrdi termin
            </Button>
          ),
          selectedAppointment?.status === "confirmed" && (
            <Button
              key="complete"
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={updatingStatus}
              onClick={() => updateAppointmentStatus("completed")}
            >
              Označi kao završeno
            </Button>
          ),
          <Button
            key="close"
            onClick={() => {
              setDetailsOpen(false);
              setSelectedAppointment(null);
            }}
          >
            Zatvori
          </Button>,
        ].filter(Boolean)}
      >
        {selectedAppointment && (
          <div className={styles.modalContent}>
            <div className={styles.modalStatusHeader}>
              {getStatusTag(selectedAppointment.status)}
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.modalRow}>
                <span>Datum i vreme:</span>
                <strong>
                  {dayjs(selectedAppointment.date).format(
                    "DD.MM.YYYY. [u] HH:mm",
                  )}
                </strong>
              </div>

              <div className={styles.modalRow}>
                <span>Usluga:</span>
                <strong>
                  {selectedAppointment.expand?.service?.name || "—"}
                </strong>
              </div>

              <div className={styles.modalRow}>
                <span>Cena:</span>
                <strong>
                  {selectedAppointment.expand?.service?.price != null
                    ? `${Number(
                        selectedAppointment.expand.service.price,
                      ).toLocaleString("sr-RS")} RSD`
                    : "—"}
                </strong>
              </div>

              <div className={styles.modalRow}>
                <span>Trajanje:</span>
                <strong>
                  {selectedAppointment.expand?.service?.duration
                    ? `${selectedAppointment.expand.service.duration} minuta`
                    : "—"}
                </strong>
              </div>

              <div className={styles.modalRow}>
                <span>Klijent:</span>
                <strong>
                  {selectedAppointment.expand?.user?.name ||
                    selectedAppointment.expand?.user?.username ||
                    selectedAppointment.expand?.user?.email ||
                    "—"}
                </strong>
              </div>

              <div className={styles.modalRow}>
                <span>Ljubimac:</span>
                <strong>{selectedAppointment.expand?.pet?.name || "—"}</strong>
              </div>
            </div>

            {selectedAppointment.note && (
              <div className={styles.modalNote}>
                <span>Napomena klijenta:</span>
                <p>{selectedAppointment.note}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
