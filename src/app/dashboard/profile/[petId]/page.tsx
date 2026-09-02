"use client";

import {
  AlertOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  HeartFilled,
  InfoCircleOutlined,
  MedicineBoxOutlined,
  MoreOutlined,
  PlusOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { App, Avatar, Button, Card, Dropdown, Modal, Tag } from "antd";
import type { MenuProps } from "antd";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";
import styles from "./PetProfile.module.css";

/* =========================================================
   TYPES
========================================================= */

type Pet = {
  id: string;
  name: string;
  type: "dog" | "cat" | "bird" | "rabbit" | "other";
  breed?: string;
  gender?: "male" | "female";
  birthday?: string;
  weight?: number;
  microchip?: string;
  color?: string;
  neutered?: boolean;
  image?: string;
  owner?: string;
  showInLoveplace?: boolean;
};

type Vaccination = {
  id: string;
  pet?: string;
  name?: string;
  type?: string;
  date?: string;
  nextDate?: string;
  vet?: string;
  notes?: string;
};

type Visit = {
  id: string;
  pet?: string;
  date?: string;
  title?: string;
  vet?: string;
  description?: string;
  diagnosis?: string;
  notes?: string;
  weight?: number;
};

type Therapy = {
  id: string;
  pet?: string;
  name?: string;
  dosage?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  active?: boolean;
};

type Allergy = {
  id: string;
  pet?: string;
  name?: string;
  reaction?: string;
  severity?: string;
  notes?: string;
};

type Document = {
  id: string;
  pet?: string;
  name?: string;
  type?: "medical_record" | "passport" | "lab_result" | "invoice" | "other";
  file?: string;
  notes?: string;
  created?: string;
};

/* =========================================================
   NAMES
========================================================= */

const documentTypeNames: Record<NonNullable<Document["type"]>, string> = {
  medical_record: "Medicinski karton",
  passport: "Pasoš",
  lab_result: "Laboratorijski rezultat",
  invoice: "Račun",
  other: "Ostalo",
};

const typeNames: Record<Pet["type"], string> = {
  dog: "Pas",
  cat: "Mačka",
  bird: "Ptica",
  rabbit: "Zec",
  other: "Drugo",
};

const genderNames: Record<NonNullable<Pet["gender"]>, string> = {
  male: "Mužjak",
  female: "Ženka",
};

const allergyReactionNames: Record<string, string> = {
  itching: "Svrab",
  redness: "Crvenilo kože",
  swelling: "Oticanje",
  vomiting: "Povraćanje",
  diarrhea: "Dijareja",
  breathing: "Problemi sa disanjem",
  other: "Drugo",
};

const allergySeverityNames: Record<string, string> = {
  mild: "Blaga",
  moderate: "Umerena",
  severe: "Teška",
};

/* =========================================================
   HELPERS
========================================================= */

function calculateAge(birthday?: string) {
  if (!birthday) return "-";

  const birthDate = new Date(birthday);

  if (Number.isNaN(birthDate.getTime())) {
    return "-";
  }

  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (today.getDate() < birthDate.getDate()) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years === 0) {
    if (months === 0) return "Manje od 1 meseca";
    if (months === 1) return "1 mesec";
    if (months >= 2 && months <= 4) return `${months} meseca`;

    return `${months} meseci`;
  }

  if (years === 1) return "1 godina";

  if (years >= 2 && years <= 4) {
    return `${years} godine`;
  }

  return `${years} godina`;
}

function formatDate(date?: string) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("sr-RS");
}

function getNoteSection(notes: string | undefined, label: string) {
  if (!notes) return "";

  const lines = notes.split("\n\n");

  const line = lines.find((item) => item.startsWith(`${label}:`));

  if (!line) return "";

  return line.replace(`${label}:`, "").trim();
}

/* =========================================================
   COMPONENT
========================================================= */

