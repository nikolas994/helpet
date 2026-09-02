"use client";

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  HeartFilled,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { Avatar, Card, Empty, Spin, Tag, message } from "antd";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";

import styles from "./ProviderPetProfile.module.css";

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
  type?: string;
  file?: string;
  notes?: string;
  created?: string;
};

type Owner = {
  id: string;
  name?: string;
  username?: string;
  email?: string;
};

const typeNames: Record<string, string> = {
  dog: "Pas",
  cat: "Mačka",
  bird: "Ptica",
  rabbit: "Zec",
  other: "Drugo",
};

const genderNames: Record<string, string> = {
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

const documentTypeNames: Record<string, string> = {
  medical_record: "Medicinski karton",
  passport: "Pasoš",
  lab_result: "Laboratorijski rezultat",
  invoice: "Račun",
  other: "Ostalo",
};

function formatDate(date?: string) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("sr-RS");
}

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

export default function ProviderPetProfilePage() {
  const router = useRouter();
  const params = useParams();

  const petId = params.petId as string;

  const [loading, setLoading] = useState(true);

  const [pet, setPet] = useState<Pet | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);

  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const fetchPetData = async () => {
      try {
        setLoading(true);

        if (!pb.authStore.isValid) {
          router.push("/login");
          return;
        }

        const providerId = pb.authStore.record?.id;

        if (!providerId || !petId) {
          return;
        }

        /*
         * =====================================================
         * 1. PRONAĐI PROVIDER LOCATION
         * =====================================================
         */

        const locationResult = await pb.collection("locations").getList(1, 1, {
          filter: `owner = "${providerId}"`,
          requestKey: null,
        });

        if (locationResult.items.length === 0) {
          messageApi.error("Business objekat nije pronađen.");
          return;
        }

        const locationId = locationResult.items[0].id;

        /*
         * =====================================================
         * 2. PROVERI DA LI JE LJUBIMAC KLIJENT OVOG PROVIDERA
         * =====================================================
         */

        const appointmentResult = await pb
          .collection("appointments")
          .getList(1, 1, {
            filter: `location = "${locationId}" && pet = "${petId}"`,
            expand: "user,pet",
            requestKey: null,
          });

        if (appointmentResult.items.length === 0) {
          messageApi.error("Nemate dozvolu za pregled ovog ljubimca.");

          router.push("/dashboard/provider/clients");

          return;
        }

        /*
         * =====================================================
         * 3. PET
         * =====================================================
         */

        const petRecord = await pb.collection("pets").getOne<Pet>(petId, {
          requestKey: null,
        });

        setPet(petRecord);

        /*
         * =====================================================
         * 4. OWNER
         * =====================================================
         */

        const ownerId = petRecord.owner;

        if (ownerId) {
          try {
            const ownerRecord = await pb
              .collection("users")
              .getOne<Owner>(ownerId, {
                requestKey: null,
              });

            setOwner(ownerRecord);
          } catch (error) {
            console.error("Greška pri učitavanju vlasnika:", error);
          }
        }

        /*
         * =====================================================
         * 5. VACCINATIONS
         * =====================================================
         */

        try {
          const records = await pb
            .collection("vaccinations")
            .getFullList<Vaccination>({
              filter: `pet = "${petId}"`,
              sort: "-date",
              requestKey: null,
            });

          setVaccinations(records);
        } catch (error) {
          console.error("Greška vakcinacije:", error);
        }

        /*
         * =====================================================
         * 6. VISITS
         * =====================================================
         */

        try {
          const records = await pb.collection("visits").getFullList<Visit>({
            filter: `pet = "${petId}"`,
            sort: "-date",
            requestKey: null,
          });

          setVisits(records);
        } catch (error) {
          console.error("Greška pregledi:", error);
        }

        /*
         * =====================================================
         * 7. THERAPIES
         * =====================================================
         */

        try {
          const records = await pb
            .collection("therapies")
            .getFullList<Therapy>({
              filter: `pet = "${petId}"`,
              sort: "-startDate",
              requestKey: null,
            });

          setTherapies(records);
        } catch (error) {
          console.error("Greška terapije:", error);
        }

        /*
         * =====================================================
         * 8. ALLERGIES
         * =====================================================
         */

        try {
          const records = await pb
            .collection("allergies")
            .getFullList<Allergy>({
              filter: `pet = "${petId}"`,
              sort: "-created",
              requestKey: null,
            });

          setAllergies(records);
        } catch (error) {
          console.error("Greška alergije:", error);
        }

        /*
         * =====================================================
         * 9. DOCUMENTS
         * =====================================================
         */

        try {
          const records = await pb
            .collection("documents")
            .getFullList<Document>({
              filter: `pet = "${petId}"`,
              sort: "-created",
              requestKey: null,
            });

          setDocuments(records);
        } catch (error) {
          console.error("Greška dokumenti:", error);
        }
      } catch (error: any) {
        if (
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError"
        ) {
          return;
        }

        console.error("Greška pri učitavanju e-kartona:", error);

        messageApi.error("Nije moguće učitati podatke o ljubimcu.");
      } finally {
        setLoading(false);
      }
    };

    fetchPetData();
  }, [petId, router]);

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <main className={styles.page}>
        {contextHolder}

        <div className={styles.loading}>
          <Spin size="large" />

          <h2>Učitavanje e-kartona...</h2>

          <p>Preuzimamo zdravstvene podatke ljubimca.</p>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * NOT FOUND
   * =========================================================
   */

  if (!pet) {
    return (
      <main className={styles.page}>
        {contextHolder}

        <button
          className={styles.backButton}
          onClick={() => router.push("/dashboard/provider/clients")}
        >
          <ArrowLeftOutlined />
          Nazad na klijente
        </button>

        <Card>
          <Empty description="Ljubimac nije pronađen." />
        </Card>
      </main>
    );
  }

  /*
   * =========================================================
   * IMAGE
   * =========================================================
   */

  const petImage = pet.image ? pb.files.getURL(pet as any, pet.image) : null;

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <main className={styles.page}>
      {contextHolder}

      {/* BACK */}

      <button
        className={styles.backButton}
        onClick={() => router.push("/dashboard/provider/clients")}
      >
        <ArrowLeftOutlined />
        Nazad na klijente
      </button>

      {/* HERO */}

      <section className={styles.hero}>
        <div className={styles.heroImage}>
          {petImage ? (
            <img src={petImage} alt={pet.name} />
          ) : (
            <div className={styles.noImage}>🐾</div>
          )}
        </div>

        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>E-KARTON LJUBIMCA</span>

          <h1>{pet.name}</h1>

          <p className={styles.subtitle}>
            {typeNames[pet.type] || "Ljubimac"}
            {pet.breed ? ` • ${pet.breed}` : ""}
            {" • "}
            {pet.gender ? genderNames[pet.gender] : "Pol nije naveden"}
          </p>

          <div className={styles.tags}>
            {pet.neutered && <Tag color="green">Sterilizovan / kastriran</Tag>}

            {pet.microchip && <Tag color="blue">Mikročip evidentiran</Tag>}
          </div>
        </div>
      </section>

      {/* QUICK INFO */}

      <section className={styles.quickGrid}>
        <Card>
          <CalendarOutlined />

          <span>Datum rođenja</span>

          <strong>{formatDate(pet.birthday)}</strong>
        </Card>

        <Card>
          <HeartFilled />

          <span>Starost</span>

          <strong>{calculateAge(pet.birthday)}</strong>
        </Card>

        <Card>
          <MedicineBoxOutlined />

          <span>Težina</span>

          <strong>{pet.weight !== undefined ? `${pet.weight} kg` : "-"}</strong>
        </Card>

        <Card>
          <SafetyCertificateOutlined />

          <span>Mikročip</span>

          <strong>{pet.microchip || "Nije unet"}</strong>
        </Card>
      </section>

      {/* OWNER */}

      <section className={styles.ownerCard}>
        <Avatar size={52} icon={<UserOutlined />} />

        <div>
          <span>VLASNIK</span>

          <strong>
            {owner?.name ||
              owner?.username ||
              owner?.email ||
              "Nepoznat vlasnik"}
          </strong>

          {owner?.email && <small>{owner.email}</small>}
        </div>
      </section>

      <div className={styles.contentGrid}>
        {/* ===================================================
            LEFT
        =================================================== */}

        <div className={styles.mainColumn}>
          {/* VACCINATIONS */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Vakcinacije</h2>

                <p>Sve evidentirane vakcine i revakcinacije.</p>
              </div>

              <Tag color="green">{vaccinations.length}</Tag>
            </div>

            {vaccinations.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nema evidentiranih vakcinacija."
              />
            ) : (
              <div className={styles.vaccineList}>
                {vaccinations.map((vaccine) => (
                  <div className={styles.vaccine} key={vaccine.id}>
                    <div className={styles.itemIcon}>
                      <MedicineBoxOutlined />
                    </div>

                    <div className={styles.itemContent}>
                      <strong>{vaccine.name || "Vakcina"}</strong>

                      <span>Primljeno: {formatDate(vaccine.date)}</span>

                      <span>
                        Sledeća revakcinacija: {formatDate(vaccine.nextDate)}
                      </span>

                      {vaccine.vet && <span>Veterinar: {vaccine.vet}</span>}

                      {vaccine.notes && <p>{vaccine.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* VISITS */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Veterinarski pregledi</h2>

                <p>Kompletna istorija pregleda.</p>
              </div>

              <Tag color="blue">{visits.length}</Tag>
            </div>

            {visits.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nema evidentiranih pregleda."
              />
            ) : (
              <div className={styles.timeline}>
                {visits.map((visit) => (
                  <div className={styles.visit} key={visit.id}>
                    <div className={styles.timelineDot} />

                    <div className={styles.visitDate}>
                      {formatDate(visit.date)}
                    </div>

                    <div className={styles.visitBody}>
                      <h3>{visit.title || "Veterinarski pregled"}</h3>

                      {visit.vet && (
                        <span className={styles.vet}>
                          <EnvironmentOutlined />
                          {visit.vet}
                        </span>
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

                      {visit.notes && (
                        <p>
                          <strong>Napomena:</strong> {visit.notes}
                        </p>
                      )}

                      {visit.weight !== undefined && (
                        <Tag>Težina: {visit.weight} kg</Tag>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* THERAPIES */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Terapije</h2>

                <p>Aktivne i prethodne terapije.</p>
              </div>

              <Tag color="purple">{therapies.length}</Tag>
            </div>

            {therapies.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nema evidentiranih terapija."
              />
            ) : (
              <div className={styles.therapyList}>
                {therapies.map((therapy) => (
                  <div className={styles.therapy} key={therapy.id}>
                    <MedicineBoxOutlined />

                    <div>
                      <strong>{therapy.name || "Terapija"}</strong>

                      <span>Doziranje: {therapy.dosage || "-"}</span>

                      <span>Učestalost: {therapy.frequency || "-"}</span>

                      <span>Početak: {formatDate(therapy.startDate)}</span>

                      {therapy.endDate && (
                        <span>Kraj: {formatDate(therapy.endDate)}</span>
                      )}

                      {therapy.active && (
                        <Tag color="green">Aktivna terapija</Tag>
                      )}

                      {therapy.notes && <p>{therapy.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ===================================================
            RIGHT
        =================================================== */}

        <aside className={styles.sideColumn}>
          {/* BASIC INFO */}

          <section className={styles.sideCard}>
            <h2>Osnovni podaci</h2>

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

              <div>
                <span>Sterilizacija</span>
                <strong>{pet.neutered ? "Da" : "Ne"}</strong>
              </div>

              <div>
                <span>Mikročip</span>
                <strong>{pet.microchip || "Nije unet"}</strong>
              </div>
            </div>
          </section>

          {/* ALLERGIES */}

          <section className={styles.sideCard}>
            <div className={styles.sideHeader}>
              <h2>Alergije</h2>

              <Tag color="red">{allergies.length}</Tag>
            </div>

            {allergies.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nema evidentiranih alergija."
              />
            ) : (
              <div className={styles.allergyList}>
                {allergies.map((allergy) => (
                  <div className={styles.allergy} key={allergy.id}>
                    <HeartFilled />

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

                      {allergy.notes && <p>{allergy.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* DOCUMENTS */}
        </aside>
      </div>
    </main>
  );
}
