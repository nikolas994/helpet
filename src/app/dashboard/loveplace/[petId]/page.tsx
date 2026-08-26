"use client";

import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  HeartFilled,
  HeartOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { Avatar, Button, Card, Spin } from "antd";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import pb from "@/app/lib/pocketbase";

import styles from "./LovePlacePet.module.css";

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
};

type Owner = {
  id: string;
  name?: string;
  email?: string;
  contact?: string;
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

function getAgeText(age: { years: number; months: number } | null) {
  if (age === null) {
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

export default function LovePlacePetPage() {
  const router = useRouter();
  const params = useParams();

  const petId = Array.isArray(params.petId) ? params.petId[0] : params.petId;

  const [pet, setPet] = useState<Pet | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPet = async () => {
      if (!petId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const records = await pb.collection("pets").getList<Pet>(1, 1, {
          filter: `name = "${petId.replace(
            /"/g,
            '\\"',
          )}" && showInLoveplace = true`,
        });

        if (cancelled) {
          return;
        }

        if (records.items.length === 0) {
          setPet(null);
          setOwner(null);
          return;
        }

        const record = records.items[0];

        setPet(record);

        if (record.owner) {
          try {
            const ownerRecord = await pb
              .collection("users")
              .getOne<Owner>(record.owner);

            if (!cancelled) {
              setOwner(ownerRecord);
            }
          } catch (ownerError: any) {
            if (
              ownerError?.name !== "AbortError" &&
              ownerError?.originalError?.name !== "AbortError" &&
              ownerError?.status !== 0
            ) {
              console.warn("Vlasnik nije mogao da se učita:", ownerError);
            }
          }
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

        console.error("Greška pri učitavanju LovePlace profila:", error);

        if (!cancelled) {
          setPet(null);
          setOwner(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPet();

    return () => {
      cancelled = true;
    };
  }, [petId]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <Spin size="large" />
          <p>Učitavanje profila ljubimca...</p>
        </div>
      </main>
    );
  }

  if (!pet) {
    return (
      <main className={styles.page}>
        <div className={styles.notFound}>
          <div className={styles.notFoundIcon}>
            <HeartOutlined />
          </div>

          <h1>Ljubimac nije dostupan</h1>

          <p>
            Ovaj ljubimac više nije dostupan u LovePlace-u ili je vlasnik
            isključio njegovo prikazivanje.
          </p>

          <Button
            type="primary"
            onClick={() => router.push("/dashboard/loveplace")}
          >
            Nazad na LovePlace
          </Button>
        </div>
      </main>
    );
  }

  const imageUrl = pet.image ? pb.files.getURL(pet as any, pet.image) : "";

  const age = calculateAge(pet.birthday);

  const ownerName = owner?.name || "Vlasnik ljubimca";

  return (
    <main className={styles.page}>
      <button
        className={styles.backButton}
        onClick={() => router.push("/dashboard/loveplace")}
      >
        <ArrowLeftOutlined />
        Nazad na LovePlace
      </button>

      {/* HERO */}

      <section className={styles.hero}>
        <div className={styles.heroImage}>
          {imageUrl ? (
            <img src={imageUrl} alt={pet.name} />
          ) : (
            <div className={styles.imagePlaceholder}>🐾</div>
          )}
        </div>

        <div className={styles.heroInfo}>
          <div>
            <div className={styles.eyebrow}>HELPet • LOVEPLACE</div>

            <div className={styles.titleRow}>
              <div>
                <h1>{pet.name}</h1>

                <p>
                  {typeNames[pet.type]}
                  {pet.breed ? ` • ${pet.breed}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.description}>
            <HeartFilled />

            <span>
              {pet.name} je dostupan za upoznavanje preko HELPet LovePlace-a.
            </span>
          </div>
        </div>
      </section>

      {/* DONJI DEO */}

      <section className={styles.contentGrid}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>
                <HeartFilled /> O {pet.name}
              </h2>

              <p>Osnovne informacije o ljubimcu</p>
            </div>
          </div>

          <div className={styles.infoList}>
            <div>
              <span>Ime</span>
              <strong>{pet.name}</strong>
            </div>

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
              <span>Starost</span>
              <strong>{getAgeText(age)}</strong>
            </div>

            <div>
              <span>Težina</span>
              <strong>
                {pet.weight ? `${pet.weight} kg` : "Nije navedena"}
              </strong>
            </div>
          </div>
        </div>

        {/* CONTACT */}

        <div className={styles.sideColumn}>
          <div className={styles.ownerCard}>
            <Avatar size={48} icon={<UserOutlined />} />

            <div>
              <span>CONTACT</span>

              <strong>{ownerName}</strong>

              {owner?.contact && <small>{owner.contact}</small>}
            </div>
          </div>

          <div className={styles.safetyCard}>
            <div className={styles.safetyIcon}>
              <SafetyCertificateOutlined />
            </div>

            <div>
              <strong>LovePlace zaštita</strong>

              <p>
                Vlasnik je dozvolio da se ovaj ljubimac javno prikazuje u
                LovePlace-u.
              </p>
            </div>
          </div>

          {pet.color && (
            <div className={styles.colorCard}>
              <EnvironmentOutlined />

              <div>
                <span>BOJA</span>

                <strong>{pet.color}</strong>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
