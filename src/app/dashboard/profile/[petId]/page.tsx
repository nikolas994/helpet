"use client";

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FileTextOutlined,
  HeartFilled,
  MedicineBoxOutlined,
  PlusOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { App, Avatar, Button, Card, Modal, Tag } from "antd";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";

import styles from "./PetProfile.module.css";

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

  // Loveplace
  showInLoveplace?: boolean;
};

type Vaccination = {
  id: string;
  name?: string;
  type?: string;
  date?: string;
  nextDate?: string;
  vet?: string;
  notes?: string;
};

type Visit = {
  id: string;
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
  name?: string;
  reaction?: string;
  severity?: string;
  notes?: string;
};

type Document = {
  id: string;
  name?: string;
  type?: "medical_record" | "passport" | "lab_result" | "invoice" | "other";
  file?: string;
  notes?: string;
  created?: string;
};

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

function calculateAge(birthday?: string) {
  if (!birthday) {
    return "-";
  }

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

  // Ako je ljubimac mlađi od godinu dana
  if (years === 0) {
    if (months === 0) {
      return "Manje od 1 meseca";
    }

    if (months === 1) {
      return "1 mesec";
    }

    if (months >= 2 && months <= 4) {
      return `${months} meseca`;
    }

    return `${months} meseci`;
  }

  // Ako ima punu godinu + mesece
  if (years === 1) {
    return "1 godina";
  }

  if (years >= 2 && years <= 4) {
    return `${years} godine`;
  }

  return `${years} godina`;
}

