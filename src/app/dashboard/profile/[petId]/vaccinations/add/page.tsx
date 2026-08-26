"use client";

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import { Button, DatePicker, Form, Input, Select, message } from "antd";

import dayjs, { Dayjs } from "dayjs";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

  const petId = params.petId as string;

  const [form] = Form.useForm<VaccinationFormValues>();

  const [messageApi, contextHolder] = message.useMessage();

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      /*
       * ---------------------------------------------------------
       * PROVERA LOGINA
       * ---------------------------------------------------------
       */

      if (!pb.authStore.isValid) {
        messageApi.error("Sesija je istekla. Prijavi se ponovo.");

        router.push("/login");

        return;
      }

      /*
       * ---------------------------------------------------------
       * PROVERA PET ID
       * ---------------------------------------------------------
       */

      if (!petId) {
        messageApi.error("Ljubimac nije pronađen.");

        return;
      }

      setSaving(true);

      /*
       * ---------------------------------------------------------
       * PROVERA VLASNIŠTVA
       * ---------------------------------------------------------
       */

      const currentUserId = pb.authStore.record?.id;

      const pet = await pb.collection("pets").getOne(petId);

      if (pet.owner !== currentUserId) {
        messageApi.error("Nemaš dozvolu da dodaš vakcinu ovom ljubimcu.");

        return;
      }

      /*
       * ---------------------------------------------------------
       * DATUMI
       * ---------------------------------------------------------
       */

      const date = values.date.format("YYYY-MM-DD");

      const nextDate = values.nextDate
        ? values.nextDate.format("YYYY-MM-DD")
        : "";

      /*
       * ---------------------------------------------------------
       * KREIRANJE VAKCINE
       * ---------------------------------------------------------
       */

      const vaccination = await pb.collection("vaccinations").create({
        pet: petId,

        name: values.name.trim(),

        type: values.type,

        date,

        nextDate,

        vet: values.vet?.trim() || "",

        notes: values.notes?.trim() || "",
      });

      console.log("Vakcina uspešno kreirana:", vaccination);

      /*
       * ---------------------------------------------------------
       * SUCCESS
       * ---------------------------------------------------------
       */

      messageApi.success("Vakcina je uspešno dodata!");

      form.resetFields();

      setTimeout(() => {
        router.push(`/dashboard/profile/${petId}`);
      }, 700);
    } catch (error: any) {
      /*
       * ---------------------------------------------------------
       * FORM VALIDATION
       * ---------------------------------------------------------
       */

      if (error?.errorFields) {
        return;
      }

      /*
       * ---------------------------------------------------------
       * POCKETBASE AUTOCANCEL
       * ---------------------------------------------------------
       */

      if (
        error?.name === "AbortError" ||
        error?.originalError?.name === "AbortError"
      ) {
        return;
      }

      /*
       * ---------------------------------------------------------
       * ERROR LOG
       * ---------------------------------------------------------
       */

      console.error("Greška pri dodavanju vakcine:", error);

      /*
       * ---------------------------------------------------------
       * POCKETBASE ERROR STATUS
       * ---------------------------------------------------------
       */

      if (error?.status === 400) {
        messageApi.error("Podaci nisu ispravni. Proveri sva obavezna polja.");

        return;
      }

      if (error?.status === 403) {
        messageApi.error("Nemaš dozvolu za dodavanje vakcine.");

        return;
      }

      if (error?.status === 404) {
        messageApi.error("Ljubimac ili kolekcija vakcinacija nisu pronađeni.");

        return;
      }

      /*
       * ---------------------------------------------------------
       * GENERIČKA GREŠKA
       * ---------------------------------------------------------
       */

      messageApi.error("Došlo je do greške prilikom dodavanja vakcine.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {contextHolder}

      <main className={styles.page}>
        {/* BACK */}

        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push(`/dashboard/profile/${petId}`)}
        >
          <ArrowLeftOutlined />
          Nazad na e-karton
        </button>

        {/* HEADER */}

        <section className={styles.header}>
          <div className={styles.icon}>
            <MedicineBoxOutlined />
          </div>

          <div>
            <span>E-KARTON</span>

            <h1>Dodaj vakcinu</h1>

            <p>Unesi podatke o vakcinaciji ljubimca.</p>
          </div>
        </section>

        {/* FORM */}

        <section className={styles.card}>
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            disabled={saving}
          >
            {/* NAZIV VAKCINE */}

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

            {/* TIP VAKCINE */}

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
                placeholder="Izaberi vakcinu"
                options={vaccineTypes}
              />
            </Form.Item>

            {/* DATUMI */}

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

            {/* VETERINAR */}

            <Form.Item label="Veterinar / ordinacija" name="vet">
              <Input
                size="large"
                placeholder="npr. Veterinarska ordinacija Nikolić"
                maxLength={150}
              />
            </Form.Item>

            {/* NAPOMENA */}

            <Form.Item label="Napomena" name="notes">
              <Input.TextArea
                rows={4}
                placeholder="Dodatne informacije o vakcinaciji..."
                showCount
                maxLength={500}
              />
            </Form.Item>

            {/* ACTIONS */}

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
                onClick={handleSubmit}
              >
                {saving ? "Čuvanje..." : "Sačuvaj vakcinu"}
              </Button>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
