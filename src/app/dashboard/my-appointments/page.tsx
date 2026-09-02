"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Button,
  Card,
  Popconfirm,
  message,
  Typography,
  Empty,
} from "antd";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import pb from "@/app/lib/pocketbase";
import styles from "./my-appointments.module.css";

const { Title, Text } = Typography;

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
    location?: {
      name?: string;
      address?: string;
    };
    pet?: {
      name?: string;
    };
    service?: {
      name?: string;
      price?: number;
    };
  };
}

export default function MyAppointmentsPage() {
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  /* =========================================================
     FETCH APPOINTMENTS
  ========================================================= */

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const userId = pb.authStore.model?.id;

      if (!userId) {
        setAppointments([]);
        return;
      }

      const data = await pb
        .collection("appointments")
        .getFullList<Appointment>({
          filter: `user = "${userId}"`,
          expand: "location,pet,service",
          sort: "-date",
          requestKey: null,
        });

      setAppointments(data);
    } catch (error) {
      console.error("Greška pri preuzimanju termina:", error);

      messageApi.error("Greška pri preuzimanju vaših termina.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchAppointments();
  }, []);

  /* =========================================================
     CAN CANCEL
     
     Dozvoljeno samo:
     - pending
     - confirmed

     I samo ako termin još nije prošao.
  ========================================================= */

  const canCancel = (appointment: Appointment) => {
    const isCorrectStatus =
      appointment.status === "pending" || appointment.status === "confirmed";

    const isPast = dayjs(appointment.date).isBefore(dayjs());

    return isCorrectStatus && !isPast;
  };

  /* =========================================================
     CANCEL APPOINTMENT
  ========================================================= */

  const handleCancelAppointment = async (appointment: Appointment) => {
    // Dodatna sigurnosna provera
    if (!canCancel(appointment)) {
      return;
    }

    try {
      await pb.collection("appointments").delete(appointment.id);

      messageApi.success("Termin je uspešno otkazan.");

      await fetchAppointments();
    } catch (error) {
      console.error("Greška pri otkazivanju termina:", error);

      messageApi.error("Greška pri otkazivanju termina.");
    }
  };

  /* =========================================================
     CANCEL BUTTON
  ========================================================= */

  const renderCancelButton = (appointment: Appointment, mobile = false) => {
    if (!canCancel(appointment)) {
      return null;
    }

    return (
      <Popconfirm
        title="Otkazivanje termina"
        description="Da li ste sigurni da želite da otkažete ovaj termin?"
        onConfirm={() => handleCancelAppointment(appointment)}
        okText="Da, otkaži"
        cancelText="Ne"
        placement="topRight"
      >
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          size="small"
          className={mobile ? styles.mobileCancelBtn : styles.cancelBtn}
        >
          Otkaži
        </Button>
      </Popconfirm>
    );
  };

  /* =========================================================
     ACTION STATUS
  ========================================================= */

  const renderFinishedAction = () => {
    return (
      <span className={styles.appointmentFinished}>
        <CheckCircleOutlined />
        Završeno
      </span>
    );
  };

  const renderRejectedAction = () => {
    return (
      <span className={styles.appointmentRejected}>
        <CloseCircleOutlined />
        Nije potvrđeno
      </span>
    );
  };

  /* =========================================================
     ACTION
  ========================================================= */

  const renderAction = (appointment: Appointment) => {
    const appointmentDate = dayjs(appointment.date);
    const isPast = appointmentDate.isBefore(dayjs());

    /*
      ZAVRŠENO
    */

    if (appointment.status === "completed") {
      return renderFinishedAction();
    }

    /*
      ODBIJENO
    */

    if (appointment.status === "rejected") {
      return renderRejectedAction();
    }

    /*
      TERMIN JE PROŠAO

      Čak i ako je status pending/confirmed,
      više ne može da se otkaže.
    */

    if (isPast) {
      return renderFinishedAction();
    }

    /*
      PENDING + CONFIRMED

      OBA mogu da se otkažu.
    */

    if (
      appointment.status === "pending" ||
      appointment.status === "confirmed"
    ) {
      return renderCancelButton(appointment);
    }

    return null;
  };

  /* =========================================================
     STATUS
  ========================================================= */

  const renderStatus = (status: Appointment["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Tag
            icon={<ClockCircleOutlined />}
            className={`${styles.statusTag} ${styles.statusPending}`}
          >
            ČEKA POTVRDU
          </Tag>
        );

      case "confirmed":
        return (
          <Tag
            icon={<CheckCircleOutlined />}
            className={`${styles.statusTag} ${styles.statusConfirmed}`}
          >
            POTVRĐENO
          </Tag>
        );

      case "rejected":
        return (
          <Tag
            icon={<CloseCircleOutlined />}
            className={`${styles.statusTag} ${styles.statusRejected}`}
          >
            ODBIJENO
          </Tag>
        );

      case "completed":
        return (
          <Tag
            icon={<CheckCircleOutlined />}
            className={`${styles.statusTag} ${styles.statusCompleted}`}
          >
            ZAVRŠENO
          </Tag>
        );

      default:
        return <Tag className={styles.statusTag}>NEPOZNATO</Tag>;
    }
  };

  /* =========================================================
     TABLE COLUMNS
  ========================================================= */

  const columns = [
    {
      title: "Objekat",
      dataIndex: ["expand", "location", "name"],
      key: "location",

      render: (text: string, record: Appointment) => (
        <div className={styles.locationWrapper}>
          <div className={styles.locationName}>
            {text || "Nepoznat objekat"}
          </div>

          <div className={styles.locationAddress}>
            <EnvironmentOutlined />

            <span>
              {record.expand?.location?.address || "Nepoznata adresa"}
            </span>
          </div>
        </div>
      ),
    },

    {
      title: "Ljubimac",
      dataIndex: ["expand", "pet", "name"],
      key: "pet",

      render: (text: string) => (
        <span className={styles.petName}>
          <span className={styles.petIcon}>🐾</span>

          {text || "Nepoznat ljubimac"}
        </span>
      ),
    },

    {
      title: "Usluga",
      dataIndex: ["expand", "service", "name"],
      key: "service",

      render: (text: string, record: Appointment) => (
        <div className={styles.serviceWrapper}>
          <div className={styles.serviceName}>{text || "Nepoznata usluga"}</div>

          {record.expand?.service?.price !== undefined &&
            record.expand?.service?.price !== null && (
              <div className={styles.servicePrice}>
                {Number(record.expand.service.price).toLocaleString("sr-RS")}{" "}
                RSD
              </div>
            )}
        </div>
      ),
    },

    {
      title: "Datum i vreme",
      dataIndex: "date",
      key: "date",

      render: (date: string) => {
        const appointmentDate = dayjs(date);

        return (
          <div className={styles.dateWrapper}>
            <div className={styles.dateBadge}>
              <CalendarOutlined />

              <span>{appointmentDate.format("DD.MM.YYYY.")}</span>
            </div>

            <div className={styles.timeText}>
              {appointmentDate.format("HH:mm")}
            </div>
          </div>
        );
      },
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",

      render: (status: Appointment["status"]) => renderStatus(status),
    },

    {
      title: "Akcija",
      key: "action",

      render: (_: unknown, record: Appointment) => renderAction(record),
    },
  ];

  /* =========================================================
     MOBILE CARD
  ========================================================= */

  const renderMobileAppointment = (appointment: Appointment) => {
    const appointmentDate = dayjs(appointment.date);

    const locationName =
      appointment.expand?.location?.name || "Nepoznat objekat";

    const locationAddress =
      appointment.expand?.location?.address || "Nepoznata adresa";

    const petName = appointment.expand?.pet?.name || "Nepoznat ljubimac";

    const serviceName = appointment.expand?.service?.name || "Nepoznata usluga";

    const price = appointment.expand?.service?.price;

    return (
      <div key={appointment.id} className={styles.appointmentMobileCard}>
        {/* =================================================
            TOP
        ================================================= */}

        <div className={styles.mobileCardTop}>
          <div className={styles.mobileLocation}>
            <div className={styles.mobileLocationName}>{locationName}</div>

            <div className={styles.mobileLocationAddress}>
              <EnvironmentOutlined />

              <span>{locationAddress}</span>
            </div>
          </div>

          <div className={styles.mobileStatus}>
            {renderStatus(appointment.status)}
          </div>
        </div>

        {/* =================================================
            INFO
        ================================================= */}

        <div className={styles.mobileInfoGrid}>
          {/* PET */}

          <div className={styles.mobileInfoItem}>
            <span className={styles.mobileInfoLabel}>Ljubimac</span>

            <div className={styles.mobilePet}>
              <span className={styles.mobilePetIcon}>🐾</span>

              <span>{petName}</span>
            </div>
          </div>

          {/* SERVICE */}

          <div className={styles.mobileInfoItem}>
            <span className={styles.mobileInfoLabel}>Usluga</span>

            <div className={styles.mobileService}>
              <span className={styles.mobileServiceName}>{serviceName}</span>

              {price !== undefined && price !== null && (
                <span className={styles.mobileServicePrice}>
                  {Number(price).toLocaleString("sr-RS")} RSD
                </span>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            BOTTOM
        ================================================= */}

        <div className={styles.mobileCardBottom}>
          <div className={styles.mobileDate}>
            <CalendarOutlined />

            <span>{appointmentDate.format("DD.MM.YYYY.")}</span>

            <span className={styles.mobileTime}>
              {appointmentDate.format("HH:mm")}
            </span>
          </div>

          <div className={styles.mobileAction}>
            {canCancel(appointment) ? (
              renderCancelButton(appointment, true)
            ) : appointment.status === "rejected" ? (
              <span className={styles.mobileRejected}>
                <CloseCircleOutlined />
                Nije potvrđeno
              </span>
            ) : (
              <span className={styles.mobileFinished}>
                <CheckCircleOutlined />
                Završeno
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className={styles.container}>
      {contextHolder}

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className={styles.titleWrapper}>
        <div className={styles.titleContent}>
          <span className={styles.eyebrow}>HELPet • Zakazivanja</span>

          <Title level={2} className={styles.pageTitle}>
            Moji Termini
          </Title>

          <Text type="secondary" className={styles.pageSubtitle}>
            Pregled svih zakazanih poseta i njihovih statusa
          </Text>
        </div>

        <div className={styles.appointmentCount}>
          <strong>{appointments.length}</strong>

          <span>{appointments.length === 1 ? "termin" : "termina"}</span>
        </div>
      </div>

      {/* =====================================================
          APPOINTMENTS
      ===================================================== */}

      <Card className={styles.headerCard} style={{ marginTop: 18 }}>
        {appointments.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className={styles.emptyContent}>
                <strong>Nemate zakazanih termina</strong>

                <span>
                  Kada zakažete pregled ili neku drugu uslugu, vaši termini će
                  se pojaviti ovde.
                </span>
              </div>
            }
          />
        ) : (
          <>
            {/* =================================================
                DESKTOP TABLE
            ================================================= */}

            <div className={styles.desktopTable}>
              <Table
                columns={columns}
                dataSource={appointments}
                rowKey="id"
                loading={loading}
                pagination={{
                  pageSize: 8,
                  showSizeChanger: false,
                  hideOnSinglePage: true,
                }}
              />
            </div>

            {/* =================================================
                MOBILE CARDS
            ================================================= */}

            {!loading && appointments.length > 0 && (
              <div className={styles.mobileAppointments}>
                {appointments.map(renderMobileAppointment)}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
