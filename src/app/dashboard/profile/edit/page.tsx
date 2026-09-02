"use client";

import React, { useEffect, useState } from "react";

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

import pb from "@/app/lib/pocketbase";
import { useAuth } from "@/app/context/AuthContext";

import styles from "./EditProfile.module.css";

/* =========================================================
   TYPES
========================================================= */

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
  location: string;
};

/*
 * PocketBase users record može sadržati dodatna polja
 * koja nisu definisana u AuthUser tipu.
 */
type PocketBaseUser = {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  contact?: string;
  location?: string;
};

/* =========================================================
   PAGE
========================================================= */

export default function EditProfilePage() {
  const router = useRouter();

  const { user } = useAuth();

  const [form] = Form.useForm<ProfileFormValues>();

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();

  /* =========================================================
     USER
  ========================================================= */

  const currentUser = user as PocketBaseUser | null;

  /* =========================================================
     UČITAVANJE POSTOJEĆIH PODATAKA
  ========================================================= */

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const fullName = currentUser.name?.trim() || "";

    const nameParts = fullName.split(/\s+/);

    const firstName = nameParts.shift() || "";

    const lastName = nameParts.join(" ");

    form.setFieldsValue({
      firstName,
      lastName,
      email: currentUser.email || "",
      contact: currentUser.contact || "",
      location: currentUser.location || "",
    });

    /*
     * Ako korisnik već ima avatar,
     * prikaži ga odmah.
     */

    if (currentUser.avatar && currentUser.id) {
      const avatarUrl = pb.files.getURL(currentUser as any, currentUser.avatar);

      setImageUrl(avatarUrl);
    }
  }, [currentUser, form]);

  /* =========================================================
     AKO NIJE PRIJAVLJEN
  ========================================================= */

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  /* =========================================================
     UPLOAD AVATARA
  ========================================================= */

  const uploadProps: UploadProps = {
    accept: "image/*",

    showUploadList: false,

    beforeUpload: (file) => {
      /*
       * Provera tipa fajla
       */

      if (!file.type.startsWith("image/")) {
        messageApi.error("Možeš izabrati samo sliku.");

        return Upload.LIST_IGNORE;
      }

      /*
       * Provera veličine
       */

      const maxSize = 5 * 1024 * 1024;

      if (file.size > maxSize) {
        messageApi.error("Slika može imati maksimalno 5 MB.");

        return Upload.LIST_IGNORE;
      }

      setAvatarFile(file);

      /*
       * Prethodni preview URL
       */

      setImageUrl(URL.createObjectURL(file));

      return false;
    },
  };

  /* =========================================================
     ČUVANJE PROFILA
  ========================================================= */

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      /*
       * Provera PocketBase autentifikacije
       */

      if (!pb.authStore.isValid || !pb.authStore.record?.id) {
        messageApi.error("Nisi prijavljen.");

        router.push("/login");

        return;
      }

      setSaving(true);

      const userId = pb.authStore.record.id;

      /*
       * Spajamo ime i prezime.
       */

      const fullName = `${values.firstName} ${values.lastName}`
        .trim()
        .replace(/\s+/g, " ");

      /*
       * FormData zato što eventualno šaljemo i avatar.
       */

      const formData = new FormData();

      formData.append("name", fullName);

      formData.append("email", values.email);

      formData.append("contact", values.contact || "");

      formData.append("location", values.location || "");

      /*
       * Avatar šaljemo samo ako je izabrana nova slika.
       */

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      console.log("ŠALJEM PROFILE UPDATE:", {
        userId,
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
       * Vraćamo korisnika na profil.
       */

      setTimeout(() => {
        router.push("/dashboard/profile");
      }, 700);
    } catch (error: any) {
      console.error("GREŠKA PRI ČUVANJU PROFILA:", error);

      /*
       * Ant Design validation error.
       */

      if (error?.errorFields) {
        return;
      }

      console.error("PocketBase response:", error?.response);

      const responseData = error?.response?.data;

      /*
       * Ako PocketBase vrati grešku po fieldovima,
       * pokušavamo da prikažemo konkretan problem.
       */

      if (responseData && typeof responseData === "object") {
        console.error("PocketBase field errors:", responseData);
      }

      messageApi.error(
        error?.response?.message ||
          error?.message ||
          "Došlo je do greške pri čuvanju profila.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     LOADING / UNAUTHENTICATED
  ========================================================= */

  if (!user) {
    return (
      <>
        {contextHolder}

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
      </>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      {contextHolder}

      <main className={styles.page}>
        {/* =====================================================
            BACK
        ===================================================== */}

        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push("/dashboard/profile")}
        >
          <ArrowLeftOutlined />
          Nazad na profil
        </button>

        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className={styles.header}>
          <span className={styles.eyebrow}>MOJ PROFIL</span>

          <h1>Izmeni profil</h1>

          <p>
            Ažuriraj svoje lične podatke i informacije koje želiš da budu
            prikazane na profilu.
          </p>
        </section>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <section className={styles.card}>
          {/* ===================================================
              PROFILE IMAGE
          =================================================== */}

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

              <p>
                JPG, PNG ili WEBP. Maksimalno 5 MB. Preporučujemo kvadratnu
                fotografiju.
              </p>
            </div>
          </div>

          {/* ===================================================
              FORM
          =================================================== */}

          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            className={styles.form}
          >
            {/* =================================================
                IME / PREZIME
            ================================================= */}

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

            {/* =================================================
                EMAIL / CONTACT
            ================================================= */}

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

            {/* =================================================
                LOCATION
            ================================================= */}

            <Form.Item label="Lokacija" name="location">
              <Input
                size="large"
                prefix={<EnvironmentOutlined />}
                placeholder="Beograd"
              />
            </Form.Item>

            {/* =================================================
                ACTIONS
            ================================================= */}

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
