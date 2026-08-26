"use client";

import {
  ArrowLeftOutlined,
  CameraOutlined,
  CheckOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { Button, Form, Input, Upload, message } from "antd";
import type { UploadProps } from "antd";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import pb from "@/app/lib/pocketbase";
import { useAuth } from "@/app/context/AuthContext";

import styles from "./EditProfile.module.css";

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
  location: string;
};

export default function EditProfilePage() {
  const router = useRouter();

  const { user, initialized } = useAuth();

  const [form] = Form.useForm<ProfileFormValues>();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();

  /*
   * =========================================================
   * UČITAVANJE POSTOJEĆIH PODATAKA
   * =========================================================
   */

  useEffect(() => {
    if (!initialized || !user) {
      return;
    }

    const fullName = user.name?.trim() || "";

    const nameParts = fullName.split(" ");

    const firstName = nameParts.shift() || "";
    const lastName = nameParts.join(" ");

    form.setFieldsValue({
      firstName,
      lastName,
      email: user.email || "",
      contact: user.contact || "",
      location: user.location || "",
    });

    /*
     * Ako korisnik već ima avatar,
     * prikaži ga odmah.
     */

    if (user.avatar && user.id) {
      const avatarUrl = pb.files.getURL(user as any, user.avatar);

      setImageUrl(avatarUrl);
    }
  }, [initialized, user, form]);

  /*
   * =========================================================
   * UPLOAD AVATARA
   * =========================================================
   */

  const uploadProps: UploadProps = {
    accept: "image/*",
    showUploadList: false,

    beforeUpload: (file) => {
      setAvatarFile(file);

      const previewUrl = URL.createObjectURL(file);

      setImageUrl(previewUrl);

      return false;
    },
  };

  /*
   * =========================================================
   * ČUVANJE
   * =========================================================
   */

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (!pb.authStore.isValid || !pb.authStore.record?.id) {
        messageApi.error("Nisi prijavljen.");
        return;
      }

      setSaving(true);

      const userId = pb.authStore.record.id;

      /*
       * Spajamo ime i prezime u PocketBase "name" field.
       */

      const fullName = `${values.firstName} ${values.lastName}`
        .trim()
        .replace(/\s+/g, " ");

      /*
       * FormData je praktičniji jer možemo
       * istovremeno poslati tekst i avatar.
       */

      const formData = new FormData();

      formData.append("name", fullName);
      formData.append("email", values.email);
      formData.append("contact", values.contact || "");
      formData.append("location", values.location || "");

      /*
       * Avatar šaljemo samo ako je korisnik
       * izabrao novu sliku.
       */

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      console.log("ŠALJEM PROFILE UPDATE:", {
        name: fullName,
        email: values.email,
        contact: values.contact,
        location: values.location,
        avatar: avatarFile?.name || "nije promenjen",
      });

      /*
       * UPDATE POCKETBASE
       */

      const updatedUser = await pb.collection("users").update(userId, formData);

      console.log("POCKETBASE UPDATED USER:", updatedUser);

      /*
       * Osvežavamo authStore.
       */

      pb.authStore.save(pb.authStore.token, updatedUser);

      messageApi.success("Profil je uspešno sačuvan!");

      /*
       * Malo sačekamo da korisnik vidi poruku.
       */

      setTimeout(() => {
        router.push("/dashboard/profile");
      }, 700);
    } catch (error: any) {
      console.error("GREŠKA PRI ČUVANJU PROFILA:", error);

      if (error?.errorFields) {
        return;
      }

      /*
       * PocketBase greška često ima response.data
       * sa konkretnim problemom po fieldovima.
       */

      console.error("PocketBase response:", error?.response);

      messageApi.error(
        error?.response?.message ||
          error?.message ||
          "Došlo je do greške pri čuvanju profila.",
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * =========================================================
   * PRE RENDEROVANJA
   * =========================================================
   *
   * Ovo je bitno zbog hydration problema.
   */

  if (!initialized) {
    return (
      <main className={styles.page}>
        <div
          style={{
            minHeight: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
          }}
        >
          Učitavanje profila...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div
          style={{
            minHeight: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Button type="primary" onClick={() => router.push("/login")}>
            Prijavi se
          </Button>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <>
      {contextHolder}

      <main className={styles.page}>
        {/* BACK */}

        <button
          className={styles.backButton}
          onClick={() => router.push("/dashboard/profile")}
        >
          <ArrowLeftOutlined />
          Nazad na profil
        </button>

        {/* HEADER */}

        <section className={styles.header}>
          <span className={styles.eyebrow}>MOJ PROFIL</span>

          <h1>Izmeni profil</h1>

          <p>
            Ažuriraj svoje lične podatke i informacije koje želiš da budu
            prikazane na profilu.
          </p>
        </section>

        {/* CONTENT */}

        <section className={styles.card}>
          {/* PROFILE IMAGE */}

          <div className={styles.avatarSection}>
            <Upload {...uploadProps}>
              <div className={styles.avatarWrapper}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Profilna slika"
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
              <h3>Profilna slika</h3>

              <p>JPG, PNG ili WEBP. Preporučujemo kvadratnu fotografiju.</p>
            </div>
          </div>

          {/* FORM */}

          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            className={styles.form}
          >
            {/* IME / PREZIME */}

            <div className={styles.grid}>
              <Form.Item
                label="Ime"
                name="firstName"
                rules={[
                  {
                    required: true,
                    message: "Unesi ime",
                  },
                ]}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined />}
                  placeholder="Ime"
                />
              </Form.Item>

              <Form.Item label="Prezime" name="lastName">
                <Input size="large" placeholder="Prezime" />
              </Form.Item>
            </div>

            {/* EMAIL / CONTACT */}

            <div className={styles.grid}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  {
                    required: true,
                    message: "Unesi email",
                  },
                  {
                    type: "email",
                    message: "Email nije ispravan",
                  },
                ]}
              >
                <Input
                  size="large"
                  prefix={<MailOutlined />}
                  placeholder="email@example.com"
                />
              </Form.Item>

              <Form.Item label="Kontakt" name="contact">
                <Input
                  size="large"
                  prefix={<PhoneOutlined />}
                  placeholder="+381..."
                />
              </Form.Item>
            </div>

            {/* LOCATION */}

            <Form.Item label="Lokacija" name="location">
              <Input
                size="large"
                prefix={<EnvironmentOutlined />}
                placeholder="Beograd"
              />
            </Form.Item>

            {/* ACTIONS */}

            <div className={styles.actions}>
              <Button
                size="large"
                onClick={() => router.push("/dashboard/profile")}
                disabled={saving}
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
