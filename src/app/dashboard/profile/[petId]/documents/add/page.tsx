"use client";

import {
  ArrowLeftOutlined,
  CheckOutlined,
  FileTextOutlined,
  UploadOutlined,
} from "@ant-design/icons";

import { Button, Form, Input, Select, Upload, message } from "antd";

import type { UploadProps } from "antd";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import pb from "@/app/lib/pocketbase";

import styles from "./AddDocument.module.css";

const { TextArea } = Input;

export default function AddDocumentPage() {
  const router = useRouter();
  const params = useParams();

  const petId = params.petId as string;

  const [form] = Form.useForm();

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  const [saving, setSaving] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();

  const uploadProps: UploadProps = {
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
    maxCount: 1,
    showUploadList: false,

    beforeUpload: (selectedFile) => {
      setFile(selectedFile);
      setFileName(selectedFile.name);

      return false;
    },
  };

  const submitDocument = async () => {
    try {
      // Provera forme
      const values = await form.validateFields();

      // Provera fajla
      if (!file) {
        messageApi.error("Dodaj dokument.");
        return;
      }

      // Provera PocketBase sesije
      if (!pb.authStore.isValid) {
        messageApi.error("Sesija je istekla.");
        router.push("/login");
        return;
      }

      setSaving(true);

      const formData = new FormData();

      // Veza sa ljubimcem
      formData.append("pet", petId);

      // Podaci dokumenta
      formData.append("name", values.name);
      formData.append("type", values.type);

      // Fajl
      formData.append("file", file);

      // Napomena je opciona
      if (values.notes?.trim()) {
        formData.append("notes", values.notes.trim());
      }

      console.log("Šaljem dokument:", {
        pet: petId,
        name: values.name,
        type: values.type,
        file: file.name,
        notes: values.notes,
      });

      // Kreiranje dokumenta u PocketBase-u
      await pb.collection("documents").create(formData);

      messageApi.success("Dokument je uspešno dodat.");

      setTimeout(() => {
        router.push(`/dashboard/profile/${petId}`);
      }, 800);
    } catch (error: any) {
      console.error("Greška pri dodavanju dokumenta:", error);

      // PocketBase response
      console.log("PocketBase response:", error?.response);
      console.log("PocketBase data:", error?.response?.data);

      // PocketBase validation errors
      const validationData = error?.response?.data;

      if (validationData) {
        console.table(validationData);
      }

      // Prikaži korisniku konkretnu grešku
      if (validationData?.file?.message) {
        messageApi.error(validationData.file.message);
      } else if (validationData?.type?.message) {
        messageApi.error(validationData.type.message);
      } else if (validationData?.pet?.message) {
        messageApi.error(validationData.pet.message);
      } else if (validationData?.name?.message) {
        messageApi.error(validationData.name.message);
      } else {
        messageApi.error(
          error?.message || "Došlo je do greške pri dodavanju dokumenta.",
        );
      }
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
          <span className={styles.eyebrow}>E-KARTON LJUBIMCA</span>

          <h1>Dodaj dokument</h1>

          <p>
            Dodaj veterinarski dokument, nalaz, račun ili drugi dokument povezan
            sa ljubimcem.
          </p>
        </section>

        {/* FORM CARD */}

        <section className={styles.formCard}>
          {/* TITLE */}

          <div className={styles.titleRow}>
            <div className={styles.titleIcon}>
              <FileTextOutlined />
            </div>

            <div>
              <h2>Informacije o dokumentu</h2>

              <p>Unesi osnovne podatke i dodaj fajl dokumenta.</p>
            </div>
          </div>

          <Form form={form} layout="vertical" requiredMark="optional">
            {/* NAME */}

            <Form.Item
              label="Naziv dokumenta"
              name="name"
              rules={[
                {
                  required: true,
                  message: "Unesi naziv dokumenta.",
                },
              ]}
            >
              <Input size="large" placeholder="npr. Nalaz krvi" />
            </Form.Item>

            {/* TYPE */}

            <Form.Item
              label="Tip dokumenta"
              name="type"
              rules={[
                {
                  required: true,
                  message: "Izaberi tip dokumenta.",
                },
              ]}
            >
              <Select
                placeholder="Izaberi tip dokumenta"
                size="large"
                options={[
                  {
                    value: "medical_record",
                    label: "Medicinski karton",
                  },
                  {
                    value: "passport",
                    label: "Pasoš",
                  },
                  {
                    value: "lab_result",
                    label: "Laboratorijski rezultat",
                  },
                  {
                    value: "invoice",
                    label: "Račun",
                  },
                  {
                    value: "other",
                    label: "Ostalo",
                  },
                ]}
              />
            </Form.Item>

            {/* NOTES */}

            <Form.Item label="Napomena" name="notes">
              <TextArea
                rows={5}
                placeholder="Dodaj dodatne informacije o dokumentu..."
              />
            </Form.Item>

            {/* FILE */}

            <Form.Item label="Dokument" required>
              <Upload {...uploadProps}>
                <div className={styles.uploadBox}>
                  <div className={styles.uploadIcon}>
                    <UploadOutlined />
                  </div>

                  <strong>{fileName || "Dodaj dokument"}</strong>

                  <span>Klikni ovde ili prevuci fajl</span>

                  <small>PDF, JPG, PNG ili WEBP</small>
                </div>
              </Upload>
            </Form.Item>

            {/* ACTIONS */}

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
                icon={<CheckOutlined />}
                loading={saving}
                onClick={submitDocument}
              >
                Sačuvaj dokument
              </Button>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
