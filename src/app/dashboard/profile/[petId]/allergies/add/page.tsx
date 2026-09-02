"use client";

import {
  AlertOutlined,
  ArrowLeftOutlined,
  HeartFilled,
  SaveOutlined,
} from "@ant-design/icons";

import { Button, Form, Input, Select, message } from "antd";

import { useEffect, useState } from "react";

import { useParams, useRouter, useSearchParams } from "next/navigation";

import pb from "@/app/lib/pocketbase";

import styles from "./AddAllergy.module.css";

const severityOptions = [
  {
    value: "mild",
    label: "Blaga",
  },
  {
    value: "moderate",
    label: "Umerena",
  },
  {
    value: "severe",
    label: "Teška",
  },
];

const reactionOptions = [
  {
    value: "itching",
    label: "Svrab",
  },
  {
    value: "redness",
    label: "Crvenilo kože",
  },
  {
    value: "swelling",
    label: "Oticanje",
  },
  {
    value: "vomiting",
    label: "Povraćanje",
  },
  {
    value: "diarrhea",
    label: "Dijareja",
  },
  {
    value: "breathing",
    label: "Problemi sa disanjem",
  },
  {
    value: "other",
    label: "Drugo",
  },
];

type AllergyFormValues = {
  name: string;
  reaction: string;
  severity: string;
  notes?: string;
};

