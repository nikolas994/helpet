"use client";

import React, { useEffect, useState } from "react";
import { Button, Card, Form, Input, Select, Spin, message } from "antd";
import {
  EnvironmentOutlined,
  PhoneOutlined,
  SaveOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import pb from "@/app/lib/pocketbase";
import styles from "./ProviderLocation.module.css";

interface Location {
  id: string;
  name: string;
  type?: string;
  address?: string;
  phone?: string;
  owner?: string;
}

interface LocationFormValues {
  name: string;
  type: string;
  address: string;
  phone: string;
}

export default function ProviderLocationPage() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const [form] = Form.useForm<LocationFormValues>();

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // =========================================
  // UČITAVANJE OBJEKTA
  // =========================================

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setLoading(true);

        const userId = pb.authStore.model?.id;

        if (!userId) {
          messageApi.error("Morate biti prijavljeni.");
          router.push("/login");
          return;
        }

        const result = await pb
          .collection("locations")
          .getList<Location>(1, 1, {
            filter: `owner = "${userId}"`,
            requestKey: null,
          });

        if (result.items.length === 0) {
          messageApi.warning("Nemate registrovan objekat.");
          return;
        }

        const currentLocation = result.items[0];

        setLocation(currentLocation);
      } catch (error) {
        console.error("Greška pri učitavanju objekta:", error);

        messageApi.error("Greška pri učitavanju podataka objekta.");
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [form, messageApi, router]);

  // Form je montiran tek nakon što se završi loading stanje.
  // Zato podatke ubacujemo u formu tek kada je location dostupan.
  useEffect(() => {
    if (!location) return;

    form.setFieldsValue({
      name: location.name || "",
      type: location.type || "vet",
      address: location.address || "",
      phone: location.phone || "",
    });
  }, [location, form]);

  // =========================================
  // ČUVANJE IZMENJENIH PODATAKA
  // =========================================

  const handleSave = async (values: LocationFormValues) => {
    if (!location) {
      messageApi.error("Objekat nije pronađen.");
      return;
    }

    try {
      setSaving(true);

      await pb.collection("locations").update(location.id, {
        name: values.name,
        type: values.type,
        address: values.address,
        phone: values.phone,
      });

      // Ažuriramo lokalno stanje
      setLocation({
        ...location,
        ...values,
      });

      messageApi.success("Podaci objekta su uspešno sačuvani!");
    } catch (error) {
      console.error("Greška pri čuvanju objekta:", error);

      messageApi.error("Greška pri čuvanju podataka. Pokušajte ponovo.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />

        <p>Učitavanje podataka objekta...</p>
      </div>
    );
  }

  // =========================================
  // NEMA OBJEKTA
  // =========================================

  if (!location) {
    return (
      <div className={styles.emptyState}>
        <ShopOutlined />

        <h2>Objekat nije pronađen</h2>

        <p>Vaš nalog trenutno nije povezan sa business objektom.</p>

        <Button
          type="primary"
          onClick={() => router.push("/dashboard/provider")}
        >
          Nazad na dashboard
        </Button>
      </div>
    );
  }

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* =====================================
          HEADER
      ===================================== */}

      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>BUSINESS</div>

          <h1>Moj objekat</h1>

          <p>
            Upravljajte osnovnim informacijama o vašem objektu koje vide HELPet
            korisnici.
          </p>
        </div>

        <Button onClick={() => router.push("/dashboard/provider")}>
          ← Nazad
        </Button>
      </div>

      {/* =====================================
          PREVIEW
      ===================================== */}

      <Card className={styles.previewCard}>
        <div className={styles.previewIcon}>
          {location.type === "salon" ? "✂️" : "🩺"}
        </div>

        <div className={styles.previewInfo}>
          <span>
            {location.type === "salon"
              ? "PET GROOMING SALON"
              : "VETERINARSKA ORDINACIJA"}
          </span>

          <h2>{location.name}</h2>

          {location.address && (
            <p>
              <EnvironmentOutlined />
              {location.address}
            </p>
          )}

          {location.phone && (
            <p>
              <PhoneOutlined />
              {location.phone}
            </p>
          )}
        </div>
      </Card>

      {/* =====================================
          FORM
      ===================================== */}

      <Card className={styles.formCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <ShopOutlined />
          </div>

          <div>
            <h2>Informacije o objektu</h2>

            <p>
              Ove informacije će biti prikazane korisnicima na HELPet mapi i
              stranici objekta.
            </p>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          requiredMark={false}
        >
          {/* NAZIV */}

          <Form.Item
            name="name"
            label="Naziv objekta"
            rules={[
              {
                required: true,
                message: "Unesite naziv objekta.",
              },
              {
                min: 2,
                message: "Naziv mora imati najmanje 2 karaktera.",
              },
            ]}
          >
            <Input
              size="large"
              prefix={<ShopOutlined />}
              placeholder="npr. Veterinarska ambulanta Happy Vet"
            />
          </Form.Item>

          {/* TIP */}

          <Form.Item
            name="type"
            label="Tip objekta"
            rules={[
              {
                required: true,
                message: "Izaberite tip objekta.",
              },
            ]}
          >
            <Select
              size="large"
              placeholder="Izaberite tip objekta"
              options={[
                {
                  value: "vet",
                  label: "🩺 Veterinar",
                },
                {
                  value: "salon",
                  label: "✂️ Pet salon",
                },
                {
                  value: "petshop",
                  label: "🛍️ Pet shop",
                },
                {
                  value: "hotel",
                  label: "🏨 Pet hotel",
                },
              ]}
            />
          </Form.Item>

          {/* ADRESA */}

          <Form.Item
            name="address"
            label="Adresa"
            rules={[
              {
                required: true,
                message: "Unesite adresu.",
              },
            ]}
          >
            <Input
              size="large"
              prefix={<EnvironmentOutlined />}
              placeholder="npr. Bulevar Kralja Aleksandra 123, Beograd"
            />
          </Form.Item>

          {/* TELEFON */}

          <Form.Item
            name="phone"
            label="Telefon"
            rules={[
              {
                pattern: /^[0-9+\-() ]{6,20}$/,
                message: "Unesite ispravan broj telefona.",
              },
            ]}
          >
            <Input
              size="large"
              prefix={<PhoneOutlined />}
              placeholder="065 123 4567"
            />
          </Form.Item>

          {/* SAVE */}

          <div className={styles.formFooter}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<SaveOutlined />}
              loading={saving}
            >
              Sačuvaj promene
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
