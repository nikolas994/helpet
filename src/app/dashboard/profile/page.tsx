"use client";

import {
  EditOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import { Avatar, Button, Tag } from "antd";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";
import { useAuth } from "@/app/context/AuthContext";

import styles from "./Profile.module.css";

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
  owner: string;
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

/* =========================================================
   AGE
========================================================= */

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

  if (years === 0) {
    if (months === 0) {
      return "Manje od mesec dana";
    }

    if (months === 1) {
      return "1 mesec";
    }

    return `${months} meseci`;
  }

  if (years === 1) {
    return "1 godina";
  }

  if (years >= 2 && years <= 4) {
    return `${years} godine`;
  }

  return `${years} godina`;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ProfilePage() {
  const router = useRouter();

  const { user, initialized } = useAuth();

  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  /*
   * =========================================================
   * PETS
   * =========================================================
   */

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const fetchPets = async () => {
      try {
        if (!pb.authStore.isValid || !pb.authStore.record?.id) {
          setPets([]);
          return;
        }

        const ownerId = pb.authStore.record.id;

        const records = await pb.collection("pets").getFullList<Pet>({
          sort: "-created",
          filter: `owner = "${ownerId}"`,
        });

        setPets(records);
      } catch (error: any) {
        if (
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError"
        ) {
          return;
        }

        console.error("Greška pri učitavanju ljubimaca:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, [initialized]);

  /*
   * =========================================================
   * PET IMAGE
   * =========================================================
   */
  const handleDeletePet = async (event: React.MouseEvent, pet: Pet) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      `Da li sigurno želiš da obrišeš ljubimca "${pet.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await pb.collection("pets").delete(pet.id);

      setPets((currentPets) =>
        currentPets.filter((item) => item.id !== pet.id),
      );
    } catch (error) {
      console.error("Greška pri brisanju ljubimca:", error);

      window.alert("Ljubimac nije mogao da bude obrisan. Pokušaj ponovo.");
    }
  };

  const getPetImage = (pet: Pet) => {
    if (!pet.image) {
      return undefined;
    }

    return pb.files.getURL(pet as any, pet.image);
  };

  /*
   * =========================================================
   * HYDRATION PROTECTION
   * =========================================================
   */

  if (!initialized) {
    return (
      <main className={styles.page}>
        <section
          className={styles.profileCard}
          style={{
            minHeight: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
          }}
        >
          Učitavanje profila...
        </section>
      </main>
    );
  }

  /*
   * =========================================================
   * PROFILE
   * =========================================================
   */

  const avatarUrl =
    user?.avatar && user?.id
      ? pb.files.getURL(user as any, user.avatar)
      : undefined;

  return (
    <main className={styles.page}>
      {/* PROFILE HEADER */}

      <section className={styles.profileCard}>
        <div className={styles.cover} />

        <div className={styles.profileContent}>
          <div className={styles.profileTop}>
            <Avatar size={110} className={styles.avatar} src={avatarUrl}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </Avatar>

            <div className={styles.profileInfo}>
              <h1>{user?.name || "Korisnik"}</h1>

              <p className={styles.subtitle}>Pet lover • HELPet korisnik</p>

              <div className={styles.meta}>
                {user?.email && (
                  <span>
                    <MailOutlined />
                    {user.email}
                  </span>
                )}

                {user?.contact && (
                  <span>
                    <PhoneOutlined />
                    {user.contact}
                  </span>
                )}

                {user?.location && (
                  <span>
                    <EnvironmentOutlined />
                    {user.location}
                  </span>
                )}
              </div>
            </div>

            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => router.push("/dashboard/profile/edit")}
            >
              Izmeni profil
            </Button>
          </div>
        </div>
      </section>

      {/* PETS */}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Moji ljubimci</h2>

            <p>Svi tvoji ljubimci na jednom mestu</p>
          </div>
        </div>

        <div className={styles.petGrid}>
          {loading ? (
            <div className={styles.statusMessage}>Učitavanje ljubimaca...</div>
          ) : pets.length === 0 ? (
            <div className={styles.statusMessage}>
              Još nemaš dodatih ljubimaca.
            </div>
          ) : (
            pets.map((pet) => {
              const age = calculateAge(pet.birthday);

              const hasDetails =
                Boolean(pet.gender) ||
                Boolean(age) ||
                (pet.weight !== undefined && pet.weight !== null);

              return (
                <article
                  className={styles.petCard}
                  key={pet.id}
                  onClick={() => router.push(`/dashboard/profile/${pet.id}`)}
                >
                  <Tag className={styles.petType}>
                    {typeNames[pet.type] || "Ljubimac"}
                  </Tag>

                  <button
                    type="button"
                    className={styles.deletePetButton}
                    onClick={(event) => handleDeletePet(event, pet)}
                    aria-label={`Obriši ljubimca ${pet.name}`}
                  >
                    <DeleteOutlined />
                  </button>
                  <div className={styles.petImageWrapper}>
                    {pet.image ? (
                      <img
                        src={getPetImage(pet)}
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
                          fontSize: 50,
                        }}
                      >
                        🐾
                      </div>
                    )}

                    <Tag className={styles.petType}>
                      {typeNames[pet.type] || "Ljubimac"}
                    </Tag>
                  </div>

                  <div className={styles.petContent}>
                    <div className={styles.petHeader}>
                      <div>
                        <h3>{pet.name}</h3>

                        {pet.breed && <p>{pet.breed}</p>}
                      </div>
                    </div>

                    {hasDetails && (
                      <div className={styles.petDetails}>
                        {pet.gender && <span>{genderNames[pet.gender]}</span>}

                        {age && <span>{age}</span>}

                        {pet.weight !== undefined && pet.weight !== null && (
                          <span>{pet.weight} kg</span>
                        )}
                      </div>
                    )}

                    <Button
                      block
                      size="large"
                      onClick={(event) => {
                        event.stopPropagation();

                        router.push(`/dashboard/profile/${pet.id}`);
                      }}
                    >
                      Otvori e-karton
                    </Button>
                  </div>
                </article>
              );
            })
          )}

          {/* ADD PET */}

          <button
            className={styles.addPetCard}
            onClick={() => router.push("/dashboard/profile/add-pet")}
          >
            <div className={styles.addIcon}>
              <PlusOutlined />
            </div>

            <strong>Dodaj ljubimca</strong>

            <span>
              Dodaj svog ljubimca i vodi njegov digitalni zdravstveni karton.
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