export default function AddAllergyPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const petId = params.petId as string;

  /*
   * Ako postoji ?edit=ID,
   * stranica radi u EDIT modu.
   */
  const editId = searchParams.get("edit");

  const isEditMode = Boolean(editId);

  const [form] = Form.useForm<AllergyFormValues>();

  const [messageApi, contextHolder] = message.useMessage();

  const [saving, setSaving] = useState(false);

  const [loadingEdit, setLoadingEdit] = useState(false);

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.push("/login");
    }
  }, [router]);

  /* =========================================================
     LOAD ALLERGY FOR EDIT
  ========================================================= */

  useEffect(() => {
    if (!editId || !petId) {
      return;
    }

    let cancelled = false;

    const loadAllergy = async () => {
      try {
        setLoadingEdit(true);

        /* -------------------------------------------------------
           LOGIN
        ------------------------------------------------------- */

        if (!pb.authStore.isValid) {
          if (!cancelled) {
            messageApi.error("Sesija je istekla. Prijavi se ponovo.");

            router.push("/login");
          }

          return;
        }

        const currentUserId = pb.authStore.record?.id;

        /* -------------------------------------------------------
           PET
        ------------------------------------------------------- */

        const pet = await pb.collection("pets").getOne(petId, {
          requestKey: null,
        });

        if (cancelled) return;

        /* -------------------------------------------------------
           OWNERSHIP
        ------------------------------------------------------- */

        if (pet.owner !== currentUserId) {
          messageApi.error("Nemaš dozvolu za pristup ovom ljubimcu.");

          router.push(`/dashboard/profile/${petId}`);

          return;
        }

        /* -------------------------------------------------------
           ALLERGY
        ------------------------------------------------------- */

        const allergy = await pb.collection("allergies").getOne(editId, {
          requestKey: null,
        });

        if (cancelled) return;

        /* -------------------------------------------------------
           RECORD OWNERSHIP
        ------------------------------------------------------- */

        if (allergy.pet !== petId) {
          messageApi.error("Ova alergija ne pripada izabranom ljubimcu.");

          router.push(`/dashboard/profile/${petId}`);

          return;
        }

        /* -------------------------------------------------------
           POPUNI FORMU
        ------------------------------------------------------- */

        form.setFieldsValue({
          name: allergy.name || "",

          reaction: allergy.reaction || "",

          severity: allergy.severity || "",

          notes: allergy.notes || "",
        });
      } catch (error: any) {
        if (
          cancelled ||
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError"
        ) {
          return;
        }

        console.error("Greška pri učitavanju alergije:", error);

        if (error?.status === 404) {
          messageApi.error("Alergija nije pronađena.");
        } else if (error?.status === 403) {
          messageApi.error("Nemaš dozvolu za pristup ovoj alergiji.");
        } else {
          messageApi.error("Došlo je do greške prilikom učitavanja alergije.");
        }

        router.push(`/dashboard/profile/${petId}`);
      } finally {
        if (!cancelled) {
          setLoadingEdit(false);
        }
      }
    };

    loadAllergy();

    return () => {
      cancelled = true;
    };
  }, [editId, petId, router]);

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      /* -------------------------------------------------------
         LOGIN
      ------------------------------------------------------- */

      if (!pb.authStore.isValid) {
        messageApi.error("Sesija je istekla. Prijavi se ponovo.");

        router.push("/login");

        return;
      }

      /* -------------------------------------------------------
         PET
      ------------------------------------------------------- */

      if (!petId) {
        messageApi.error("Ljubimac nije pronađen.");

        return;
      }

      setSaving(true);

      const currentUserId = pb.authStore.record?.id;

      const pet = await pb.collection("pets").getOne(petId, {
        requestKey: null,
      });

      /* -------------------------------------------------------
         OWNERSHIP
      ------------------------------------------------------- */

      if (pet.owner !== currentUserId) {
        messageApi.error(
          isEditMode
            ? "Nemaš dozvolu da izmeniš alergiju ovog ljubimca."
            : "Nemaš dozvolu da dodaš alergiju ovom ljubimcu.",
        );

        return;
      }

      /* -------------------------------------------------------
         DATA
      ------------------------------------------------------- */

      const allergyData = {
        pet: petId,

        name: values.name.trim(),

        reaction: values.reaction,

        severity: values.severity,

        notes: values.notes?.trim() || "",
      };

      /* =======================================================
         EDIT
      ======================================================= */

      if (editId) {
        /* -------------------------------------------------------
           PROVERA POSTOJEĆEG ZAPISA
        ------------------------------------------------------- */

        const existingAllergy = await pb
          .collection("allergies")
          .getOne(editId, {
            requestKey: null,
          });

        if (existingAllergy.pet !== petId) {
          messageApi.error("Ova alergija ne pripada izabranom ljubimcu.");

          return;
        }

        /* -------------------------------------------------------
           UPDATE
        ------------------------------------------------------- */

        await pb.collection("allergies").update(editId, allergyData);

        messageApi.success("Alergija je uspešno izmenjena!");
      } else {

      /* =======================================================
         CREATE
      ======================================================= */
        await pb.collection("allergies").create(allergyData);

        messageApi.success("Alergija je uspešno dodata!");
      }

      /* -------------------------------------------------------
         REDIRECT
      ------------------------------------------------------- */

      setTimeout(() => {
        router.push(`/dashboard/profile/${petId}`);

        router.refresh();
      }, 700);
    } catch (error: any) {
      /* -------------------------------------------------------
         FORM VALIDATION
      ------------------------------------------------------- */

      if (error?.errorFields) {
        return;
      }

      /* -------------------------------------------------------
         ABORT
      ------------------------------------------------------- */

      if (
        error?.name === "AbortError" ||
        error?.originalError?.name === "AbortError"
      ) {
        return;
      }

      console.error(
        isEditMode
          ? "Greška pri izmeni alergije:"
          : "Greška pri dodavanju alergije:",
        error,
      );

      /* -------------------------------------------------------
         ERRORS
      ------------------------------------------------------- */

      if (error?.status === 400) {
        messageApi.error("Podaci nisu ispravni. Proveri sva obavezna polja.");

        return;
      }

      if (error?.status === 403) {
        messageApi.error(
          isEditMode
            ? "Nemaš dozvolu za izmenu alergije."
            : "Nemaš dozvolu za dodavanje alergije.",
        );

        return;
      }

      if (error?.status === 404) {
        messageApi.error("Ljubimac ili alergija nisu pronađeni.");

        return;
      }

      messageApi.error(
        isEditMode
          ? "Došlo je do greške prilikom izmene alergije."
          : "Došlo je do greške prilikom dodavanja alergije.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      {contextHolder}

      <main className={styles.page}>
        {/* =================================================
            BACK
        ================================================= */}

        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push(`/dashboard/profile/${petId}`)}
          disabled={saving}
        >
          <ArrowLeftOutlined />

          <span>Nazad na e-karton</span>
        </button>

        {/* =================================================
            HEADER
        ================================================= */}

        <section className={styles.header}>
          <div className={styles.icon}>
            <HeartFilled />
          </div>

          <div>
            <span>E-KARTON</span>

            <h1>{isEditMode ? "Izmeni alergiju" : "Dodaj alergiju"}</h1>

            <p>
              {isEditMode
                ? "Izmeni podatke o alergiji i reakciji ljubimca."
                : "Zabeleži alergiju i reakciju ljubimca."}
            </p>
          </div>
        </section>

        {/* =================================================
            WARNING
        ================================================= */}

        <section className={styles.warning}>
          <AlertOutlined />

          <div>
            <strong>Važna informacija</strong>

            <p>
              Unesi sve poznate alergije kako bi veterinar imao kompletan uvid u
              zdravstveno stanje ljubimca.
            </p>
          </div>
        </section>

        {/* =================================================
            FORM CARD
        ================================================= */}

        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <HeartFilled />

            <div>
              <h2>Podaci o alergiji</h2>

              <p>
                {isEditMode
                  ? "Izmeni osnovne informacije o alergiji."
                  : "Osnovne informacije o alergiji"}
              </p>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            disabled={saving || loadingEdit}
          >
            {/* =================================================
                ALLERGEN
            ================================================= */}

            <Form.Item
              label="Alergen"
              name="name"
              rules={[
                {
                  required: true,
                  message: "Unesi naziv alergena",
                },
              ]}
            >
              <Input
                size="large"
                placeholder="npr. Piletina, polen, određeni lek..."
              />
            </Form.Item>

            {/* =================================================
                SEVERITY + REACTION
            ================================================= */}

            <div className={styles.grid}>
              <Form.Item
                label="Jačina reakcije"
                name="severity"
                rules={[
                  {
                    required: true,
                    message: "Izaberi jačinu reakcije",
                  },
                ]}
              >
                <Select
                  size="large"
                  placeholder="Izaberi jačinu"
                  options={severityOptions}
                />
              </Form.Item>

              <Form.Item
                label="Tip reakcije"
                name="reaction"
                rules={[
                  {
                    required: true,
                    message: "Izaberi reakciju",
                  },
                ]}
              >
                <Select
                  size="large"
                  placeholder="Izaberi reakciju"
                  options={reactionOptions}
                />
              </Form.Item>
            </div>

            {/* =================================================
                NOTES
            ================================================= */}

            <Form.Item label="Napomena" name="notes">
              <Input.TextArea
                rows={5}
                placeholder="Dodatne informacije, preporuke veterinara, šta treba izbegavati..."
                showCount
                maxLength={500}
              />
            </Form.Item>

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className={styles.actions}>
              <Button
                size="large"
                disabled={saving}
                onClick={() => router.push(`/dashboard/profile/${petId}`)}
              >
                Otkaži
              </Button>

              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={loadingEdit}
                onClick={handleSubmit}
              >
                {saving
                  ? "Čuvanje..."
                  : isEditMode
                  ? "Sačuvaj izmene"
                  : "Sačuvaj alergiju"}
              </Button>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
