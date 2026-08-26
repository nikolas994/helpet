"use client";

import {
  EnvironmentOutlined,
  HeartFilled,
  SearchOutlined,
} from "@ant-design/icons";

import { Button, Card, Empty, Input, Select, Spin, Tag } from "antd";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";

import styles from "./LovePlace.module.css";

type Owner = {
  id: string;
  location?: string;
};

type Pet = {
  id: string;
  name: string;
  type: "dog" | "cat" | "bird" | "rabbit" | "other";
  breed?: string;
  gender?: "male" | "female";
  birthday?: string;
  weight?: number;
  color?: string;
  image?: string;
  owner?: string;
  showInLoveplace?: boolean;

  expand?: {
    owner?: Owner;
  };
};

const typeNames = {
  dog: "Pas",
  cat: "Mačka",
  bird: "Ptica",
  rabbit: "Zec",
  other: "Drugo",
};

const genderNames = {
  male: "Mužjak",
  female: "Ženka",
};

function calculateAge(birthday?: string) {
  if (!birthday) {
    return null;
  }

  const birthDate = new Date(birthday);

  if (Number.isNaN(birthDate.getTime())) {
    return null;
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

  if (years < 0) {
    return null;
  }

  return {
    years,
    months,
  };
}

function formatAge(birthday?: string) {
  const age = calculateAge(birthday);

  if (!age) {
    return "Starost nije navedena";
  }

  if (age.years === 0) {
    if (age.months === 0) {
      return "Manje od mesec dana";
    }

    if (age.months === 1) {
      return "1 mesec";
    }

    if (age.months >= 2 && age.months <= 4) {
      return `${age.months} meseca`;
    }

    return `${age.months} meseci`;
  }

  if (age.years === 1) {
    return "1 godina";
  }

  if (age.years >= 2 && age.years <= 4) {
    return `${age.years} godine`;
  }

  return `${age.years} godina`;
}

export default function LovePlacePage() {
  const router = useRouter();

  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    const loadPets = async () => {
      try {
        setLoading(true);

        const result = await pb.collection("pets").getFullList<Pet>({
          sort: "-created",
          filter: "showInLoveplace = true",

          // Uzimamo vlasnika zajedno sa ljubimcem
          expand: "owner",
        });

        if (!cancelled) {
          setPets(result);
        }
      } catch (error: any) {
        if (
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError" ||
          error?.status === 0 ||
          error?.message?.toLowerCase().includes("autocancel")
        ) {
          return;
        }

        console.error("Greška pri učitavanju LovePlace ljubimaca:", error);

        if (!cancelled) {
          setPets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPets();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPets = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return pets.filter((pet) => {
      const matchesType = typeFilter === "all" || pet.type === typeFilter;

      const matchesSearch =
        !searchValue ||
        pet.name?.toLowerCase().includes(searchValue) ||
        pet.breed?.toLowerCase().includes(searchValue);

      return matchesType && matchesSearch;
    });
  }, [pets, search, typeFilter]);

  return (
    <main className={styles.page}>
      {/* HERO */}

      <section className={styles.hero}>
        <div className={styles.heroGlow} />

        <div className={styles.heroIcon}>
          <HeartFilled />
        </div>

        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>HELPet • LOVEPLACE</span>

          <h1>
            Pronađi novo
            <br />
            <span>prijateljstvo.</span>
          </h1>

          <p>
            Upoznaj ljubimce koji su dostupni za druženje, upoznavanje i
            potencijalno uparivanje.
          </p>
        </div>

        <div className={styles.heroStats}>
          <div>
            <strong>{pets.length}</strong>
            <span>Ljubimaca</span>
          </div>

          <div>
            <strong>{filteredPets.length}</strong>
            <span>Prikazano</span>
          </div>

          <div>
            <strong>♥</strong>
            <span>Nova poznanstva</span>
          </div>
        </div>
      </section>

      {/* FILTERS */}

      <section className={styles.filterCard}>
        <div className={styles.filterTitle}>
          <div className={styles.filterIcon}>
            <SearchOutlined />
          </div>

          <div>
            <h2>Pronađi ljubimca</h2>

            <p>Pretraži profile koji ti odgovaraju.</p>
          </div>
        </div>

        <div className={styles.filters}>
          <Input
            size="large"
            prefix={<SearchOutlined />}
            placeholder="Ime ili rasa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            allowClear
          />

          <Select
            size="large"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              {
                value: "all",
                label: "🐾 Svi ljubimci",
              },
              {
                value: "dog",
                label: "🐶 Psi",
              },
              {
                value: "cat",
                label: "🐱 Mačke",
              },
              {
                value: "bird",
                label: "🐦 Ptice",
              },
              {
                value: "rabbit",
                label: "🐰 Zečevi",
              },
              {
                value: "other",
                label: "🐾 Ostali",
              },
            ]}
          />
        </div>
      </section>

      {/* SECTION HEADER */}

      <div className={styles.sectionHeader}>
        <div>
          <span>LOVEPLACE</span>

          <h2>Ljubimci koji žele da upoznaju nove prijatelje</h2>
        </div>

        <p>
          Prikazano <strong>{filteredPets.length}</strong> ljubimaca
        </p>
      </div>

      {/* LOADING */}

      {loading ? (
        <div className={styles.emptyCard}>
          <Spin size="large" />

          <p>Učitavanje ljubimaca...</p>
        </div>
      ) : filteredPets.length === 0 ? (
        <Card className={styles.emptyCard}>
          <Empty
            description={
              pets.length === 0
                ? "Trenutno nema ljubimaca dostupnih u LovePlace-u."
                : "Nema ljubimaca koji odgovaraju tvojoj pretrazi."
            }
          />
        </Card>
      ) : (
        <section className={styles.grid}>
          {filteredPets.map((pet) => {
            const imageUrl = pet.image
              ? pb.files.getURL(pet as any, pet.image)
              : "";

            // Lokacija dolazi od VLASNIKA
            const ownerLocation = pet.expand?.owner?.location?.trim();

            return (
              <Card
                key={pet.id}
                className={styles.petCard}
                hoverable
                onClick={() => router.push(`/dashboard/loveplace/${pet.name}`)}
                cover={
                  <div className={styles.imageWrapper}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={pet.name}
                        className={styles.petImage}
                      />
                    ) : (
                      <div
                        className={styles.petImage}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 64,
                          background: "#f5f5f5",
                        }}
                      >
                        🐾
                      </div>
                    )}

                    <div className={styles.imageOverlay} />

                    <button
                      className={styles.favoriteButton}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      aria-label={`Dodaj ${pet.name} u omiljene`}
                    >
                      <HeartFilled />
                    </button>

                    <div className={styles.locationBadge}>
                      <EnvironmentOutlined />

                      {ownerLocation || "Lokacija nije navedena"}
                    </div>
                  </div>
                }
              >
                <div className={styles.petInfo}>
                  <div className={styles.nameRow}>
                    <div>
                      <h2>{pet.name}</h2>

                      <p>{pet.breed || "Rasa nije navedena"}</p>
                    </div>

                    <Tag>{typeNames[pet.type]}</Tag>
                  </div>

                  <div className={styles.details}>
                    <span>
                      <strong>
                        {pet.gender === "male"
                          ? "♂"
                          : pet.gender === "female"
                          ? "♀"
                          : "•"}
                      </strong>

                      {pet.gender
                        ? genderNames[pet.gender]
                        : "Pol nije naveden"}
                    </span>

                    <span>{formatAge(pet.birthday)}</span>

                    <span>
                      {pet.weight ? `${pet.weight} kg` : "Težina nije navedena"}
                    </span>
                  </div>

                  <div className={styles.color}>
                    <span>Boja</span>

                    <strong>{pet.color || "Nije navedena"}</strong>
                  </div>

                  <Button
                    type="primary"
                    block
                    className={styles.profileButton}
                    onClick={(event) => {
                      event.stopPropagation();

                      router.push(`/dashboard/loveplace/${pet.name}`);
                    }}
                  >
                    Pogledaj profil
                    <span>→</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </main>
  );
}
