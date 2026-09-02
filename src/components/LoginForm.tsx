"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Form, Input, Typography, message } from "antd";
import {
  LockOutlined,
  MailOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

import pb from "../app/lib/pocketbase";
import styles from "./LoginForm.module.css";

const { Title, Text } = Typography;

interface LoginValues {
  email: string;
  password: string;
}

export default function LoginForm() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const redirectByRole = (role?: string) => {
    const normalizedRole = role?.toLowerCase().trim();

    if (normalizedRole === "provider") {
      router.replace("/dashboard/provider");
      return;
    }

    router.replace("/dashboard/map");
  };

  useEffect(() => {
    const checkAuth = () => {
      if (pb.authStore.isValid && pb.authStore.model) {
        redirectByRole(pb.authStore.model.role);
        return;
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const onFinish = async (values: LoginValues) => {
    if (loading) return;

    setLoading(true);

    try {
      const authData = await pb
        .collection("users")
        .authWithPassword(values.email.trim(), values.password);

      const user = authData.record;

      if (!user) {
        throw new Error("Korisnik nije pronađen.");
      }

      messageApi.success("Uspešna prijava.");
      redirectByRole(user.role);
    } catch (error: any) {
      console.error("LOGIN ERROR:", error);
      messageApi.error("Email ili lozinka nisu ispravni.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className={styles.authLoading}>
        <div className={styles.loadingSpinner} />
        <span>Provera sesije...</span>
      </div>
    );
  }

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
                src="/images/logo.png"
                alt="HELPet Logo"
                width={180}
                height={180}
                priority
                className={styles.logoImage}
              />
            </div>
          </div>

          <div className={styles.heading}>
            <Title level={2}>Dobrodošli </Title>
            <Text type="secondary">Unesite podatke za pristup svom nalogu</Text>
          </div>

          <Form<LoginValues>
            layout="vertical"
            onFinish={onFinish}
            autoComplete="on"
            requiredMark={false}
          >
            <Form.Item
              label="Email adresa"
              name="email"
              className={styles.formItem}
              rules={[
                {
                  required: true,
                  message: "Unesite email adresu.",
                },
                {
                  type: "email",
                  message: "Unesite validnu email adresu.",
                },
              ]}
            >
              <Input
                prefix={<MailOutlined className={styles.inputIcon} />}
                placeholder="vas@email.com"
                size="large"
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
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className={styles.inputIcon} />}
                placeholder="••••••••"
                size="large"
                autoComplete="current-password"
                disabled={loading}
              />
            </Form.Item>

            <Button
              htmlType="submit"
              type="primary"
              block
              size="large"
              loading={loading}
              icon={<ArrowRightOutlined />}
              iconPlacement="end"
              className={styles.submitButton}
            >
              Prijavi se
            </Button>
          </Form>

          <div className={styles.footer}>
            <Text type="secondary">Nemate nalog?</Text>
            <Link href="/register" className={styles.registerLink}>
              Registrujte se
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
