"use client";

import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import { Button, DatePicker, Form, Input, Select, message } from "antd";

import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();

  const petId = params.petId as string;
  const editId = searchParams.get("edit");

  const [form] = Form.useForm();

  const [messageApi, contextHolder] = message.useMessage();

  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const isEditMode = Boolean(editId);

  /*
   * Učitavanje postojećeg pregleda kada postoji:
   *
   * /visits/add?edit=VISIT_ID
   */
  useEffect(() => {
    if (!editId || !petId) {
      return;
    }

    const loadVisit = async () => {
      try {
        setLoadingEdit(true);

        if (!pb.authStore.isValid) {
          messageApi.error("Sesija je istekla. Prijavi se ponovo.");
          router.push("/login");
          return;
        }

        /*
         * Provera ljubimca
         */
        const pet = await pb.collection("pets").getOne(petId, {
          requestKey: null,
        });

        const currentUserId = pb.authStore.record?.id;

        if (pet.owner !== currentUserId) {
          messageApi.error("Nemaš dozvolu za pristup ovom ljubimcu.");
          router.push(`/dashboard/profile/${petId}`);
          return;
        }

        /*
         * Učitavanje pregleda
         */
        const visit = await pb.collection("visits").getOne(editId, {
          requestKey: null,
        });

        /*
         * Dodatna sigurnosna provera:
         * pregled mora pripadati ovom ljubimcu.
         */
        if (visit.pet !== petId) {
          messageApi.error("Ovaj pregled ne pripada izabranom ljubimcu.");
          router.push(`/dashboard/profile/${petId}`);
          return;
        }

        /*
         * Parsiranje notes polja.
         *
         * Primer:
         *
         * Razlog dolaska: Kontrola
         *
         * Nalaz: Sve je u redu
         *
         * Preporuka veterinara: Kontrola za 6 meseci
         */

        let reason = "";
        let findings = visit.description || "";
        let recommendation = "";

        if (visit.notes) {
          const notes = visit.notes as string;

          const reasonMatch = notes.match(
            /Razlog dolaska:\s*([\s\S]*?)(?=\n\nNalaz:|\n\nPreporuka veterinara:|$)/,
          );

          const findingsMatch = notes.match(
            /Nalaz:\s*([\s\S]*?)(?=\n\nPreporuka veterinara:|$)/,
          );

          const recommendationMatch = notes.match(
            /Preporuka veterinara:\s*([\s\S]*)$/,
          );

          if (reasonMatch) {
            reason = reasonMatch[1].trim();
          }

          if (findingsMatch) {
            findings = findingsMatch[1].trim();
          }

          if (recommendationMatch) {
            recommendation = recommendationMatch[1].trim();
          }
        }

        /*
         * Popunjavanje forme
         */
        form.setFieldsValue({
          date: visit.date ? dayjs(visit.date) : null,
          type: visit.title || undefined,
          vet: visit.vet || "",
          reason,
          findings,
          diagnosis: visit.diagnosis || "",
          recommendation,
        });
      } catch (error: any) {
        console.error("Greška pri učitavanju veterinarskog pregleda:", error);

        if (error?.status === 404) {
          messageApi.error("Veterinarski pregled nije pronađen.");
        } else if (error?.status === 403) {
          messageApi.error("Nemaš dozvolu za pristup ovom pregledu.");
        } else {
          messageApi.error("Došlo je do greške prilikom učitavanja pregleda.");
        }

        router.push(`/dashboard/profile/${petId}`);
      } finally {
        setLoadingEdit(false);
      }
    };

    loadVisit();
  }, [editId, petId, form, messageApi, router]);

  /*
   * Čuvanje pregleda
   *
   * CREATE:
   * /visits/add
   *
   * UPDATE:
   * /visits/add?edit=ID
   */
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
       * i pripada trenutno prijavljenom korisniku.
       */
      const pet = await pb.collection("pets").getOne(petId);

      const currentUserId = pb.authStore.record?.id;

      if (pet.owner !== currentUserId) {
        messageApi.error(
          isEditMode
            ? "Nemaš dozvolu da izmeniš pregled ovog ljubimca."
            : "Nemaš dozvolu da dodaš pregled ovom ljubimcu.",
        );
        return;
      }

      /*
       * Datum
       */
      const date = values.date ? values.date.format("YYYY-MM-DD") : null;

      /*
       * Razlog + nalaz + preporuka
       * čuvamo u notes polju.
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
       * Podaci za PocketBase
       */
      const visitData = {
        pet: petId,
        date,
        title: values.type || "",
        vet: values.vet || "",
        description: values.findings || "",
        diagnosis: values.diagnosis || "",
        notes,
      };

      /*
       * IZMENI
       */
      if (editId) {
        /*
         * Još jednom proveravamo da zapis
         * pripada ovom ljubimcu.
         */
        const existingVisit = await pb.collection("visits").getOne(editId);

        if (existingVisit.pet !== petId) {
          messageApi.error("Ovaj pregled ne pripada izabranom ljubimcu.");
          return;
        }

        await pb.collection("visits").update(editId, visitData);

        messageApi.success("Veterinarski pregled je uspešno izmenjen!");
      } else {
        /*
         * DODAVANJE
         */
        await pb.collection("visits").create(visitData);

        messageApi.success("Veterinarski pregled je uspešno dodat!");
      }

      /*
       * Povratak na e-karton
       */
      setTimeout(() => {
        router.push(`/dashboard/profile/${petId}`);
        router.refresh();
      }, 700);
    } catch (error: any) {
      console.error(
        isEditMode
          ? "Greška pri izmeni veterinarskog pregleda:"
          : "Greška pri dodavanju veterinarskog pregleda:",
        error,
      );

      if (error?.name === "AbortError") {
        return;
      }

      if (error?.status === 400) {
        messageApi.error("Podaci nisu ispravni. Proveri sva obavezna polja.");
        return;
      }

      if (error?.status === 403) {
        messageApi.error(
          isEditMode
            ? "Nemaš dozvolu za izmenu pregleda."
            : "Nemaš dozvolu za dodavanje pregleda.",
        );
        return;
      }

      if (error?.status === 404) {
        messageApi.error("Veterinarski pregled nije pronađen.");
        return;
      }

      messageApi.error(
        isEditMode
          ? "Došlo je do greške prilikom izmene pregleda."
          : "Došlo je do greške prilikom dodavanja pregleda.",
      );
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
          disabled={saving}
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
            <span className={styles.eyebrow}>E-KARTON • ZDRAVLJE</span>

            <h1>
              {isEditMode
                ? "Izmena veterinarskog pregleda"
                : "Novi veterinarski pregled"}
            </h1>

            <p>
              {isEditMode
                ? "Izmeni podatke o veterinarskom pregledu i zdravstvenom stanju ljubimca."
                : "Unesi podatke o pregledu i zdravstvenom stanju ljubimca."}
            </p>
          </div>
        </section>

        {/* FORM */}

        <section className={styles.card}>
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            disabled={loadingEdit}
          >
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
                disabled={loadingEdit}
                onClick={handleSubmit}
              >
                {isEditMode ? "Sačuvaj izmene" : "Sačuvaj pregled"}
              </Button>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