function formatDate(date?: string) {
  if (!date) {
    return "-";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("sr-RS");
}

function getNoteSection(notes: string | undefined, label: string) {
  if (!notes) {
    return "";
  }

  const lines = notes.split("\n\n");

  const line = lines.find((item) => item.startsWith(`${label}:`));

  if (!line) {
    return "";
  }

  return line.replace(`${label}:`, "").trim();
}

export default function PetProfilePage() {
  const { message } = App.useApp();
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

        /*
         * PET
         */

        const petRecord = await pb.collection("pets").getOne<Pet>(petId);

        if (petRecord.owner !== currentUserId) {
          console.error("Ljubimac ne pripada trenutnom korisniku.");

          setPet(null);
          return;
        }

        setPet(petRecord);

        /*
         * VACCINATIONS
         */

        try {
          const vaccinationRecords = await pb
            .collection("vaccinations")
            .getFullList<Vaccination>({
              sort: "-date",
              filter: `pet = "${petId}"`,
            });

          setVaccinations(vaccinationRecords);
        } catch (error) {
          console.error("Greška pri učitavanju vakcinacija:", error);

          setVaccinations([]);
        }

        /*
         * VISITS
         */

        try {
          const visitRecords = await pb
            .collection("visits")
            .getFullList<Visit>({
              sort: "-date",
              filter: `pet = "${petId}"`,
            });

          setVisits(visitRecords);
        } catch (error) {
          console.error("Greška pri učitavanju pregleda:", error);

          setVisits([]);
        }

        /*
         * THERAPIES
         */

        try {
          const therapyRecords = await pb
            .collection("therapies")
            .getFullList<Therapy>({
              sort: "-startDate",
              filter: `pet = "${petId}"`,
            });

          setTherapies(therapyRecords);
        } catch (error) {
          console.error("Greška pri učitavanju terapija:", error);

          setTherapies([]);
        }

        /*
         * ALLERGIES
         */

        try {
          const allergyRecords = await pb
            .collection("allergies")
            .getFullList<Allergy>({
              sort: "-created",
              filter: `pet = "${petId}"`,
            });

          setAllergies(allergyRecords);
        } catch (error) {
          console.error("Greška pri učitavanju alergija:", error);

          setAllergies([]);
        }

        /*
         * DOCUMENTS
         */

        try {
          const documentRecords = await pb
            .collection("documents")
            .getFullList<Document>({
              sort: "-created",
              filter: `pet = "${petId}"`,
            });

          setDocuments(documentRecords);
        } catch (error) {
          console.error("Greška pri učitavanju dokumenata:", error);

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

  /*
   * PET IMAGE
   */

  const petImage =
    pet?.image && pet ? pb.files.getURL(pet as any, pet.image) : null;

  /*
   * LOVEPLACE
   */

  const handleToggleLoveplace = async () => {
    if (!pet) {
      return;
    }

    try {
      setLoveplaceLoading(true);

      const newValue = !pet.showInLoveplace;

      const updatedPet = await pb.collection("pets").update<Pet>(pet.id, {
        showInLoveplace: newValue,
      });

      setPet(updatedPet);

      if (newValue) {
        message.success(`${pet.name} je sada prikazan u Loveplace-u.`);
      } else {
        message.success(`${pet.name} je uklonjen iz Loveplace-a.`);
      }
    } catch (error) {
      console.error("Greška pri promeni Loveplace statusa:", error);

      message.error(
        pet.showInLoveplace
          ? "Nije moguće ukloniti ljubimca iz Loveplace-a."
          : "Nije moguće prikazati ljubimca u Loveplace-u.",
      );
    } finally {
      setLoveplaceLoading(false);
    }
  };
  /*
   * DELETE PET
   */

  const handleDeletePet = () => {
    if (!pet) {
      return;
    }

    Modal.confirm({
      title: "Obriši ljubimca?",
      content: (
        <div>
          <p>
            Da li si siguran da želiš da obrišeš <strong>{pet.name}</strong>?
          </p>

          <p style={{ color: "#8b8f96" }}>
            Ova radnja je trajna i ljubimac više neće biti dostupan na tvom
            profilu.
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
        } catch (error) {
          console.error("Greška pri brisanju ljubimca:", error);

          message.error("Nije moguće obrisati ljubimca.");
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  /*
   * LOADING
   */

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

  /*
   * PET NOT FOUND
   */

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

          <p>
            Ljubimac ne postoji ili nemaš dozvolu da pristupiš njegovom
            e-kartonu.
          </p>

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

  return (
    <main className={styles.page}>
      {/* BACK */}

      <button
        className={styles.backButton}
        onClick={() => router.push("/dashboard/profile")}
      >
        <ArrowLeftOutlined />
        Nazad na profil
      </button>

      {/* HERO */}

      <section className={styles.hero}>
        <div className={styles.heroImage}>
          {petImage ? (
            <img src={petImage} alt={pet.name} />
          ) : (
            <div className={styles.noPetImage}>🐾</div>
          )}
        </div>

        <div className={styles.heroInfo}>
          <div className={styles.heroTitle}>
            <div className={styles.heroText}>
              <div className={styles.petLabel}>
                {typeNames[pet.type]} • {pet.breed || "Rasa nije navedena"}
              </div>

              <h1>{pet.name}</h1>

              <p>
                {pet.gender ? genderNames[pet.gender] : "Pol nije naveden"} •{" "}
                {calculateAge(pet.birthday)} •{" "}
                {pet.weight !== undefined ? `${pet.weight} kg` : "-"}
              </p>
            </div>

            <div className={styles.heroActions}>
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(`/dashboard/profile/${petId}/edit`)}
              >
                Izmeni
              </Button>

              <Button
                danger
                type="text"
                className={styles.deletePetButton}
                icon={<DeleteOutlined />}
                loading={deleteLoading}
                onClick={handleDeletePet}
              >
                Obriši
              </Button>
            </div>
          </div>

          <div className={styles.heroBottom}>
            <Button
              type="primary"
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

      {/* QUICK INFO */}

      <section className={styles.quickGrid}>
        <Card>
          <div className={styles.quickIcon}>
            <CalendarOutlined />
          </div>

          <span>Datum rođenja</span>

          <strong>{formatDate(pet.birthday)}</strong>
        </Card>

        <Card>
          <div className={styles.quickIcon}>
            <RightOutlined />
          </div>

          <span>Težina</span>

          <strong>{pet.weight !== undefined ? `${pet.weight} kg` : "-"}</strong>
        </Card>

        <Card>
          <div className={styles.quickIcon}>
            <SafetyCertificateOutlined />
          </div>

          <span>Mikročip</span>

          <strong>{pet.microchip || "Nije unet"}</strong>
        </Card>

        <Card>
          <div className={styles.quickIcon}>
            <HeartFilled />
          </div>

          <span>Sterilizacija</span>

          <strong>{pet.neutered ? "Da" : "Ne"}</strong>
        </Card>
      </section>

      {/* CONTENT */}

      <div className={styles.contentGrid}>
        {/* LEFT */}

        <div className={styles.mainColumn}>
          {/* VACCINATIONS */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Vakcinacije</h2>

                <p>Pregled svih vakcina i revakcinacija</p>
              </div>

              <Button
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
                <p>Nema evidentiranih vakcinacija.</p>
              ) : (
                vaccinations.map((vaccine) => (
                  <div className={styles.vaccine} key={vaccine.id}>
                    <div className={styles.vaccineIcon}>
                      <MedicineBoxOutlined />
                    </div>

                    <div className={styles.vaccineInfo}>
                      <strong>{vaccine.name || "Vakcina"}</strong>

                      <span>Primljeno: {formatDate(vaccine.date)}</span>

                      <span>Sledeća: {formatDate(vaccine.nextDate)}</span>
                    </div>

                    <Tag color="green">Važi</Tag>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* VISITS */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Veterinarski pregledi</h2>

                <p>Istorija pregleda i zdravstvenih događaja</p>
              </div>

              <Button
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
                <p>Nema evidentiranih pregleda.</p>
              ) : (
                visits.map((visit, index) => {
                  const reason = getNoteSection(visit.notes, "Razlog dolaska");

                  const recommendation = getNoteSection(
                    visit.notes,
                    "Preporuka veterinara",
                  );

                  return (
                    <div className={styles.visit} key={`${visit.id}-${index}`}>
                      <div className={styles.timelineDot} />

                      <div className={styles.visitDate}>
                        {formatDate(visit.date)}
                      </div>

                      <div className={styles.visitBody}>
                        <h3>
                          {visit.title
                            ? allergyReactionNames[visit.title] || visit.title
                            : "Veterinarski pregled"}
                        </h3>

                        <span className={styles.vet}>
                          <EnvironmentOutlined />

                          {visit.vet || "Veterinar nije naveden"}
                        </span>

                        {reason && (
                          <p>
                            <strong>Razlog:</strong> {reason}
                          </p>
                        )}

                        {visit.description && (
                          <p>
                            <strong>Nalaz:</strong> {visit.description}
                          </p>
                        )}

                        {visit.diagnosis && (
                          <p>
                            <strong>Dijagnoza:</strong> {visit.diagnosis}
                          </p>
                        )}

                        {recommendation && (
                          <p>
                            <strong>Preporuka:</strong> {recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* THERAPIES */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Terapije</h2>

                <p>Aktivne i prethodne terapije</p>
              </div>

              <Button
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(`/dashboard/profile/${petId}/therapies/add`)
                }
              >
                Dodaj terapiju
              </Button>
            </div>

            {therapies.length === 0 ? (
              <p>Nema evidentiranih terapija.</p>
            ) : (
              therapies.map((therapy) => (
                <div className={styles.medication} key={therapy.id}>
                  <div className={styles.medicationIcon}>
                    <MedicineBoxOutlined />
                  </div>

                  <div>
                    <strong>{therapy.name || "Terapija"}</strong>

                    <span>{therapy.dosage || "Doziranje nije navedeno"}</span>

                    <span>
                      {therapy.frequency || "Učestalost nije navedena"}
                    </span>

                    <span>Početak: {formatDate(therapy.startDate)}</span>

                    {therapy.endDate && (
                      <span>Kraj: {formatDate(therapy.endDate)}</span>
                    )}

                    {therapy.notes && <span>Napomena: {therapy.notes}</span>}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* RIGHT */}

        <aside className={styles.sideColumn}>
          {/* BASIC INFO */}

          <section className={styles.sideCard}>
            <div className={styles.sideHeader}>
              <h2>Osnovni podaci</h2>

              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => router.push(`/dashboard/profile/${petId}/edit`)}
              />
            </div>

            <div className={styles.infoList}>
              <div>
                <span>Vrsta</span>

                <strong>{typeNames[pet.type]}</strong>
              </div>

              <div>
                <span>Rasa</span>

                <strong>{pet.breed || "Nije navedena"}</strong>
              </div>

              <div>
                <span>Pol</span>

                <strong>
                  {pet.gender ? genderNames[pet.gender] : "Nije naveden"}
                </strong>
              </div>

              <div>
                <span>Boja</span>

                <strong>{pet.color || "Nije navedena"}</strong>
              </div>

              <div>
                <span>Datum rođenja</span>

                <strong>{formatDate(pet.birthday)}</strong>
              </div>
            </div>
          </section>

          {/* ALLERGIES */}

          <section className={styles.sideCard}>
            <div className={styles.sideHeader}>
              <h2>Alergije</h2>

              <Button
                type="text"
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(`/dashboard/profile/${petId}/allergies/add`)
                }
              />
            </div>

            {allergies.length === 0 ? (
              <p>Nema evidentiranih alergija.</p>
            ) : (
              allergies.map((allergy) => (
                <div className={styles.allergy} key={allergy.id}>
                  <div className={styles.allergyIcon}>
                    <HeartFilled />
                  </div>

                  <div>
                    <strong>{allergy.name || "Alergija"}</strong>

                    <span>
                      Reakcija:{" "}
                      {allergy.reaction
                        ? allergyReactionNames[allergy.reaction] ||
                          allergy.reaction
                        : "Nije navedena"}
                    </span>

                    {allergy.severity && (
                      <Tag color="orange">
                        {allergySeverityNames[allergy.severity] ||
                          allergy.severity}
                      </Tag>
                    )}

                    {allergy.notes && <span>Napomena: {allergy.notes}</span>}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* DOCUMENTS */}

          <section className={styles.sideCard}>
            <div className={styles.sideHeader}>
              <h2>Dokumenti</h2>

              <Button
                type="text"
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(`/dashboard/profile/${petId}/documents/add`)
                }
              />
            </div>

            {documents.length === 0 ? (
              <p>Nema dodatih dokumenata.</p>
            ) : (
              documents.slice(0, 3).map((document) => (
                <div className={styles.document} key={document.id}>
                  <div className={styles.documentIcon}>
                    <FileTextOutlined />
                  </div>

                  <div>
                    <strong>{document.name || "Dokument"}</strong>

                    <span>{formatDate(document.created)}</span>
                  </div>
                </div>
              ))
            )}

            {documents.length > 0 && (
              <Button
                block
                onClick={() =>
                  router.push(`/dashboard/profile/${petId}/documents`)
                }
              >
                Prikaži sve dokumente
              </Button>
            )}
          </section>

          {/* OWNER */}

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
        </aside>
      </div>
    </main>
  );
}
