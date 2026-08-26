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
  Space,
  Steps,
  Upload,
  message,
} from "antd";

import type { UploadProps } from "antd";
import type { RcFile } from "antd/es/upload";

import { useRouter } from "next/navigation";
import { useState } from "react";

import pb from "@/app/lib/pocketbase";

import styles from "./AddPet.module.css";

const { TextArea } = Input;

export default function AddPetPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);

  const [form] = Form.useForm();

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<RcFile | null>(null);

  const [saving, setSaving] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();

  const steps = [
    {
      title: "Osnovni podaci",
      icon: <UserOutlined />,
    },
    {
      title: "Zdravlje",
      icon: <HeartOutlined />,
    },
    {
      title: "Fotografija",
      icon: <CameraOutlined />,
    },
    {
      title: "Potvrda",
      icon: <CheckOutlined />,
    },
  ];

  /*
   * IMAGE UPLOAD
   */

  const uploadProps: UploadProps = {
    accept: "image/jpeg,image/png,image/webp",
    showUploadList: false,

    beforeUpload: (file) => {
      const isImage =
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.type === "image/webp";

      if (!isImage) {
        messageApi.error("Dozvoljene su samo JPG, PNG i WEBP slike.");
        return Upload.LIST_IGNORE;
      }

      const isUnder5MB = file.size / 1024 / 1024 < 5;

      if (!isUnder5MB) {
        messageApi.error("Fotografija mora biti manja od 5 MB.");
        return Upload.LIST_IGNORE;
      }

      const url = URL.createObjectURL(file);

      setImageUrl(url);
      setImageFile(file);

      return false;
    },
  };

  /*
   * NEXT STEP
   */

  const nextStep = async () => {
    try {
      /*
       * Validacija prvog koraka
       */
      if (currentStep === 0) {
        await form.validateFields(["name", "type", "gender"]);
      }

      /*
       * Zdravstveni podaci nisu obavezni,
       * zato ovde nema posebne validacije.
       */

      setCurrentStep((step) => step + 1);
    } catch {
      // Ant Design prikazuje greške na poljima
    }
  };

  /*
   * PREVIOUS STEP
   */

  const previousStep = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  /*
   * CREATE PET
   */

  const submitPet = async () => {
    try {
      setSaving(true);

      /*
       * Provera autentifikacije
       */

      if (!pb.authStore.isValid || !pb.authStore.record?.id) {
        messageApi.error("Sesija je istekla. Prijavi se ponovo.");
        router.push("/login");
        return;
      }

      /*
       * Uzmi sve podatke iz forme
       */

      const values = form.getFieldsValue(true);

      /*
       * Provera obaveznih podataka
       */

      if (!values.name || !values.type || !values.gender) {
        messageApi.error("Popuni obavezna polja.");
        setCurrentStep(0);
        return;
      }

      /*
       * FormData za PocketBase
       *
       * Ovo je bitno jer šaljemo i fotografiju.
       */

      const formData = new FormData();

      /*
       * VLASNIK
       */

      formData.append("owner", pb.authStore.record.id);

      /*
       * OSNOVNI PODACI
       */

      formData.append("name", values.name);
      formData.append("type", values.type);
      formData.append("gender", values.gender);

      if (values.breed) {
        formData.append("breed", values.breed);
      }

      if (values.color) {
        formData.append("color", values.color);
      }

      /*
       * DATUM ROĐENJA
       */

      if (values.birthday) {
        const birthday = values.birthday.format("YYYY-MM-DD");

        formData.append("birthday", birthday);
      }

      /*
       * ZDRAVLJE
       */

      if (
        values.weight !== undefined &&
        values.weight !== null &&
        values.weight !== ""
      ) {
        formData.append("weight", String(values.weight));
      }

      if (values.microchip) {
        formData.append("microchip", values.microchip);
      }

      if (values.neutered !== undefined && values.neutered !== null) {
        formData.append("neutered", String(values.neutered));
      }

      if (values.allergies) {
        formData.append("allergies", values.allergies);
      }

      if (values.healthNotes) {
        formData.append("healthNotes", values.healthNotes);
      }

      /*
       * FOTOGRAFIJA
       */

      if (imageFile) {
        formData.append("image", imageFile);
      }

      /*
       * KREIRANJE LJUBIMCA U POCKETBASE
       */

      const createdPet = await pb.collection("pets").create(formData);

      console.log("NOVI LJUBIMAC:", createdPet);

      messageApi.success("Ljubimac je uspešno dodat!");

      /*
       * Kratko sačekamo da korisnik vidi poruku
       */

      setTimeout(() => {
        router.push("/dashboard/profile");
        router.refresh();
      }, 900);
    } catch (error: any) {
      console.error("Greška pri kreiranju ljubimca:", error);

      const errorMessage =
        error?.response?.message ||
        error?.message ||
        "Došlo je do greške pri kreiranju ljubimca.";

      messageApi.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  /*
   * PET TYPE LABEL
   */

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case "dog":
        return "Pas";

      case "cat":
        return "Mačka";

      case "bird":
        return "Ptica";

      case "rabbit":
        return "Zec";

      case "other":
        return "Drugo";

      default:
        return "-";
    }
  };

  /*
   * GENDER LABEL
   */

  const getGenderLabel = (gender?: string) => {
    switch (gender) {
      case "male":
        return "Mužjak";

      case "female":
        return "Ženka";

      default:
        return "-";
    }
  };

  return (
    <>
      {contextHolder}

      <main className={styles.page}>
        {/* BACK */}

        <button
          className={styles.backButton}
          onClick={() => router.push("/dashboard/profile")}
          disabled={saving}
        >
          <ArrowLeftOutlined />
          Nazad na profil
        </button>

        {/* HEADER */}

        <section className={styles.header}>
          <div>
            <span className={styles.eyebrow}>MOJI LJUBIMCI</span>

            <h1>Dodaj ljubimca</h1>

            <p>
              Kreiraj profil svog ljubimca i vodi njegov zdravstveni karton na
              jednom mestu.
            </p>
          </div>
        </section>

        {/* STEPS */}

        <section className={styles.stepsCard}>
          <Steps current={currentStep} items={steps} responsive />
        </section>

        {/* FORM */}

        <section className={styles.formCard}>
          <Form form={form} layout="vertical" requiredMark="optional">
            {/* STEP 1 */}

            {currentStep === 0 && (
              <div className={styles.stepContent}>
                <div className={styles.stepTitle}>
                  <div className={styles.stepIcon}>
                    <UserOutlined />
                  </div>

                  <div>
                    <h2>Osnovni podaci</h2>

                    <p>Unesi osnovne informacije o svom ljubimcu.</p>
                  </div>
                </div>

                <div className={styles.grid}>
                  <Form.Item
                    label="Ime ljubimca"
                    name="name"
                    rules={[
                      {
                        required: true,
                        message: "Unesi ime ljubimca",
                      },
                    ]}
                  >
                    <Input size="large" placeholder="npr. Max" maxLength={50} />
                  </Form.Item>

                  <Form.Item
                    label="Vrsta"
                    name="type"
                    rules={[
                      {
                        required: true,
                        message: "Izaberi vrstu",
                      },
                    ]}
                  >
                    <Select
                      size="large"
                      placeholder="Izaberi vrstu"
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
                    <Input
                      size="large"
                      placeholder="npr. Labrador"
                      maxLength={100}
                    />
                  </Form.Item>

                  <Form.Item
                    label="Pol"
                    name="gender"
                    rules={[
                      {
                        required: true,
                        message: "Izaberi pol",
                      },
                    ]}
                  >
                    <Radio.Group size="large" className={styles.radioGroup}>
                      <Radio value="male">Mužjak</Radio>

                      <Radio value="female">Ženka</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item label="Datum rođenja" name="birthday">
                    <DatePicker
                      size="large"
                      format="DD.MM.YYYY."
                      placeholder="Izaberi datum"
                      style={{ width: "100%" }}
                      disabledDate={(current) =>
                        current && current.isAfter(new Date(), "day")
                      }
                    />
                  </Form.Item>

                  <Form.Item label="Boja" name="color">
                    <Input
                      size="large"
                      placeholder="npr. Zlatna"
                      maxLength={50}
                    />
                  </Form.Item>
                </div>
              </div>
            )}

            {/* STEP 2 */}

            {currentStep === 1 && (
              <div className={styles.stepContent}>
                <div className={styles.stepTitle}>
                  <div className={styles.stepIcon}>
                    <HeartOutlined />
                  </div>

                  <div>
                    <h2>Zdravstveni podaci</h2>

                    <p>Ovi podaci će biti deo e-kartona ljubimca.</p>
                  </div>
                </div>

                <div className={styles.grid}>
                  <Form.Item label="Težina" name="weight">
                    <Space.Compact style={{ width: "100%" }}>
                      <InputNumber
                        size="large"
                        min={0}
                        max={300}
                        step={0.1}
                        precision={2}
                        placeholder="npr. 12.5"
                        style={{ width: "100%" }}
                      />

                      <Button size="large" disabled>
                        kg
                      </Button>
                    </Space.Compact>
                  </Form.Item>

                  <Form.Item label="Broj mikročipa" name="microchip">
                    <Input
                      size="large"
                      placeholder="npr. 688012345678901"
                      prefix={<IdcardOutlined />}
                      maxLength={30}
                    />
                  </Form.Item>
                </div>

                <Form.Item label="Sterilizovan / kastriran" name="neutered">
                  <Radio.Group size="large">
                    <Radio value={true}>Da</Radio>

                    <Radio value={false}>Ne</Radio>
                  </Radio.Group>
                </Form.Item>
              </div>
            )}

            {/* STEP 3 */}

            {currentStep === 2 && (
              <div className={styles.photoStep}>
                <div className={styles.stepTitle}>
                  <div className={styles.stepIcon}>
                    <CameraOutlined />
                  </div>

                  <div>
                    <h2>Fotografija ljubimca</h2>

                    <p>
                      Dodaj fotografiju kako bi profil bio prepoznatljiviji.
                    </p>
                  </div>
                </div>

                <Upload {...uploadProps}>
                  <div className={styles.uploadBox}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Ljubimac"
                        className={styles.preview}
                      />
                    ) : (
                      <>
                        <div className={styles.uploadIcon}>
                          <CameraOutlined />
                        </div>

                        <strong>Dodaj fotografiju</strong>

                        <span>Klikni ovde ili prevuci sliku</span>

                        <small>JPG, PNG ili WEBP • maksimalno 5 MB</small>
                      </>
                    )}
                  </div>
                </Upload>

                {imageUrl && (
                  <p
                    style={{
                      marginTop: 12,
                      textAlign: "center",
                      color: "#777",
                    }}
                  >
                    Klikni na fotografiju ako želiš da je promeniš.
                  </p>
                )}
              </div>
            )}

            {/* STEP 4 */}

            {currentStep === 3 && (
              <div className={styles.confirmStep}>
                <div className={styles.confirmIcon}>
                  <CheckOutlined />
                </div>

                <h2>Spremni smo! 🐾</h2>

                <p>
                  Proveri podatke svog ljubimca pre nego što kreiramo njegov
                  profil.
                </p>

                <div className={styles.summary}>
                  <div>
                    <span>Ime</span>

                    <strong>{form.getFieldValue("name") || "-"}</strong>
                  </div>

                  <div>
                    <span>Vrsta</span>

                    <strong>{getTypeLabel(form.getFieldValue("type"))}</strong>
                  </div>

                  <div>
                    <span>Rasa</span>

                    <strong>
                      {form.getFieldValue("breed") || "Nije navedena"}
                    </strong>
                  </div>

                  <div>
                    <span>Pol</span>

                    <strong>
                      {getGenderLabel(form.getFieldValue("gender"))}
                    </strong>
                  </div>

                  <div>
                    <span>Težina</span>

                    <strong>
                      {form.getFieldValue("weight") !== undefined &&
                      form.getFieldValue("weight") !== null
                        ? `${form.getFieldValue("weight")} kg`
                        : "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Mikročip</span>

                    <strong>
                      {form.getFieldValue("microchip") || "Nije unet"}
                    </strong>
                  </div>

                  <div>
                    <span>Sterilizacija</span>

                    <strong>
                      {form.getFieldValue("neutered") === true
                        ? "Da"
                        : form.getFieldValue("neutered") === false
                        ? "Ne"
                        : "Nije navedeno"}
                    </strong>
                  </div>

                  <div>
                    <span>Fotografija</span>

                    <strong>{imageFile ? "Dodata" : "Nije dodata"}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* BUTTONS */}

            <div className={styles.actions}>
              {currentStep > 0 ? (
                <Button size="large" onClick={previousStep} disabled={saving}>
                  Nazad
                </Button>
              ) : (
                <Button
                  size="large"
                  onClick={() => router.push("/dashboard/profile")}
                  disabled={saving}
                >
                  Otkaži
                </Button>
              )}

              <div className={styles.rightActions}>
                {currentStep < steps.length - 1 ? (
                  <Button
                    type="primary"
                    size="large"
                    onClick={nextStep}
                    disabled={saving}
                  >
                    Nastavi
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    icon={<CheckOutlined />}
                    onClick={submitPet}
                    loading={saving}
                  >
                    {saving ? "Kreiranje..." : "Kreiraj profil"}
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
