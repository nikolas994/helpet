"use client";

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import { Button, DatePicker, Form, Input, message } from "antd";

import dayjs, { Dayjs } from "dayjs";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import pb from "@/app/lib/pocketbase";

import styles from "./AddTherapy.module.css";

type TherapyFormValues = {
  name: string;
  dosage: string;
  frequency: string;
  startDate: Dayjs;
  endDate?: Dayjs;
  notes?: string;
};

export default function AddTherapyPage() {
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

  const [form] = Form.useForm<TherapyFormValues>();

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
     LOAD EXISTING THERAPY
  ========================================================= */

  useEffect(() => {
    if (!editId || !petId) {
      return;
    }

    let cancelled = false;

    const loadTherapy = async () => {
      try {
        setLoadingEdit(true);

        if (!pb.authStore.isValid) {
          if (!cancelled) {
            messageApi.error("Sesija je istekla. Prijavi se ponovo.");

            router.push("/login");
          }

          return;
        }

        const currentUserId = pb.authStore.record?.id;

        // VAŽNO:
        // requestKey: null sprečava PocketBase auto-cancellation
        const pet = await pb.collection("pets").getOne(petId, {
          requestKey: null,
        });

        if (cancelled) return;

        if (pet.owner !== currentUserId) {
          messageApi.error("Nemaš dozvolu za pristup ovom ljubimcu.");

          router.push(`/dashboard/profile/${petId}`);

          return;
        }

        const therapy = await pb.collection("therapies").getOne(editId, {
          requestKey: null,
        });

        if (cancelled) return;

        if (therapy.pet !== petId) {
          messageApi.error("Ova terapija ne pripada izabranom ljubimcu.");

          router.push(`/dashboard/profile/${petId}`);

          return;
        }

        form.setFieldsValue({
          name: therapy.name || "",
          dosage: therapy.dosage || "",
          frequency: therapy.frequency || "",

          startDate: therapy.startDate ? dayjs(therapy.startDate) : undefined,

          endDate: therapy.endDate ? dayjs(therapy.endDate) : undefined,

          notes: therapy.notes || "",
        });
      } catch (error: any) {
        // React/Next može očistiti effect dok request još traje.
        // To nije prava greška.
        if (
          cancelled ||
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError"
        ) {
          return;
        }

        console.error("Greška pri učitavanju terapije:", error);

        if (error?.status === 404) {
          messageApi.error("Terapija nije pronađena.");
        } else if (error?.status === 403) {
          messageApi.error("Nemaš dozvolu za pristup ovoj terapiji.");
        } else {
          messageApi.error("Došlo je do greške prilikom učitavanja terapije.");
        }
      } finally {
        if (!cancelled) {
          setLoadingEdit(false);
        }
      }
    };

    loadTherapy();

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
         PET ID
      ------------------------------------------------------- */

      if (!petId) {
        messageApi.error("Ljubimac nije pronađen.");

        return;
      }

      setSaving(true);

      /* -------------------------------------------------------
         CURRENT USER
      ------------------------------------------------------- */

      const currentUserId = pb.authStore.record?.id;

      /* -------------------------------------------------------
         PET
      ------------------------------------------------------- */

      const pet = await pb.collection("pets").getOne(petId);

      /* -------------------------------------------------------
         OWNERSHIP
      ------------------------------------------------------- */

      if (pet.owner !== currentUserId) {
        messageApi.error(
          isEditMode
            ? "Nemaš dozvolu da izmeniš terapiju ovog ljubimca."
            : "Nemaš dozvolu da dodaš terapiju ovom ljubimcu.",
        );

        return;
      }

      /* -------------------------------------------------------
         DATUMI
      ------------------------------------------------------- */

      const startDate = values.startDate
        ? values.startDate.format("YYYY-MM-DD")
        : null;

      const endDate = values.endDate
        ? values.endDate.format("YYYY-MM-DD")
        : null;

      /* -------------------------------------------------------
         DATA
      ------------------------------------------------------- */

      const therapyData = {
        pet: petId,

        name: values.name.trim(),

        dosage: values.dosage?.trim() || "",

        frequency: values.frequency?.trim() || "",

        startDate,

        endDate,

        notes: values.notes?.trim() || "",

        /*
         * Prilikom kreiranja nova terapija je aktivna.
         *
         * Kod izmene ne diramo postojeći active status.
         */
      };

      /* =======================================================
         EDIT
      ======================================================= */

      if (editId) {
        /* -------------------------------------------------------
           PROVERA POSTOJEĆEG ZAPISA
        ------------------------------------------------------- */

        const existingTherapy = await pb.collection("therapies").getOne(editId);

        /* -------------------------------------------------------
           SECURITY CHECK
        ------------------------------------------------------- */

        if (existingTherapy.pet !== petId) {
          messageApi.error("Ova terapija ne pripada izabranom ljubimcu.");

          return;
        }

        /* -------------------------------------------------------
           UPDATE
        ------------------------------------------------------- */

        await pb.collection("therapies").update(editId, therapyData);

        messageApi.success("Terapija je uspešno izmenjena!");
      } else {
        /* =======================================================
         CREATE
      ======================================================= */
        await pb.collection("therapies").create({
          ...therapyData,

          active: true,
        });

        messageApi.success("Terapija je uspešno dodata!");
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
          ? "Greška pri izmeni terapije:"
          : "Greška pri dodavanju terapije:",
        error,
      );

      /* -------------------------------------------------------
         POCKETBASE ERRORS
      ------------------------------------------------------- */

      if (error?.status === 400) {
        messageApi.error("Podaci nisu ispravni. Proveri sva obavezna polja.");

        return;
      }

      if (error?.status === 403) {
        messageApi.error(
          isEditMode
            ? "Nemaš dozvolu za izmenu terapije."
            : "Nemaš dozvolu za dodavanje terapije.",
        );

        return;
      }

      if (error?.status === 404) {
        messageApi.error("Ljubimac ili terapija nisu pronađeni.");

        return;
      }

      messageApi.error(
        isEditMode
          ? "Došlo je do greške prilikom izmene terapije."
          : "Došlo je do greške prilikom dodavanja terapije.",
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
            <MedicineBoxOutlined />
          </div>

          <div className={styles.headerContent}>
            <span className={styles.eyebrow}>E-KARTON</span>

            <h1>{isEditMode ? "Izmeni terapiju" : "Dodaj terapiju"}</h1>

            <p>
              {isEditMode
                ? "Izmeni podatke o terapiji ili leku ljubimca."
                : "Unesi podatke o terapiji ili leku ljubimca."}
            </p>
          </div>
        </section>

        {/* =================================================
            FORM CARD
        ================================================= */}

        <section className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.sectionIcon}>
              <MedicineBoxOutlined />
            </div>

            <div>
              <h2>Podaci o terapiji</h2>

              <p>
                {isEditMode
                  ? "Izmeni osnovne informacije o terapiji ili leku."
                  : "Osnovne informacije o terapiji ili leku"}
              </p>
            </div>
          </div>

          <div className={styles.divider} />

          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            disabled={saving || loadingEdit}
            className={styles.form}
          >
            {/* =================================================
                NAME
            ================================================= */}

            <Form.Item
              label="Naziv terapije / leka"
              name="name"
              rules={[
                {
                  required: true,
                  message: "Unesi naziv terapije",
                },
              ]}
            >
              <Input size="large" placeholder="npr. Bravecto" />
            </Form.Item>

            {/* =================================================
                DOSAGE + FREQUENCY
            ================================================= */}

            <div className={styles.grid}>
              <Form.Item
                label="Doziranje"
                name="dosage"
                rules={[
                  {
                    required: true,
                    message: "Unesi doziranje",
                  },
                ]}
              >
                <Input size="large" placeholder="npr. 1 tableta" />
              </Form.Item>

              <Form.Item
                label="Učestalost"
                name="frequency"
                rules={[
                  {
                    required: true,
                    message: "Unesi učestalost",
                  },
                ]}
              >
                <Input size="large" placeholder="npr. jednom dnevno" />
              </Form.Item>
            </div>

            {/* =================================================
                DATES
            ================================================= */}

            <div className={styles.grid}>
              <Form.Item
                label="Početak terapije"
                name="startDate"
                rules={[
                  {
                    required: true,
                    message: "Izaberi početak terapije",
                  },
                ]}
              >
                <DatePicker
                  size="large"
                  format="DD.MM.YYYY."
                  style={{
                    width: "100%",
                  }}
                  suffixIcon={<CalendarOutlined />}
                  placeholder="Izaberi datum"
                />
              </Form.Item>

              <Form.Item label="Kraj terapije" name="endDate">
                <DatePicker
                  size="large"
                  format="DD.MM.YYYY."
                  style={{
                    width: "100%",
                  }}
                  suffixIcon={<CalendarOutlined />}
                  placeholder="Izaberi datum"
                  disabledDate={(current) => {
                    const startDate = form.getFieldValue("startDate");

                    if (!current || !startDate) {
                      return false;
                    }

                    return current.isBefore(startDate, "day");
                  }}
                />
              </Form.Item>
            </div>

            {/* =================================================
                NOTES
            ================================================= */}

            <Form.Item label="Napomena" name="notes">
              <Input.TextArea
                rows={4}
                placeholder="Dodatne informacije o terapiji..."
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
                  : "Sačuvaj terapiju"}
              </Button>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
