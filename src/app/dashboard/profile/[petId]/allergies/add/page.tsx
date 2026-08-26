"use client";

import {
  AlertOutlined,
  ArrowLeftOutlined,
  HeartFilled,
  SaveOutlined,
} from "@ant-design/icons";

import { Button, Form, Input, Select, message } from "antd";

import { useParams, useRouter } from "next/navigation";

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

export default function AddAllergyPage() {
  const router = useRouter();
  const params = useParams();

  const petId = params.petId as string;

  const [form] = Form.useForm();

  const [messageApi, contextHolder] = message.useMessage();

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

      const currentUserId = pb.authStore.record?.id;

      /*
       * Provera da ljubimac postoji
       * i da pripada trenutno prijavljenom korisniku.
       */
      const pet = await pb.collection("pets").getOne(petId);

      if (pet.owner !== currentUserId) {
        messageApi.error("Nemaš dozvolu da dodaš alergiju ovom ljubimcu.");
        return;
      }

      /*
       * ČUVANJE ALERGIJE U POCKETBASE
       *
       * Polja u allergies kolekciji:
       * pet
       * name
       * reaction
       * severity
       * notes
       */
      await pb.collection("allergies").create({
        pet: petId,
        name: values.name,
        reaction: values.reaction,
        severity: values.severity,
        notes: values.notes || "",
      });

      messageApi.success("Alergija je uspešno dodata!");

      setTimeout(() => {
        router.push(`/dashboard/profile/${petId}`);
      }, 700);
    } catch (error: any) {
      console.error("Greška pri dodavanju alergije:", error);

      if (error?.name === "AbortError") {
        return;
      }

      if (error?.status === 400) {
        messageApi.error("Podaci nisu ispravni. Proveri sva obavezna polja.");
        return;
      }

      if (error?.status === 403) {
        messageApi.error("Nemaš dozvolu za dodavanje alergije.");
        return;
      }

      messageApi.error("Došlo je do greške prilikom dodavanja alergije.");
    }
  };

  return (
    <>
      {contextHolder}

      <main className={styles.page}>
        <button
          className={styles.backButton}
          onClick={() => router.push(`/dashboard/profile/${petId}`)}
        >
          <ArrowLeftOutlined />
          Nazad na e-karton
        </button>

        <section className={styles.header}>
          <div className={styles.icon}>
            <HeartFilled />
          </div>

          <div>
            <span>E-KARTON</span>

            <h1>Dodaj alergiju</h1>

            <p>Zabeleži alergiju i reakciju ljubimca.</p>
          </div>
        </section>

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

        <section className={styles.card}>
          <Form form={form} layout="vertical" requiredMark="optional">
            <div className={styles.sectionTitle}>
              <HeartFilled />

              <div>
                <h2>Podaci o alergiji</h2>

                <p>Osnovne informacije o alergiji</p>
              </div>
            </div>

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

            <Form.Item label="Napomena" name="notes">
              <Input.TextArea
                rows={5}
                placeholder="Dodatne informacije, preporuke veterinara, šta treba izbegavati..."
                showCount
                maxLength={500}
              />
            </Form.Item>

            <div className={styles.actions}>
              <Button
                size="large"
                onClick={() => router.push(`/dashboard/profile/${petId}`)}
              >
                Otkaži
              </Button>

              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                onClick={handleSubmit}
              >
                Sačuvaj alergiju
              </Button>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
