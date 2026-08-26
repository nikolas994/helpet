"use client";

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  SaveOutlined,
  DashboardOutlined,
} from "@ant-design/icons";

import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  message,
} from "antd";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";

import styles from "./AddVisit.module.css";

const visitTypes = [
  {
    value: "checkup",
    label: "Redovna kontrola",
  },
  {
    value: "vaccination",
    label: "Vakcinacija",
  },
  {
    value: "illness",
    label: "Bolest / tegobe",
  },
  {
    value: "surgery",
    label: "Operacija",
  },
  {
    value: "emergency",
    label: "Hitna intervencija",
  },
  {
    value: "other",
    label: "Drugo",
  },
];

const visitTypeNames: Record<string, string> = {
  checkup: "Redovna kontrola",
  vaccination: "Vakcinacija",
  illness: "Bolest / tegobe",
  surgery: "Operacija",
  emergency: "Hitna intervencija",
  other: "Drugo",
};

export default function AddVisitPage() {
  const router = useRouter();
  const params = useParams();

  const petId = params.petId as string;

  const [form] = Form.useForm();

  const [messageApi, contextHolder] = message.useMessage();

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (!pb.authStore.isValid) {
        messageApi.error("Sesija je istekla. Prijavi se ponovo.");
        router.push("/login");
        return;
      }

      if (!petId) {
        messageApi.error("Ljubimac nije pronađen.");
        return;
      }

      setSaving(true);

      /*
       * Provera da ljubimac postoji
       * i da pripada trenutno prijavljenom korisniku.
       */
      const pet = await pb.collection("pets").getOne(petId);

      const currentUserId = pb.authStore.record?.id;

      if (pet.owner !== currentUserId) {
        messageApi.error("Nemaš dozvolu da dodaš pregled ovom ljubimcu.");
        return;
      }

      /*
       * Ant Design DatePicker vraća Dayjs objekat.
       * PocketBase date polje čuvamo kao YYYY-MM-DD.
       */
      const date = values.date ? values.date.format("YYYY-MM-DD") : null;

      /*
       * Razlog + nalaz + preporuka
       * čuvamo u PocketBase "notes" polju.
       *
       * Tako ne gubimo podatke iako PB trenutno
       * nema posebna polja za reason/findings/recommendation.
       */
      const notes = [
        values.reason ? `Razlog dolaska: ${values.reason}` : "",

        values.findings ? `Nalaz: ${values.findings}` : "",

        values.recommendation
          ? `Preporuka veterinara: ${values.recommendation}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      /*
       * Kreiranje pregleda u PocketBase-u.
       *
       * PB visits polja:
       *
       * pet
       * date
       * title
       * vet
       * description
       * diagnosis
       * notes
       * weight
       */
      await pb.collection("visits").create({
        pet: petId,

        date,

        // Tip pregleda
        title: values.type || "",

        // Veterinar / ordinacija
        vet: values.vet || "",

        // Nalaz
        description: values.findings || "",

        // Dijagnoza
        diagnosis: values.diagnosis || "",

        // Razlog + nalaz + preporuka
        notes,

        // // Težina
        // weight:
        //   values.weight !== undefined && values.weight !== null
        //     ? values.weight
        //     : null,
      });

      messageApi.success("Veterinarski pregled je uspešno dodat!");

      setTimeout(() => {
        router.push(`/dashboard/profile/${petId}`);
      }, 700);
    } catch (error: any) {
      console.error("Greška pri dodavanju veterinarskog pregleda:", error);

      if (error?.name === "AbortError") {
        return;
      }

      if (error?.status === 400) {
        messageApi.error("Podaci nisu ispravni. Proveri sva obavezna polja.");
        return;
      }

      if (error?.status === 403) {
        messageApi.error("Nemaš dozvolu za dodavanje pregleda.");
        return;
      }

      messageApi.error("Došlo je do greške prilikom dodavanja pregleda.");
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
          className={styles.backButton}
          onClick={() => router.push(`/dashboard/profile/${petId}`)}
        >
          <ArrowLeftOutlined />
          Nazad na e-karton
        </button>

        {/* HEADER */}

        <section className={styles.header}>
          <div className={styles.icon}>
            <FileTextOutlined />
          </div>

          <div>
            <span>E-KARTON</span>

            <h1>Novi veterinarski pregled</h1>

            <p>Unesi podatke o pregledu i zdravstvenom stanju ljubimca.</p>
          </div>
        </section>

        {/* FORM */}

        <section className={styles.card}>
          <Form form={form} layout="vertical" requiredMark="optional">
            {/* OSNOVNO */}

            <div className={styles.sectionTitle}>
              <CalendarOutlined />

              <div>
                <h2>Podaci o pregledu</h2>

                <p>Osnovne informacije o veterinarskoj poseti</p>
              </div>
            </div>

            <div className={styles.grid}>
              <Form.Item
                label="Datum pregleda"
                name="date"
                rules={[
                  {
                    required: true,
                    message: "Izaberi datum pregleda",
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
                />
              </Form.Item>

              <Form.Item
                label="Tip pregleda"
                name="type"
                rules={[
                  {
                    required: true,
                    message: "Izaberi tip pregleda",
                  },
                ]}
              >
                <Select
                  size="large"
                  placeholder="Izaberi tip"
                  options={visitTypes}
                />
              </Form.Item>
            </div>

            <Form.Item
              label="Veterinar / ordinacija"
              name="vet"
              rules={[
                {
                  required: true,
                  message: "Unesi veterinara ili ordinaciju",
                },
              ]}
            >
              <Input
                size="large"
                prefix={<EnvironmentOutlined />}
                placeholder="npr. Veterinarska ordinacija Marković"
              />
            </Form.Item>

            {/* NALAZ */}

            <div className={styles.sectionTitle}>
              <FileTextOutlined />

              <div>
                <h2>Veterinarski nalaz</h2>

                <p>Detalji pregleda i zdravstvenog stanja</p>
              </div>
            </div>

            <Form.Item label="Razlog dolaska" name="reason">
              <Input
                size="large"
                placeholder="npr. Redovna kontrola, kašalj, povreda..."
              />
            </Form.Item>

            <Form.Item
              label="Nalaz"
              name="findings"
              rules={[
                {
                  required: true,
                  message: "Unesi nalaz pregleda",
                },
              ]}
            >
              <Input.TextArea
                rows={5}
                placeholder="Opiši nalaz veterinara..."
                showCount
                maxLength={1000}
              />
            </Form.Item>

            <Form.Item label="Dijagnoza" name="diagnosis">
              <Input size="large" placeholder="Dijagnoza ukoliko postoji" />
            </Form.Item>

            <Form.Item label="Preporuka veterinara" name="recommendation">
              <Input.TextArea
                rows={4}
                placeholder="Terapija, kontrola, promena ishrane..."
                showCount
                maxLength={1000}
              />
            </Form.Item>

            {/* TEŽINA */}

            {/* <Form.Item label="Težina ljubimca" name="weight">
              <InputNumber
                size="large"
                min={0}
                max={500}
                step={0.1}
                style={{
                  width: "100%",
                }}
                prefix={<DashboardOutlined />}
                placeholder="npr. 12.5"
                addonAfter="kg"
              />
            </Form.Item> */}

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
                Sačuvaj pregled
              </Button>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
