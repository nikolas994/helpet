"use client";

import {
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Tag } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";
import { useAuth } from "@/app/context/AuthContext";

import styles from "./Profile.module.css";

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
  owner: string;
};

type ProfileUser = {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  contact?: string;
  location?: string;
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

  const { user, loading: authLoading } = useAuth();

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);

  const [pets, setPets] = useState<Pet[]>([]);

  const [petsLoading, setPetsLoading] = useState(true);

  const [profileLoading, setProfileLoading] = useState(true);

  /* =========================================================
     LOAD FRESH USER PROFILE
  ========================================================= */

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user?.id || !pb.authStore.isValid) {
      setProfileUser(null);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProfile = async () => {
      try {
        setProfileLoading(true);

        const freshUser = await pb
          .collection("users")
          .getOne<ProfileUser>(user.id, {
            requestKey: null,
          });

        if (cancelled) {
          return;
        }

        setProfileUser(freshUser);
      } catch (error: any) {
        if (
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError" ||
          error?.isAbort ||
          error?.status === 0
        ) {
          return;
        }

        console.error("Greška pri učitavanju profila:", error);
        setProfileUser(user as ProfileUser);
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  /* =========================================================
     LOAD PETS
  ========================================================= */

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const fetchPets = async () => {
      try {
        if (!user?.id || !pb.authStore.isValid) {
          setPets([]);
          setPetsLoading(false);
          return;
        }

        const records = await pb.collection("pets").getFullList<Pet>({
          sort: "-created",
          filter: `owner = "${user.id}"`,
          requestKey: null,
        });

        setPets(records);
      } catch (error: any) {
        if (
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError" ||
          error?.isAbort ||
          error?.status === 0
        ) {
          return;
        }

        console.error("Greška pri učitavanju ljubimaca:", error);
      } finally {
        setPetsLoading(false);
      }
    };

    fetchPets();
  }, [authLoading, user?.id]);

  /* =========================================================
     DELETE PET
  ========================================================= */

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

  /* =========================================================
     SAFE PET IMAGE
  ========================================================= */

  const getPetImage = (pet: Pet): string | undefined => {
    if (!pet.image || !pet.id) {
      return undefined;
    }

    const url = pb.files.getURL(pet as any, pet.image);

    return url || undefined;
  };

  /* =========================================================
     PROFILE AVATAR
  ========================================================= */

  const avatarUrl: string | undefined =
    profileUser?.avatar && profileUser.id
      ? pb.files.getURL(profileUser as any, profileUser.avatar) || undefined
      : undefined;

  /* =========================================================
     AUTH LOADING
  ========================================================= */

  if (authLoading || profileLoading) {
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

  /* =========================================================
     NO USER
  ========================================================= */

  if (!user || !profileUser) {
    return null;
  }

  /* =========================================================
     PROFILE
  ========================================================= */

  return (
    <main className={styles.page}>
      {/* =====================================================
          PROFILE HEADER (HERO CARD)
      ===================================================== */}

      <section className={styles.profileCard}>
        {/* COVER (NARANDŽASTI DEO) - IME I IZMENI IKONICA GORE */}
        <div className={styles.cover}>
          <div className={styles.coverInfo}>
            <h1>{profileUser.name || "Korisnik"}</h1>
          </div>

          <Button
            type="text"
            icon={<EditOutlined />}
            className={styles.editIconButton}
            onClick={() => router.push("/dashboard/profile/edit")}
            aria-label="Izmeni profil"
          />
        </div>

        {/* BELI DEO - AVATAR I KONTAKT PILULE */}
        <div className={styles.profileContent}>
          <Avatar size={62} className={styles.avatar} src={avatarUrl}>
            {!avatarUrl && (profileUser.name?.charAt(0).toUpperCase() || "U")}
          </Avatar>

          <div className={styles.meta}>
            {profileUser.email && (
              <div className={styles.metaItem}>
                <MailOutlined />
                <span>{profileUser.email}</span>
              </div>
            )}
            {profileUser.location && (
              <div className={styles.metaItem}>
                <EnvironmentOutlined />
                <span>{profileUser.location}</span>
              </div>
            )}
            {profileUser.contact && (
              <div className={styles.metaItem}>
                <PhoneOutlined />
                <span>{profileUser.contact}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          PETS SECTION
      ===================================================== */}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Moji ljubimci</h2>
            <p>Svi tvoji ljubimci na jednom mestu</p>
          </div>
        </div>

        <div className={styles.petGrid}>
          {petsLoading ? (
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

              const petImage = getPetImage(pet);

              return (
                <article
                  className={styles.petCard}
                  key={pet.id}
                  onClick={() => router.push(`/dashboard/profile/${pet.id}`)}
                >
                  <button
                    type="button"
                    className={styles.deletePetButton}
                    onClick={(event) => handleDeletePet(event, pet)}
                    aria-label={`Obriši ljubimca ${pet.name}`}
                  >
                    <DeleteOutlined />
                  </button>

                  <div className={styles.petImageWrapper}>
                    {petImage ? (
                      <img
                        src={petImage}
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
            type="button"
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
