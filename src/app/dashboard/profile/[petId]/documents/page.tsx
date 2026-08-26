"use client";

import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import { Button, Empty, Spin, Tag } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import pb from "@/app/lib/pocketbase";

import styles from "./Documents.module.css";

type Document = {
  id: string;
  pet: string;
  name?: string;
  type?: "medical_record" | "passport" | "lab_result" | "invoice" | "other";
  file?: string;
  notes?: string;
  created?: string;
};

type Pet = {
  id: string;
  name: string;
  owner?: string;
};

const typeNames: Record<NonNullable<Document["type"]>, string> = {
  medical_record: "Medicinski karton",
  passport: "Pasoš",
  lab_result: "Laboratorijski rezultat",
  invoice: "Račun",
  other: "Ostalo",
};

const typeColors: Record<NonNullable<Document["type"]>, string> = {
  medical_record: "red",
  passport: "blue",
  lab_result: "purple",
  invoice: "gold",
  other: "default",
};

function formatDate(date?: string) {
  if (!date) {
    return "-";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("sr-RS");
}

function getFileExtension(fileName?: string) {
  if (!fileName) {
    return "";
  }

  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toUpperCase() : "";
}

export default function DocumentsPage() {
  const router = useRouter();
  const params = useParams();

  const petId = params.petId as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        if (!pb.authStore.isValid) {
          router.push("/login");
          return;
        }

        if (!petId) {
          return;
        }

        const currentUserId = pb.authStore.record?.id;

        /*
         * PET
         */

        const petRecord = await pb.collection("pets").getOne<Pet>(petId);

        if (petRecord.owner !== currentUserId) {
          console.error("Ljubimac ne pripada trenutnom korisniku.");

          setPet(null);
          return;
        }

        setPet(petRecord);

        /*
         * DOCUMENTS
         */

        const documentRecords = await pb
          .collection("documents")
          .getFullList<Document>({
            sort: "-created",
            filter: `pet = "${petId}"`,
          });

        setDocuments(documentRecords);
      } catch (error: any) {
        if (
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError"
        ) {
          return;
        }

        console.error("Greška pri učitavanju dokumenata:", error);

        setPet(null);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [petId, router]);

  /*
   * LOADING
   */

  if (loading) {
    return (
      <main className={styles.page}>
        <button
          className={styles.backButton}
          onClick={() => router.push(`/dashboard/profile/${petId}`)}
        >
          <ArrowLeftOutlined />
          Nazad na e-karton
        </button>

        <section className={styles.loading}>
          <Spin size="large" />

          <h1>Učitavanje dokumenata...</h1>

          <p>Molimo sačekaj trenutak.</p>
        </section>
      </main>
    );
  }

  /*
   * PET NOT FOUND
   */

  if (!pet) {
    return (
      <main className={styles.page}>
        <button
          className={styles.backButton}
          onClick={() => router.push("/dashboard/profile")}
        >
          <ArrowLeftOutlined />
          Nazad na profil
        </button>

        <section className={styles.emptyPage}>
          <h1>Ljubimac nije pronađen</h1>

          <p>
            Ljubimac ne postoji ili nemaš dozvolu da pristupiš njegovim
            dokumentima.
          </p>

          <Button
            type="primary"
            onClick={() => router.push("/dashboard/profile")}
          >
            Nazad na profil
          </Button>
        </section>
      </main>
    );
  }

  return (
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
        <div>
          <span className={styles.eyebrow}>E-KARTON LJUBIMCA</span>

          <h1>Dokumenti</h1>

          <p>
            Svi dokumenti povezani sa ljubimcem <strong>{pet.name}</strong>.
          </p>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() =>
            router.push(`/dashboard/profile/${petId}/documents/add`)
          }
        >
          Dodaj dokument
        </Button>
      </section>

      {/* DOCUMENTS */}

      <section className={styles.documentsCard}>
        {documents.length === 0 ? (
          <div className={styles.empty}>
            <Empty
              image={<FileTextOutlined style={{ fontSize: 64 }} />}
              description={
                <div>
                  <strong>Nema dodatih dokumenata</strong>

                  <p>Dodaj prvi dokument za ovog ljubimca.</p>
                </div>
              }
            />

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                router.push(`/dashboard/profile/${petId}/documents/add`)
              }
            >
              Dodaj prvi dokument
            </Button>
          </div>
        ) : (
          <div className={styles.documentList}>
            {documents.map((document) => {
              const extension = getFileExtension(document.file);

              const fileUrl = document.file
                ? pb.files.getURL(document as any, document.file)
                : null;

              const documentType = document.type || "other";

              return (
                <div className={styles.document} key={document.id}>
                  {/* ICON */}

                  <div className={styles.documentIcon}>
                    {extension === "PDF" ? (
                      <FilePdfOutlined />
                    ) : (
                      <FileTextOutlined />
                    )}
                  </div>

                  {/* INFO */}

                  <div className={styles.documentInfo}>
                    <div className={styles.documentTitle}>
                      <h3>{document.name || "Dokument"}</h3>

                      {document.type && (
                        <Tag color={typeColors[documentType]}>
                          {typeNames[documentType]}
                        </Tag>
                      )}
                    </div>

                    <div className={styles.documentMeta}>
                      <span>Dodat: {formatDate(document.created)}</span>

                      {extension && <span>Format: {extension}</span>}
                    </div>

                    {document.notes && (
                      <p className={styles.notes}>{document.notes}</p>
                    )}
                  </div>

                  {/* ACTION */}

                  {fileUrl && (
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() =>
                        window.open(fileUrl, "_blank", "noopener,noreferrer")
                      }
                    >
                      Otvori
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
