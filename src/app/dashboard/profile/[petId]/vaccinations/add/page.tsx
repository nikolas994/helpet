"use client";

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import { Button, DatePicker, Form, Input, Select, message } from "antd";

import dayjs, { Dayjs } from "dayjs";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import pb from "@/app/lib/pocketbase";

import styles from "./AddVaccination.module.css";

const vaccineTypes = [
  {
    value: "rabies",
    label: "Besnilo",
  },
  {
    value: "dhppi",
    label: "DHPPi",
  },
  {
    value: "kc",
    label: "KC",
  },
  {
    value: "other",
    label: "Drugo",
  },
];

type VaccinationFormValues = {
  name: string;
  type: string;
  date: Dayjs;
  nextDate?: Dayjs;
  vet?: string;
  notes?: string;
};

export default function AddVaccinationPage() {
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

  const [form] = Form.useForm<VaccinationFormValues>();

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
     LOAD EXISTING VACCINATION
  ========================================================= */

  useEffect(() => {
    if (!editId || !petId) {
      return;
    }

    const loadVaccination = async () => {
      try {
        setLoadingEdit(true);

        /*
         * AUTH
         */
        if (!pb.authStore.isValid) {
          messageApi.error("Sesija je istekla. Prijavi se ponovo.");

          router.push("/login");

          return;
        }

        /*
         * CURRENT USER
         */
        const currentUserId = pb.authStore.record?.id;

        /*
         * PET
         */
        const pet = await pb.collection("pets").getOne(petId, {
          requestKey: null,
        });
        /*
         * OWNERSHIP CHECK
         */
        if (pet.owner !== currentUserId) {
          messageApi.error("Nemaš dozvolu za pristup ovom ljubimcu.");

          router.push(`/dashboard/profile/${petId}`);

          return;
        }

        /*
         * VACCINATION
         */
        const vaccination = await pb.collection("vaccinations").getOne(editId, {
          requestKey: null,
        });
        /*
         * Dodatna sigurnosna provera:
         * vakcina mora pripadati ovom ljubimcu.
         */
        if (vaccination.pet !== petId) {
          messageApi.error("Ova vakcinacija ne pripada izabranom ljubimcu.");

          router.push(`/dashboard/profile/${petId}`);

          return;
        }

        /*
         * POPUNJAVANJE FORME
         */
        form.setFieldsValue({
          name: vaccination.name || "",
          type: vaccination.type || undefined,

          date: vaccination.date ? dayjs(vaccination.date) : undefined,

          nextDate: vaccination.nextDate
            ? dayjs(vaccination.nextDate)
            : undefined,

          vet: vaccination.vet || "",
          notes: vaccination.notes || "",
        });
      } catch (error: any) {
        console.error("Greška pri učitavanju vakcinacije:", error);

        if (error?.status === 404) {
          messageApi.error("Vakcinacija nije pronađena.");
        } else if (error?.status === 403) {
          messageApi.error("Nemaš dozvolu za pristup ovoj vakcinaciji.");
        } else {
          messageApi.error(
            "Došlo je do greške prilikom učitavanja vakcinacije.",
          );
        }

        router.push(`/dashboard/profile/${petId}`);
      } finally {
        setLoadingEdit(false);
      }
    };

    loadVaccination();
  }, [editId, petId, form, messageApi, router]);

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
            ? "Nemaš dozvolu da izmeniš vakcinaciju ovog ljubimca."
            : "Nemaš dozvolu da dodaš vakcinu ovom ljubimcu.",
        );

        return;
      }

      /* -------------------------------------------------------
         DATUMI
      ------------------------------------------------------- */

      const date = values.date.format("YYYY-MM-DD");

      const nextDate = values.nextDate
        ? values.nextDate.format("YYYY-MM-DD")
        : "";

      /* -------------------------------------------------------
         DATA
      ------------------------------------------------------- */

      const vaccinationData = {
        pet: petId,

        name: values.name.trim(),

        type: values.type,

        date,

        nextDate,

        vet: values.vet?.trim() || "",

        notes: values.notes?.trim() || "",
      };

      /* =======================================================
         EDIT
      ======================================================= */

      if (editId) {
        /*
         * Učitaj postojeći zapis
         */
        const existingVaccination = await pb
          .collection("vaccinations")
          .getOne(editId);

        /*
         * Security check
         */
        if (existingVaccination.pet !== petId) {
          messageApi.error("Ova vakcinacija ne pripada izabranom ljubimcu.");

          return;
        }

        /*
         * UPDATE
         */
        await pb.collection("vaccinations").update(editId, vaccinationData);

        messageApi.success("Vakcinacija je uspešno izmenjena!");
      } else {
        /* =======================================================
         CREATE
      ======================================================= */
        await pb.collection("vaccinations").create(vaccinationData);

        messageApi.success("Vakcina je uspešno dodata!");
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
          ? "Greška pri izmeni vakcinacije:"
          : "Greška pri dodavanju vakcine:",
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
            ? "Nemaš dozvolu za izmenu vakcinacije."
            : "Nemaš dozvolu za dodavanje vakcine.",
        );

        return;
      }

      if (error?.status === 404) {
        messageApi.error("Ljubimac ili vakcinacija nisu pronađeni.");

        return;
      }

      messageApi.error(
        isEditMode
          ? "Došlo je do greške prilikom izmene vakcinacije."
          : "Došlo je do greške prilikom dodavanja vakcine.",
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
            <span className={styles.eyebrow}>E-KARTON • VAKCINACIJE</span>

            <h1>{isEditMode ? "Izmeni vakcinaciju" : "Dodaj vakcinu"}</h1>

            <p>
              {isEditMode
                ? "Izmeni podatke o vakcinaciji ljubimca."
                : "Unesi podatke o vakcinaciji ljubimca."}
            </p>
          </div>
        </section>

        {/* =================================================
            FORM CARD
        ================================================= */}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIcon}>
              <MedicineBoxOutlined />
            </div>

            <div>
              <h2>Podaci o vakcinaciji</h2>

              <p>
                {isEditMode
                  ? "Izmeni informacije o primljenoj vakcini."
                  : "Popuni osnovne informacije o primljenoj vakcini."}
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
                NAZIV
            ================================================= */}

            <Form.Item
              label="Naziv vakcine"
              name="name"
              rules={[
                {
                  required: true,
                  message: "Unesi naziv vakcine",
                },
                {
                  min: 2,
                  message: "Naziv vakcine mora imati najmanje 2 karaktera.",
                },
              ]}
            >
              <Input
                size="large"
                placeholder="npr. Nobivac DHPPi"
                maxLength={100}
              />
            </Form.Item>

            {/* =================================================
                TYPE
            ================================================= */}

            <Form.Item
              label="Tip vakcine"
              name="type"
              rules={[
                {
                  required: true,
                  message: "Izaberi tip vakcine",
                },
              ]}
            >
              <Select
                size="large"
                placeholder="Izaberi tip vakcine"
                options={vaccineTypes}
              />
            </Form.Item>

            {/* =================================================
                DATES
            ================================================= */}

            <div className={styles.grid}>
              <Form.Item
                label="Datum primanja"
                name="date"
                rules={[
                  {
                    required: true,
                    message: "Izaberi datum",
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
                  disabledDate={(current) =>
                    current ? current.isAfter(dayjs(), "day") : false
                  }
                />
              </Form.Item>

              <Form.Item label="Sledeća revakcinacija" name="nextDate">
                <DatePicker
                  size="large"
                  format="DD.MM.YYYY."
                  style={{
                    width: "100%",
                  }}
                  suffixIcon={<CalendarOutlined />}
                  disabledDate={(current) => {
                    const vaccinationDate = form.getFieldValue("date");

                    if (!current) {
                      return false;
                    }

                    if (!vaccinationDate) {
                      return false;
                    }

                    return current.isBefore(vaccinationDate, "day");
                  }}
                />
              </Form.Item>
            </div>

            {/* =================================================
                VETERINAR
            ================================================= */}

            <Form.Item label="Veterinar / ordinacija" name="vet">
              <Input
                size="large"
                placeholder="npr. Veterinarska ordinacija Nikolić"
                maxLength={150}
              />
            </Form.Item>

            {/* =================================================
                NOTES
            ================================================= */}

            <Form.Item label="Napomena" name="notes">
              <Input.TextArea
                rows={4}
                placeholder="Dodatne informacije o vakcinaciji..."
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
                  : "Sačuvaj vakcinu"}
              </Button>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
