"use client";

import {
  ArrowLeftOutlined,
  CameraOutlined,
  CheckOutlined,
  HeartOutlined,
  IdcardOutlined,
  UserOutlined,
} from "@ant-design/icons";

import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Upload,
  message,
  Space,
} from "antd";

import type { UploadProps } from "antd";
import dayjs from "dayjs";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import pb from "@/app/lib/pocketbase";

import styles from "./EditPet.module.css";

const { TextArea } = Input;

type Pet = {
  id: string;
  name: string;
  type: "dog" | "cat" | "bird" | "rabbit" | "other";
  breed?: string;
  gender?: "male" | "female";
  birthday?: string;
  weight?: number;
  microchip?: string;
  color?: string;
  neutered?: boolean;
  image?: string;
  owner?: string;
  allergies?: string;
  healthNotes?: string;
};

type FormValues = {
  name: string;
  type: Pet["type"];
  breed?: string;
  gender?: Pet["gender"];
  birthday?: dayjs.Dayjs;
  color?: string;
  weight?: number;
  microchip?: string;
  neutered?: boolean;
  allergies?: string;
  healthNotes?: string;
};

export default function EditPetPage() {
  const router = useRouter();
  const params = useParams();

  const petId = params.petId as string;

  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  /*
   * LOAD PET
   */
  useEffect(() => {
    const loadPet = async () => {
      try {
        if (!pb.authStore.isValid) {
          router.push("/dashboard/profile");
          return;
        }

        if (!petId) {
          setPet(null);
          return;
        }

        const currentUserId = pb.authStore.record?.id;

        const record = await pb.collection("pets").getOne<Pet>(petId);

        /*
         * Provera vlasnika
         */
        if (record.owner !== currentUserId) {
          console.error("Ljubimac ne pripada trenutnom korisniku.");

          setPet(null);
          return;
        }

        setPet(record);

        /*
         * PET IMAGE
         */
        if (record.image) {
          setImageUrl(pb.files.getURL(record as any, record.image));
        }

        /*
         * FORM VALUES
         */
        form.setFieldsValue({
          name: record.name || "",
          type: record.type || "other",
          breed: record.breed || "",
          gender: record.gender,
          birthday: record.birthday ? dayjs(record.birthday) : undefined,
          color: record.color || "",
          weight: record.weight,
          microchip: record.microchip || "",
          neutered: record.neutered ?? false,
          allergies: record.allergies || "",
          healthNotes: record.healthNotes || "",
        });
      } catch (error: any) {
        if (
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError"
        ) {
          return;
        }

        console.error("Greška pri učitavanju ljubimca:", error);

        setPet(null);
      } finally {
        setLoading(false);
      }
    };

    loadPet();
  }, [petId, router, form]);

  /*
   * IMAGE UPLOAD
   */
  const uploadProps: UploadProps = {
    accept: "image/*",
    showUploadList: false,

    beforeUpload: (file) => {
      setImageUrl(URL.createObjectURL(file));

      return false;
    },
  };

  /*
   * SAVE
   */
  const handleSave = async () => {
    try {
      if (!pet) {
        return;
      }

      const values = await form.validateFields();

      setSaving(true);

      /*
       * PocketBase update data
       */
      const data = {
        name: values.name,
        type: values.type,
        breed: values.breed || "",
        gender: values.gender || "",
        birthday: values.birthday ? values.birthday.format("YYYY-MM-DD") : "",
        color: values.color || "",
        weight: values.weight !== undefined ? values.weight : null,
        microchip: values.microchip || "",
        neutered: values.neutered ?? false,
        allergies: values.allergies || "",
        healthNotes: values.healthNotes || "",
      };

      console.log("Ažuriranje ljubimca:", {
        petId,
        data,
      });

      /*
       * UPDATE PET
       */
      const updatedPet = await pb.collection("pets").update<Pet>(petId, data);

      /*
       * Ako želiš da upload fotografije
       * takođe bude sačuvan u PocketBase-u,
       * radićemo to preko FormData.
       *
       * Za sada čuvamo samo podatke.
       */

      setPet(updatedPet);

      messageApi.success(`${updatedPet.name} je uspešno ažuriran!`);

      setTimeout(() => {
        router.push(`/dashboard/profile/${petId}`);
      }, 800);
    } catch (error: any) {
      console.error("Greška pri čuvanju ljubimca:", error);

      messageApi.error(
        error?.message || "Došlo je do greške prilikom čuvanja izmena.",
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * LOADING
   */
  if (loading) {
    return (
      <main className={styles.page}>
        <section
          style={{
            padding: "80px 20px",
            textAlign: "center",
          }}
        >
          <h1>Učitavanje ljubimca...</h1>

          <p>Molimo sačekaj trenutak.</p>
        </section>
      </main>
    );
  }

  /*
   * NOT FOUND
   */
  if (!pet) {
    return (
      <main className={styles.page}>
        <div className={styles.notFound}>
          <h1>Ljubimac nije pronađen</h1>

          <p>Ovaj ljubimac ne postoji ili nemaš dozvolu da ga izmeniš.</p>

          <Button
            type="primary"
            onClick={() => router.push("/dashboard/profile")}
          >
            Nazad na profil
          </Button>
        </div>
      </main>
    );
  }

  /*
   * PET IMAGE
   */
  const currentPetImage = pet.image
    ? pb.files.getURL(pet as any, pet.image)
    : "";

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
          Nazad na {pet.name} profil
        </button>

        {/* HEADER */}

        <section className={styles.header}>
          <div>
            <span className={styles.eyebrow}>
              E-KARTON • {pet.name.toUpperCase()}
            </span>

            <h1>Izmeni profil ljubimca</h1>

            <p>Ažuriraj osnovne i zdravstvene informacije svog ljubimca.</p>
          </div>
        </section>

        {/* CARD */}

        <section className={styles.card}>
          {/* PHOTO */}

          <div className={styles.photoSection}>
            <Upload {...uploadProps}>
              <div className={styles.avatarWrapper}>
                {imageUrl || currentPetImage ? (
                  <img
                    src={imageUrl || currentPetImage}
                    alt={pet.name}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <UserOutlined />
                  </div>
                )}

                <div className={styles.cameraButton}>
                  <CameraOutlined />
                </div>
              </div>
            </Upload>

            <div>
              <h3>{pet.name}ova fotografija</h3>

              <p>Klikni na fotografiju da je promeniš.</p>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            className={styles.form}
          >
            {/* BASIC DATA */}

            <div className={styles.sectionTitle}>
              <UserOutlined />

              <div>
                <h2>Osnovni podaci</h2>

                <p>Osnovne informacije o ljubimcu</p>
              </div>
            </div>

            <div className={styles.grid}>
              <Form.Item
                label="Ime"
                name="name"
                rules={[
                  {
                    required: true,
                    message: "Unesi ime ljubimca",
                  },
                ]}
              >
                <Input size="large" placeholder="Ime ljubimca" />
              </Form.Item>

              <Form.Item label="Vrsta" name="type">
                <Select
                  size="large"
                  options={[
                    {
                      value: "dog",
                      label: "🐶 Pas",
                    },
                    {
                      value: "cat",
                      label: "🐱 Mačka",
                    },
                    {
                      value: "bird",
                      label: "🐦 Ptica",
                    },
                    {
                      value: "rabbit",
                      label: "🐰 Zec",
                    },
                    {
                      value: "other",
                      label: "🐾 Drugo",
                    },
                  ]}
                />
              </Form.Item>

              <Form.Item label="Rasa" name="breed">
                <Input size="large" placeholder="Rasa" />
              </Form.Item>

              <Form.Item label="Pol" name="gender">
                <Radio.Group size="large">
                  <Radio value="male">Mužjak</Radio>

                  <Radio value="female">Ženka</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item label="Datum rođenja" name="birthday">
                <DatePicker
                  size="large"
                  format="DD.MM.YYYY."
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>

              <Form.Item label="Boja" name="color">
                <Input size="large" placeholder="Boja dlake" />
              </Form.Item>
            </div>

            {/* HEALTH */}

            <div className={styles.sectionTitle}>
              <HeartOutlined />

              <div>
                <h2>Zdravstveni podaci</h2>

                <p>Podaci koji pripadaju e-kartonu</p>
              </div>
            </div>

            <div className={styles.grid}>
              <Form.Item label="Težina" name="weight">
                <Space.Compact
                  style={{
                    width: "100%",
                  }}
                >
                  <InputNumber
                    size="large"
                    min={0}
                    max={300}
                    style={{
                      width: "100%",
                    }}
                  />

                  <Button size="large" disabled>
                    kg
                  </Button>
                </Space.Compact>
              </Form.Item>

              <Form.Item label="Mikročip" name="microchip">
                <Input
                  size="large"
                  prefix={<IdcardOutlined />}
                  placeholder="Broj mikročipa"
                />
              </Form.Item>
            </div>

            <Form.Item label="Sterilizovan / kastriran" name="neutered">
              <Radio.Group size="large">
                <Radio value={true}>Da</Radio>

                <Radio value={false}>Ne</Radio>
              </Radio.Group>
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
                onClick={handleSave}
              >
                Sačuvaj izmene
              </Button>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