export default function PetProfilePage() {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const params = useParams();

  const petId = params.petId as string;

  const [pet, setPet] = useState<Pet | null>(null);

  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);

  const [visits, setVisits] = useState<Visit[]>([]);

  const [therapies, setTherapies] = useState<Therapy[]>([]);

  const [allergies, setAllergies] = useState<Allergy[]>([]);

  const [documents, setDocuments] = useState<Document[]>([]);

  const [loading, setLoading] = useState(true);

  const [loveplaceLoading, setLoveplaceLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  useEffect(() => {
    const fetchPetData = async () => {
      try {
        if (!pb.authStore.isValid) {
          router.push("/dashboard/profile");
          return;
        }

        if (!petId) {
          setPet(null);
          return;
        }

        const currentUserId = pb.authStore.record?.id;

        const petRecord = await pb.collection("pets").getOne<Pet>(petId);

        if (petRecord.owner !== currentUserId) {
          setPet(null);
          return;
        }

        setPet(petRecord);

        /* =========================
           VACCINATIONS
        ========================= */

        try {
          const vaccinationRecords = await pb
            .collection("vaccinations")
            .getFullList<Vaccination>({
              sort: "-date",
              filter: `pet = "${petId}"`,
            });

          setVaccinations(vaccinationRecords);
        } catch {
          setVaccinations([]);
        }

        /* =========================
           VISITS
        ========================= */

        try {
          const visitRecords = await pb
            .collection("visits")
            .getFullList<Visit>({
              sort: "-date",
              filter: `pet = "${petId}"`,
            });

          setVisits(visitRecords);
        } catch {
          setVisits([]);
        }

        /* =========================
           THERAPIES
        ========================= */

        try {
          const therapyRecords = await pb
            .collection("therapies")
            .getFullList<Therapy>({
              sort: "-startDate",
              filter: `pet = "${petId}"`,
            });

          setTherapies(therapyRecords);
        } catch {
          setTherapies([]);
        }

        /* =========================
           ALLERGIES
        ========================= */

        try {
          const allergyRecords = await pb
            .collection("allergies")
            .getFullList<Allergy>({
              sort: "-created",
              filter: `pet = "${petId}"`,
            });

          setAllergies(allergyRecords);
        } catch {
          setAllergies([]);
        }

        /* =========================
           DOCUMENTS
        ========================= */

        try {
          const documentRecords = await pb
            .collection("documents")
            .getFullList<Document>({
              sort: "-created",
              filter: `pet = "${petId}"`,
            });

          setDocuments(documentRecords);
        } catch {
          setDocuments([]);
        }
      } catch (error: any) {
        if (
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError"
        ) {
          return;
        }

        console.error("Greška pri učitavanju e-kartona:", error);

        setPet(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPetData();
  }, [petId, router]);

  /* =========================================================
     PET IMAGE
  ========================================================= */

  const petImage =
    pet?.image && pet ? pb.files.getURL(pet as any, pet.image) : null;

  /* =========================================================
     LOVEPLACE
  ========================================================= */

  const handleToggleLoveplace = async () => {
    if (!pet) return;

    try {
      setLoveplaceLoading(true);

      const newValue = !pet.showInLoveplace;

      const updatedPet = await pb.collection("pets").update<Pet>(pet.id, {
        showInLoveplace: newValue,
      });

      setPet(updatedPet);

      message.success(
        newValue
          ? `${pet.name} je sada prikazan u Loveplace-u.`
          : `${pet.name} je uklonjen iz Loveplace-a.`,
      );
    } catch {
      message.error("Greška pri promeni statusa.");
    } finally {
      setLoveplaceLoading(false);
    }
  };

  /* =========================================================
     DELETE PET
  ========================================================= */

  const handleDeletePet = () => {
    if (!pet) return;

    modal.confirm({
      title: "Obriši ljubimca?",
      content: (
        <div>
          <p>
            Da li si siguran da želiš da obrišeš <strong>{pet.name}</strong>?
          </p>

          <p style={{ color: "#8b8f96" }}>
            Ova radnja je trajna i ljubimac više neće biti dostupan na profilu.
          </p>
        </div>
      ),
      okText: "Obriši",
      cancelText: "Otkaži",
      okType: "danger",
      centered: true,

      async onOk() {
        try {
          setDeleteLoading(true);

          await pb.collection("pets").delete(pet.id);

          message.success(`${pet.name} je uspešno obrisan.`);

          router.push("/dashboard/profile");
          router.refresh();
        } catch {
          message.error("Nije moguće obrisati ljubimca.");
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };
  /* =========================================================
     GENERIC DELETE RECORD
  ========================================================= */

  const deleteRecord = async (
    collection:
      | "vaccinations"
      | "visits"
      | "therapies"
      | "allergies"
      | "documents",
    id: string,
    label: string,
    onSuccess: () => void,
  ) => {
    modal.confirm({
      title: `Obriši ${label}?`,
      content: (
        <p>
          Da li si siguran da želiš da obrišeš ovaj zapis?
          <br />
          <span className={styles.deleteWarning}>
            Ova radnja se ne može poništiti.
          </span>
        </p>
      ),
      okText: "Obriši",
      cancelText: "Otkaži",
      okType: "danger",
      centered: true,

      async onOk() {
        try {
          await pb.collection(collection).delete(id);

          onSuccess();

          message.success(
            `${label.charAt(0).toUpperCase() + label.slice(1)} je obrisan.`,
          );
        } catch (error) {
          console.error(`Greška pri brisanju ${collection}:`, error);

          message.error(`Nije moguće obrisati ${label}.`);
        }
      },
    });
  };

  /* =========================================================
     VACCINATION MENU
  ========================================================= */

  const getVaccinationMenu = (vaccine: Vaccination): MenuProps["items"] => [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "Izmeni",
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Obriši",
      danger: true,
    },
  ];

  const handleVaccinationMenu = (vaccine: Vaccination, key: string) => {
    if (key === "edit") {
      router.push(
        `/dashboard/profile/${petId}/vaccinations/add?edit=${vaccine.id}`,
      );
      return;
    }

    if (key === "delete") {
      deleteRecord("vaccinations", vaccine.id, "vakcinaciju", () => {
        setVaccinations((prev) =>
          prev.filter((item) => item.id !== vaccine.id),
        );
      });
    }
  };
  /* =========================================================
     VISIT MENU
  ========================================================= */

  const getVisitMenu = (visit: Visit): MenuProps["items"] => [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "Izmeni",
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Obriši",
      danger: true,
    },
  ];

  const handleVisitMenu = (visit: Visit, key: string) => {
    if (key === "edit") {
      router.push(`/dashboard/profile/${petId}/visits/add?edit=${visit.id}`);
      return;
    }

    if (key === "delete") {
      deleteRecord("visits", visit.id, "pregled", () => {
        setVisits((current) => current.filter((item) => item.id !== visit.id));
      });
    }
  };

  /* =========================================================
     THERAPY MENU
  ========================================================= */

  const getTherapyMenu = (therapy: Therapy): MenuProps["items"] => [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "Izmeni",
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Obriši",
      danger: true,
    },
  ];

  const handleTherapyMenu = (therapy: Therapy, key: string) => {
    if (key === "edit") {
      router.push(
        `/dashboard/profile/${petId}/therapies/add?edit=${therapy.id}`,
      );
      return;
    }

    if (key === "delete") {
      deleteRecord("therapies", therapy.id, "terapiju", () => {
        setTherapies((current) =>
          current.filter((item) => item.id !== therapy.id),
        );
      });
    }
  };
  /* =========================================================
     ALLERGY MENU
  ========================================================= */

  const getAllergyMenu = (allergy: Allergy): MenuProps["items"] => [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "Izmeni",
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Obriši",
      danger: true,
    },
  ];

  const handleAllergyMenu = (allergy: Allergy, key: string) => {
    if (key === "edit") {
      router.push(
        `/dashboard/profile/${petId}/allergies/add?edit=${allergy.id}`,
      );
      return;
    }

    if (key === "delete") {
      deleteRecord("allergies", allergy.id, "alergiju", () => {
        setAllergies((current) =>
          current.filter((item) => item.id !== allergy.id),
        );
      });
    }
  };

  /* =========================================================
     DOCUMENT MENU
  ========================================================= */

  const getDocumentMenu = (document: Document): MenuProps["items"] => [
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Obriši",
      danger: true,
    },
  ];

  const handleDocumentMenu = (document: Document, key: string) => {
    if (key === "edit") {
      router.push(`/dashboard/profile/${petId}/documents/${document.id}/edit`);
      return;
    }

    if (key === "delete") {
      deleteRecord("documents", document.id, "dokument", () => {
        setDocuments((current) =>
          current.filter((item) => item.id !== document.id),
        );
      });
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className={styles.page}>
        <button
          className={styles.backButton}
          onClick={() => router.push("/dashboard/profile")}
        >
          <ArrowLeftOutlined />
          Nazad na profil
        </button>

        <section className={styles.loadingState}>
          <div className={styles.loadingIcon}>🐾</div>

          <h1>Učitavanje e-kartona...</h1>

          <p>Molimo sačekaj trenutak.</p>
        </section>
      </main>
    );
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (!pet) {
    return (
      <main className={styles.page}>
        <button
          className={styles.backButton}
          onClick={() => router.push("/dashboard/profile")}
        >
          <ArrowLeftOutlined />
          Nazad na profil
        </button>

        <section className={styles.loadingState}>
          <div className={styles.loadingIcon}>🐾</div>

          <h1>Ljubimac nije pronađen</h1>

          <p>Ljubimac ne postoji ili nemaš dozvolu da pristupiš e-kartonu.</p>

          <Button
            type="primary"
            onClick={() => router.push("/dashboard/profile")}
          >
            Nazad na profil
          </Button>
        </section>
      </main>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className={styles.page}>
      <button
        className={styles.backButton}
        onClick={() => router.push("/dashboard/profile")}
      >
        <ArrowLeftOutlined />
        Nazad na profil
      </button>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className={styles.hero}>
        <div className={styles.heroImage}>
          {petImage ? (
            <img src={petImage} alt={pet.name} />
          ) : (
            <div className={styles.noPetImage}>🐾</div>
          )}
        </div>

        <div className={styles.heroInfo}>
          <div className={styles.heroActions}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => router.push(`/dashboard/profile/${petId}/edit`)}
              title="Izmeni ljubimca"
            />

            <Button
              danger
              type="text"
              className={styles.deletePetButton}
              icon={<DeleteOutlined />}
              loading={deleteLoading}
              onClick={handleDeletePet}
              title="Obriši ljubimca"
            />
          </div>

          <div className={styles.heroMain}>
            <div className={styles.petLabel}>
              {typeNames[pet.type]} • {pet.breed || "Rasa nije navedena"}
            </div>

            <div className={styles.heroRow}>
              <h1>{pet.name}</h1>

              <span className={styles.heroDetails}>
                {pet.gender ? genderNames[pet.gender] : "Pol nije naveden"} •{" "}
                {calculateAge(pet.birthday)} •{" "}
                {pet.weight !== undefined ? `${pet.weight} kg` : "-"}
              </span>
            </div>
          </div>

          <div className={styles.heroBottom}>
            <Button
              type="primary"
              size="small"
              className={styles.loveplaceButton}
              icon={pet.showInLoveplace ? <EyeOutlined /> : <HeartFilled />}
              loading={loveplaceLoading}
              onClick={handleToggleLoveplace}
            >
              {pet.showInLoveplace
                ? "Ukloni iz Loveplace"
                : "Prikaži u Loveplace"}
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================
          QUICK INFO
      ===================================================== */}

      <section className={styles.quickGrid}>
        <Card className={styles.quickCard}>
          <div className={styles.quickIcon}>
            <InfoCircleOutlined />
          </div>

          <span>Vrsta & Rasa</span>

          <strong>
            {typeNames[pet.type]} - {pet.breed || "Nije uneto"}
          </strong>
        </Card>

        <Card className={styles.quickCard}>
          <div className={styles.quickIcon}>
            <UserOutlined />
          </div>

          <span>Pol & Boja</span>

          <strong>
            {pet.gender ? genderNames[pet.gender] : "-"} / {pet.color || "-"}
          </strong>
        </Card>

        <Card className={styles.quickCard}>
          <div className={styles.quickIcon}>
            <CalendarOutlined />
          </div>

          <span>Rođendan</span>

          <strong>{formatDate(pet.birthday)}</strong>
        </Card>

        <Card className={styles.quickCard}>
          <div className={styles.quickIcon}>
            <SafetyCertificateOutlined />
          </div>

          <span>Mikročip</span>

          <strong>{pet.microchip || "Nije unet"}</strong>
        </Card>
      </section>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          {/* =================================================
              VACCINATIONS
          ================================================= */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Vakcinacije</h2>

                <p>Pregled svih vakcina i revakcinacija</p>
              </div>

              <Button
                className={styles.addSectionButton}
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(`/dashboard/profile/${petId}/vaccinations/add`)
                }
              >
                Dodaj vakcinu
              </Button>
            </div>

            <div className={styles.vaccineList}>
              {vaccinations.length === 0 ? (
                <div className={styles.emptyCard}>
                  <MedicineBoxOutlined className={styles.emptyIcon} />

                  <p>Nema evidentiranih vakcinacija.</p>
                </div>
              ) : (
                vaccinations.map((vaccine) => (
                  <div className={styles.vaccineCard} key={vaccine.id}>
                    <Dropdown
                      trigger={["click"]}
                      placement="bottomRight"
                      menu={{
                        items: getVaccinationMenu(vaccine),

                        onClick: ({ key, domEvent }) => {
                          domEvent.stopPropagation();

                          handleVaccinationMenu(vaccine, key);
                        },
                      }}
                    >
                      <button
                        type="button"
                        className={styles.cardMoreButton}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Opcije za ${vaccine.name || "vakcinu"}`}
                      >
                        <MoreOutlined />
                      </button>
                    </Dropdown>

                    <div className={styles.cardHeader}>
                      <div className={styles.cardHeaderLeft}>
                        <div className={styles.cardBadgeIcon}>
                          <MedicineBoxOutlined />
                        </div>

                        <div>
                          <h3 className={styles.cardTitle}>
                            {vaccine.name || "Vakcina"}
                          </h3>

                          {vaccine.vet && (
                            <span className={styles.cardSubtitle}>
                              <EnvironmentOutlined />
                              {vaccine.vet}
                            </span>
                          )}
                        </div>
                      </div>

                      <Tag color="green" className={styles.statusTag}>
                        <CheckCircleFilled />
                        Važi
                      </Tag>
                    </div>

                    <div className={styles.cardBodyGrid}>
                      <div className={styles.infoMetaItem}>
                        <span className={styles.metaLabel}>Datum primanja</span>

                        <span className={styles.metaValue}>
                          <CalendarOutlined />
                          {formatDate(vaccine.date)}
                        </span>
                      </div>

                      <div className={styles.infoMetaItem}>
                        <span className={styles.metaLabel}>Revakcinacija</span>

                        <span className={styles.metaValueHighlight}>
                          <ClockCircleOutlined />
                          {formatDate(vaccine.nextDate)}
                        </span>
                      </div>
                    </div>

                    {vaccine.notes && (
                      <div className={styles.cardNotes}>
                        <strong>Napomena:</strong> {vaccine.notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* =================================================
              VISITS
          ================================================= */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Veterinarski pregledi</h2>

                <p>Istorija pregleda i zdravstvenih događaja</p>
              </div>

              <Button
                className={styles.addSectionButton}
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(`/dashboard/profile/${petId}/visits/add`)
                }
              >
                Novi pregled
              </Button>
            </div>

            <div className={styles.timeline}>
              {visits.length === 0 ? (
                <div className={styles.emptyCard}>
                  <EnvironmentOutlined className={styles.emptyIcon} />

                  <p>Nema evidentiranih pregleda.</p>
                </div>
              ) : (
                visits.map((visit, index) => {
                  const reason = getNoteSection(visit.notes, "Razlog dolaska");

                  const recommendation = getNoteSection(
                    visit.notes,
                    "Preporuka veterinara",
                  );

                  return (
                    <div
                      className={styles.visitItem}
                      key={`${visit.id}-${index}`}
                    >
                      <div className={styles.timelineDot} />

                      <div className={styles.visitCard}>
                        <Dropdown
                          trigger={["click"]}
                          placement="bottomRight"
                          menu={{
                            items: getVisitMenu(visit),

                            onClick: ({ key, domEvent }) => {
                              domEvent.stopPropagation();

                              handleVisitMenu(visit, key);
                            },
                          }}
                        >
                          <button
                            type="button"
                            className={styles.cardMoreButton}
                            onClick={(event) => event.stopPropagation()}
                            aria-label="Opcije za pregled"
                          >
                            <MoreOutlined />
                          </button>
                        </Dropdown>

                        <div className={styles.visitCardHeader}>
                          <div>
                            <span className={styles.visitDateBadge}>
                              <CalendarOutlined />
                              {formatDate(visit.date)}
                            </span>

                            <h3 className={styles.visitTitle}>
                              {visit.title
                                ? allergyReactionNames[visit.title] ||
                                  visit.title
                                : "Veterinarski pregled"}
                            </h3>
                          </div>

                          {visit.vet && (
                            <span className={styles.vetBadge}>
                              <EnvironmentOutlined />
                              {visit.vet}
                            </span>
                          )}
                        </div>

                        <div className={styles.visitDetails}>
                          {reason && (
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>
                                Razlog:
                              </span>

                              <span className={styles.detailValue}>
                                {reason}
                              </span>
                            </div>
                          )}

                          {visit.description && (
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Nalaz:</span>

                              <span className={styles.detailValue}>
                                {visit.description}
                              </span>
                            </div>
                          )}

                          {visit.diagnosis && (
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>
                                Dijagnoza:
                              </span>

                              <span className={styles.detailValueHighlight}>
                                {visit.diagnosis}
                              </span>
                            </div>
                          )}

                          {recommendation && (
                            <div className={styles.recommendationBox}>
                              <strong>Preporuka:</strong> {recommendation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* =================================================
              THERAPIES
          ================================================= */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Terapije</h2>

                <p>Aktivne i prethodne terapije</p>
              </div>

              <Button
                className={styles.addSectionButton}
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(`/dashboard/profile/${petId}/therapies/add`)
                }
              >
                Dodaj terapiju
              </Button>
            </div>

            <div className={styles.cardsGridList}>
              {therapies.length === 0 ? (
                <div className={styles.emptyCard}>
                  <MedicineBoxOutlined className={styles.emptyIcon} />

                  <p>Nema evidentiranih terapija.</p>
                </div>
              ) : (
                therapies.map((therapy) => (
                  <div className={styles.therapyCard} key={therapy.id}>
                    <Dropdown
                      trigger={["click"]}
                      placement="bottomRight"
                      menu={{
                        items: getTherapyMenu(therapy),

                        onClick: ({ key, domEvent }) => {
                          domEvent.stopPropagation();

                          handleTherapyMenu(therapy, key);
                        },
                      }}
                    >
                      <button
                        type="button"
                        className={styles.cardMoreButton}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Opcije za ${therapy.name || "terapiju"}`}
                      >
                        <MoreOutlined />
                      </button>
                    </Dropdown>

                    <div className={styles.therapyHeader}>
                      <div className={styles.therapyTitleBox}>
                        <div className={styles.therapyIcon}>
                          <MedicineBoxOutlined />
                        </div>

                        <div>
                          <h3>{therapy.name || "Terapija"}</h3>

                          <span className={styles.therapyDosage}>
                            {therapy.dosage || "Doziranje nije navedeno"} •{" "}
                            {therapy.frequency || "Učestalost nije navedena"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.therapyDates}>
                      <div>
                        <span>Početak:</span>

                        <strong>{formatDate(therapy.startDate)}</strong>
                      </div>

                      <div>
                        <span>Kraj:</span>

                        <strong>{formatDate(therapy.endDate)}</strong>
                      </div>
                    </div>

                    {therapy.notes && (
                      <div className={styles.cardNotes}>
                        <strong>Napomena:</strong> {therapy.notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* =================================================
              ALLERGIES
          ================================================= */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Alergije</h2>

                <p>Evidentirane alergijske reakcije</p>
              </div>

              <Button
                className={styles.addSectionButton}
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(`/dashboard/profile/${petId}/allergies/add`)
                }
              >
                Dodaj alergiju
              </Button>
            </div>

            <div className={styles.cardsGridList}>
              {allergies.length === 0 ? (
                <div className={styles.emptyCard}>
                  <AlertOutlined className={styles.emptyIcon} />

                  <p>Nema evidentiranih alergija.</p>
                </div>
              ) : (
                allergies.map((allergy) => {
                  const isSevere = allergy.severity === "severe";

                  const isModerate = allergy.severity === "moderate";

                  return (
                    <div
                      className={`${styles.allergyCard} ${
                        isSevere
                          ? styles.allergySevere
                          : isModerate
                          ? styles.allergyModerate
                          : styles.allergyMild
                      }`}
                      key={allergy.id}
                    >
                      <Dropdown
                        trigger={["click"]}
                        placement="bottomRight"
                        menu={{
                          items: getAllergyMenu(allergy),

                          onClick: ({ key, domEvent }) => {
                            domEvent.stopPropagation();

                            handleAllergyMenu(allergy, key);
                          },
                        }}
                      >
                        <button
                          type="button"
                          className={styles.cardMoreButton}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Opcije za ${allergy.name || "alergiju"}`}
                        >
                          <MoreOutlined />
                        </button>
                      </Dropdown>

                      <div className={styles.allergyHeader}>
                        <div className={styles.allergyTitleBox}>
                          <div className={styles.allergyIcon}>
                            <ExclamationCircleOutlined />
                          </div>

                          <div>
                            <h3>{allergy.name || "Alergija"}</h3>

                            <span className={styles.allergyReaction}>
                              Reakcija:{" "}
                              {allergy.reaction
                                ? allergyReactionNames[allergy.reaction] ||
                                  allergy.reaction
                                : "Nije navedena"}
                            </span>
                          </div>
                        </div>

                        {allergy.severity && (
                          <Tag
                            color={
                              isSevere ? "red" : isModerate ? "orange" : "blue"
                            }
                            className={styles.severityTag}
                          >
                            {allergySeverityNames[allergy.severity] ||
                              allergy.severity}
                          </Tag>
                        )}
                      </div>

                      {allergy.notes && (
                        <div className={styles.cardNotes}>
                          <strong>Napomena:</strong> {allergy.notes}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* =================================================
              DOCUMENTS
          ================================================= */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Dokumenti</h2>

                <p>Digitalna dokumentacija i knjižica</p>
              </div>

              <Button
                className={styles.addSectionButton}
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(`/dashboard/profile/${petId}/documents/add`)
                }
              >
                Dodaj dokument
              </Button>
            </div>

            <div className={styles.documentsList}>
              {documents.length === 0 ? (
                <div className={styles.emptyCard}>
                  <FileTextOutlined className={styles.emptyIcon} />

                  <p>Nema dodatih dokumenata.</p>
                </div>
              ) : (
                documents.map((document) => (
                  <div className={styles.documentItemCard} key={document.id}>
                    <Dropdown
                      trigger={["click"]}
                      placement="bottomRight"
                      menu={{
                        items: getDocumentMenu(document),

                        onClick: ({ key, domEvent }) => {
                          domEvent.stopPropagation();

                          handleDocumentMenu(document, key);
                        },
                      }}
                    >
                      <button
                        type="button"
                        className={styles.cardMoreButton}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Opcije za ${document.name || "dokument"}`}
                      >
                        <MoreOutlined />
                      </button>
                    </Dropdown>

                    <div className={styles.documentLeft}>
                      <div className={styles.documentIconBox}>
                        <FileTextOutlined />
                      </div>

                      <div className={styles.documentMeta}>
                        <strong>{document.name || "Dokument"}</strong>

                        <span>
                          {document.type && documentTypeNames[document.type]
                            ? documentTypeNames[document.type]
                            : "Dokument"}{" "}
                          • {formatDate(document.created)}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="text"
                      icon={<RightOutlined />}
                      className={styles.docArrowBtn}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </div>
                ))
              )}
            </div>

            {documents.length > 0 && (
              <Button
                block
                className={styles.showAllDocsBtn}
                onClick={() =>
                  router.push(`/dashboard/profile/${petId}/documents`)
                }
              >
                Prikaži sve dokumente
              </Button>
            )}
          </section>

          {/* =================================================
              OWNER
          ================================================= */}

          <section className={styles.ownerCard}>
            <Avatar size={48} icon={<UserOutlined />} />

            <div>
              <span>Vlasnik</span>

              <strong>
                {pb.authStore.record?.name ||
                  pb.authStore.record?.email ||
                  "Korisnik"}
              </strong>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
