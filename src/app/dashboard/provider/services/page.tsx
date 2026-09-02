"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Switch,
  Tag,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import pb from "@/app/lib/pocketbase";
import styles from "./ProviderServices.module.css";

interface Service {
  id: string;
  location: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  active?: boolean;
}

interface Location {
  id: string;
  name: string;
  type?: string;
}

interface ServiceFormValues {
  name: string;
  description?: string;
  duration: number;
  price: number;
}

export default function ProviderServicesPage() {
  const router = useRouter();

  const [messageApi, contextHolder] = message.useMessage();

  const [form] = Form.useForm<ServiceFormValues>();

  const [location, setLocation] = useState<Location | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // =========================================
  // UČITAVANJE PODATAKA
  // =========================================

  const fetchData = async () => {
    try {
      setLoading(true);

      const userId = pb.authStore.model?.id;

      if (!userId) {
        router.push("/login");
        return;
      }

      // Pronađi objekat trenutno ulogovanog providera
      const locationResult = await pb
        .collection("locations")
        .getList<Location>(1, 1, {
          filter: `owner = "${userId}"`,
          requestKey: null,
        });

      if (locationResult.items.length === 0) {
        setLocation(null);
        setServices([]);
        return;
      }

      const currentLocation = locationResult.items[0];

      setLocation(currentLocation);

      // Učitaj usluge samo za ovaj objekat
      const serviceResult = await pb
        .collection("services")
        .getFullList<Service>({
          filter: `location = "${currentLocation.id}"`,
          sort: "name",
          requestKey: null,
        });

      setServices(serviceResult);
    } catch (error) {
      console.error("Greška pri učitavanju usluga:", error);

      messageApi.error("Greška pri učitavanju usluga.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // =========================================
  // DODAVANJE NOVE USLUGE
  // =========================================

  const openAddModal = () => {
    setEditingService(null);
    setModalOpen(true);
  };

  // =========================================
  // EDIT USLUGE
  // =========================================

  const openEditModal = (service: Service) => {
    setEditingService(service);

    form.setFieldsValue({
      name: service.name,
      description: service.description || "",
      duration: Number(service.duration),
      price: Number(service.price),
    });

    setModalOpen(true);
  };

  // =========================================
  // RESET FORME
  // =========================================

  const closeModal = () => {
    setModalOpen(false);
    setEditingService(null);
  };

  // =========================================
  // SAČUVAJ USLUGU
  // =========================================

  const handleSubmit = async (values: ServiceFormValues) => {
    if (!location) {
      messageApi.error("Objekat nije pronađen.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        location: location.id,
        name: values.name.trim(),
        description: values.description?.trim() || "",
        duration: Number(values.duration),
        price: Number(values.price),
      };

      // =====================================
      // EDIT POSTOJEĆE USLUGE
      // =====================================

      if (editingService) {
        await pb.collection("services").update(editingService.id, payload);

        messageApi.success("Usluga je uspešno izmenjena.");
      }

      // =====================================
      // DODAVANJE NOVE USLUGE
      // =====================================
      else {
        await pb.collection("services").create({
          ...payload,
          active: true,
        });

        messageApi.success("Nova usluga je uspešno dodata.");
      }

      closeModal();

      await fetchData();
    } catch (error) {
      console.error("Greška pri čuvanju usluge:", error);

      messageApi.error("Greška pri čuvanju usluge.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================
  // BRISANJE USLUGE
  // =========================================

  const handleDelete = async (serviceId: string) => {
    try {
      await pb.collection("services").delete(serviceId);

      messageApi.success("Usluga je obrisana.");

      await fetchData();
    } catch (error) {
      console.error("Greška pri brisanju:", error);

      messageApi.error("Greška pri brisanju usluge.");
    }
  };

  // =========================================
  // AKTIVIRAJ / DEAKTIVIRAJ
  // =========================================

  const handleToggleActive = async (service: Service, active: boolean) => {
    try {
      await pb.collection("services").update(service.id, {
        active,
      });

      messageApi.success(
        active ? "Usluga je aktivirana." : "Usluga je deaktivirana.",
      );

      setServices((prev) =>
        prev.map((item) =>
          item.id === service.id ? { ...item, active } : item,
        ),
      );
    } catch (error) {
      console.error("Greška pri promeni statusa:", error);

      messageApi.error("Greška pri promeni statusa.");
    }
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>...</div>

        <p>Učitavanje usluga...</p>
      </div>
    );
  }

  // =========================================
  // NEMA OBJEKTA
  // =========================================

  if (!location) {
    return (
      <div className={styles.emptyState}>
        <h2>Objekat nije pronađen</h2>

        <p>Vaš nalog nije povezan sa business objektom.</p>

        <Button
          type="primary"
          onClick={() => router.push("/dashboard/provider")}
        >
          Nazad
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

      {/* HEADER */}

      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>BUSINESS</div>

          <h1>Usluge i cenovnik</h1>

          <p>Dodajte i upravljajte uslugama koje nudite svojim klijentima.</p>
        </div>

        <Button onClick={() => router.push("/dashboard/provider")}>
          ← Nazad
        </Button>
      </div>

      {/* STATISTIKA */}

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <CheckCircleOutlined />
          </div>

          <div>
            <span>Aktivne usluge</span>

            <strong>
              {services.filter((service) => service.active !== false).length}
            </strong>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <ClockCircleOutlined />
          </div>

          <div>
            <span>Ukupno usluga</span>

            <strong>{services.length}</strong>
          </div>
        </div>
      </div>

      {/* SERVICES HEADER */}

      <div className={styles.servicesHeader}>
        <div>
          <h2>Vaše usluge</h2>

          <p>Klijenti će videti samo aktivne usluge prilikom zakazivanja.</p>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={openAddModal}
        >
          Dodaj uslugu
        </Button>
      </div>

      {/* EMPTY */}

      {services.length === 0 && (
        <Card className={styles.emptyServices}>
          <div className={styles.emptyIcon}>✨</div>

          <h3>Još nemate nijednu uslugu</h3>

          <p>Dodajte prvu uslugu kako bi korisnici mogli da je zakažu.</p>

          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            Dodaj prvu uslugu
          </Button>
        </Card>
      )}

      {/* SERVICES */}

      <div className={styles.servicesGrid}>
        {services.map((service) => {
          const isActive = service.active !== false;

          return (
            <Card
              key={service.id}
              className={`${styles.serviceCard} ${
                !isActive ? styles.inactiveCard : ""
              }`}
            >
              <div className={styles.serviceTop}>
                <div className={styles.serviceIcon}>🐾</div>

                <Tag color={isActive ? "green" : "default"}>
                  {isActive ? "AKTIVNA" : "NEAKTIVNA"}
                </Tag>
              </div>

              <h3>{service.name}</h3>

              <p className={styles.description}>
                {service.description || "Nema opisa usluge."}
              </p>

              <div className={styles.serviceMeta}>
                <div>
                  <ClockCircleOutlined />

                  <span>{service.duration} min</span>
                </div>

                <div>
                  <DollarOutlined />

                  <strong>
                    {Number(service.price).toLocaleString("sr-RS")} RSD
                  </strong>
                </div>
              </div>

              <div className={styles.serviceActions}>
                <div className={styles.activeToggle}>
                  <Switch
                    checked={isActive}
                    onChange={(checked) => handleToggleActive(service, checked)}
                  />

                  <span>{isActive ? "Aktivna" : "Deaktivirana"}</span>
                </div>

                <div className={styles.buttons}>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(service)}
                  >
                    Izmeni
                  </Button>

                  <Popconfirm
                    title="Obrisati uslugu?"
                    description="Ova radnja se ne može poništiti."
                    okText="Obriši"
                    cancelText="Otkaži"
                    okButtonProps={{
                      danger: true,
                    }}
                    onConfirm={() => handleDelete(service.id)}
                  >
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* MODAL */}

      <Modal
        title={editingService ? "Izmeni uslugu" : "Dodaj novu uslugu"}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (!open) {
            form.resetFields();
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          {/* NAZIV */}

          <Form.Item
            name="name"
            label="Naziv usluge"
            rules={[
              {
                required: true,
                message: "Unesite naziv usluge.",
              },
              {
                min: 2,
                message: "Naziv mora imati najmanje 2 karaktera.",
              },
            ]}
          >
            <Input size="large" placeholder="npr. Opšti pregled" />
          </Form.Item>

          {/* OPIS */}

          <Form.Item name="description" label="Opis usluge">
            <Input.TextArea
              rows={4}
              placeholder="Opišite uslugu..."
              showCount
              maxLength={500}
            />
          </Form.Item>

          {/* TRAJANJE */}

          <Form.Item
            name="duration"
            label="Trajanje"
            rules={[
              {
                required: true,
                message: "Unesite trajanje.",
              },
              {
                type: "number",
                min: 5,
                max: 480,
                message: "Trajanje mora biti između 5 i 480 minuta.",
              },
            ]}
          >
            <InputNumber
              size="large"
              min={5}
              max={480}
              addonAfter="min"
              style={{
                width: "100%",
              }}
              placeholder="30"
            />
          </Form.Item>

          {/* CENA */}

          <Form.Item
            name="price"
            label="Cena"
            rules={[
              {
                required: true,
                message: "Unesite cenu.",
              },
              {
                type: "number",
                min: 0,
                message: "Cena ne može biti negativna.",
              },
            ]}
          >
            <InputNumber
              size="large"
              min={0}
              addonAfter="RSD"
              style={{
                width: "100%",
              }}
              placeholder="2500"
            />
          </Form.Item>

          {/* SAVE */}

          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            block
            size="large"
          >
            {editingService ? "Sačuvaj izmene" : "Dodaj uslugu"}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
