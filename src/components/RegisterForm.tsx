"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Form, Input, Typography, message } from "antd";
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

import pb from "@/app/lib/pocketbase";
import styles from "./RegisterForm.module.css";

const { Title, Text } = Typography;

interface RegisterValues {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export default function RegisterForm() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: RegisterValues) => {
    if (loading) return;

    setLoading(true);

    try {
      await pb.collection("users").create({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        passwordConfirm: values.passwordConfirm,
        role: "client",
      });

      const authData = await pb
        .collection("users")
        .authWithPassword(values.email.trim().toLowerCase(), values.password);

      if (!authData.record) {
        throw new Error("Registracija je uspešna, ali prijava nije uspela.");
      }

      messageApi.success("Nalog je uspešno kreiran.");
      router.replace("/dashboard/map");
    } catch (error: any) {
      console.error("REGISTER ERROR:", error);

      const data = error?.response?.data;

      if (data?.email?.code === "validation_not_unique") {
        messageApi.error("Nalog sa ovim emailom već postoji.");
      } else {
        messageApi.error(
          "Registracija nije uspela. Proverite podatke i pokušajte ponovo.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}

      <div className={styles.wrapper}>
        <div className={styles.bgGlowTop} />
        <div className={styles.bgGlowBottom} />

        {/* Tragovi šapa */}
        <div className={styles.pawsTrack}>
          <div className={`${styles.paw} ${styles.paw1}`} />
          <div className={`${styles.paw} ${styles.paw2}`} />
          <div className={`${styles.paw} ${styles.paw3}`} />
          <div className={`${styles.paw} ${styles.paw4}`} />
          <div className={`${styles.paw} ${styles.paw5}`} />
          <div className={`${styles.paw} ${styles.paw6}`} />
          <div className={`${styles.paw} ${styles.paw7}`} />
          <div className={`${styles.paw} ${styles.paw8}`} />
        </div>

        <Card className={styles.card} variant="borderless">
          <div className={styles.brand}>
            <div className={styles.logoWrapper}>
              <Image
                src="/images/logo1.png"
                alt="HELPet Logo"
                width={260}
                height={70}
                priority
                className={styles.logoImage}
              />
            </div>
          </div>

          <div className={styles.heading}>
            <Title level={3}>Napravi svoj nalog</Title>
          </div>

          <Form<RegisterValues>
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            autoComplete="on"
          >
            <Form.Item
              label="Ime i prezime"
              name="name"
              className={styles.formItem}
              rules={[
                {
                  required: true,
                  message: "Unesite ime.",
                },
                {
                  min: 2,
                  message: "Ime mora imati najmanje 2 karaktera.",
                },
              ]}
            >
              <Input
                prefix={<UserOutlined className={styles.inputIcon} />}
                size="large"
                placeholder="Petar Petrović"
                autoComplete="name"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              label="Email adresa"
              name="email"
              className={styles.formItem}
              rules={[
                {
                  required: true,
                  message: "Unesite email.",
                },
                {
                  type: "email",
                  message: "Unesite validan email.",
                },
              ]}
            >
              <Input
                prefix={<MailOutlined className={styles.inputIcon} />}
                size="large"
                placeholder="vas@email.com"
                autoComplete="email"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              label="Lozinka"
              name="password"
              className={styles.formItem}
              rules={[
                {
                  required: true,
                  message: "Unesite lozinku.",
                },
                {
                  validator(_, value) {
                    if (!value) return Promise.resolve();

                    const validLength = value.length >= 8;
                    const uppercase = /[A-Z]/.test(value);
                    const number = /[0-9]/.test(value);
                    const special = /[^A-Za-z0-9]/.test(value);

                    if (validLength && uppercase && number && special) {
                      return Promise.resolve();
                    }

                    return Promise.reject(
                      new Error(
                        "Min. 8 karaktera, jedno veliko slovo, broj i specijalni karakter.",
                      ),
                    );
                  },
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className={styles.inputIcon} />}
                size="large"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              label="Ponovi lozinku"
              name="passwordConfirm"
              dependencies={["password"]}
              className={styles.formItem}
              rules={[
                {
                  required: true,
                  message: "Ponovite lozinku.",
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || value === getFieldValue("password")) {
                      return Promise.resolve();
                    }

                    return Promise.reject(
                      new Error("Lozinke se ne poklapaju."),
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className={styles.inputIcon} />}
                size="large"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              icon={<ArrowRightOutlined />}
              iconPlacement="end"
              className={styles.submitButton}
            >
              Registruj se
            </Button>
          </Form>

          <div className={styles.footer}>
            <Text type="secondary">Već imate nalog?</Text>
            <Link href="/login" className={styles.loginLink}>
              Prijavite se
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
