"use client";

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import { Button, DatePicker, Form, Input, Switch, message } from "antd";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";

import styles from "./AddTherapy.module.css";

export default function AddTherapyPage() {
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

      const currentUserId = pb.authStore.record?.id;

      /*
       * Provera da ljubimac postoji
       * i da pripada trenutno prijavljenom korisniku.
       */
      const pet = await pb.collection("pets").getOne(petId);

      if (pet.owner !== currentUserId) {
        messageApi.error("Nemaš dozvolu da dodaš terapiju ovom ljubimcu.");
        return;
      }

      /*
       * DatePicker vraća Dayjs objekat.
       * PocketBase date polja čuvamo kao YYYY-MM-DD.
       */
      const startDate = values.startDate
        ? values.startDate.format("YYYY-MM-DD")
        : null;

      const endDate = values.endDate
        ? values.endDate.format("YYYY-MM-DD")
        : null;

      /*
       * Kreiranje terapije u PocketBase-u.
       *
       * PB therapies polja:
       *
       * pet
       * name
       * dosage
       * frequency
       * startDate
       * endDate
       * notes
       * active
       */
      await pb.collection("therapies").create({
        pet: petId,

        name: values.name,

        dosage: values.dosage || "",

        frequency: values.frequency || "",

        startDate,

        endDate,

        notes: values.notes || "",

        active: values.active ?? true,
      });

      messageApi.success("Terapija je uspešno dodata!");

      setTimeout(() => {
        router.push(`/dashboard/profile/${petId}`);
      }, 700);
    } catch (error: any) {
      console.error("Greška pri dodavanju terapije:", error);

      if (error?.name === "AbortError") {
        return;
      }

      if (error?.status === 400) {
        messageApi.error("Podaci nisu ispravni. Proveri sva obavezna polja.");
        return;
      }

      if (error?.status === 403) {
        messageApi.error("Nemaš dozvolu za dodavanje terapije.");
        return;
      }

      messageApi.error("Došlo je do greške prilikom dodavanja terapije.");
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
            <MedicineBoxOutlined />
          </div>

          <div>
            <span>E-KARTON</span>

            <h1>Dodaj terapiju</h1>

            <p>Unesi podatke o terapiji ili leku ljubimca.</p>
          </div>
        </section>

        {/* FORM */}

        <section className={styles.card}>
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            initialValues={{
              active: true,
            }}
          >
            <div className={styles.sectionTitle}>
              <MedicineBoxOutlined />

              <div>
                <h2>Podaci o terapiji</h2>

                <p>Osnovne informacije o terapiji</p>
              </div>
            </div>

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
                  style={{ width: "100%" }}
                  suffixIcon={<CalendarOutlined />}
                />
              </Form.Item>

              <Form.Item label="Kraj terapije" name="endDate">
                <DatePicker
                  size="large"
                  format="DD.MM.YYYY."
                  style={{ width: "100%" }}
                  suffixIcon={<CalendarOutlined />}
                />
              </Form.Item>
            </div>

            <Form.Item label="Napomena" name="notes">
              <Input.TextArea
                rows={4}
                placeholder="Dodatne informacije o terapiji..."
                showCount
                maxLength={500}
              />
            </Form.Item>

            {/* <Form.Item
              label="Status terapije"
              name="active"
              valuePropName="checked"
            >
              <Switch checkedChildren="Aktivna" unCheckedChildren="Završena" />
            </Form.Item> */}

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
                Sačuvaj terapiju
              </Button>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
