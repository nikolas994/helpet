"use client";

import { Button, Card, Form, Input, Typography, message } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

import pb from "../app/lib/pocketbase";
const { Title, Text } = Typography;

export default function LoginForm() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values: any) => {
    try {
      await pb
        .collection("users")
        .authWithPassword(values.email, values.password);

      messageApi.success("Uspešna prijava");

      router.push("/dashboard");
    } catch (error) {
      messageApi.error("Pogrešan email ili lozinka");
    }
  };

  return (
    <>
      {contextHolder}

      <Card
        style={{
          width: 400,
          borderRadius: 20,
        }}
      >
        <Title level={2} style={{ textAlign: "center" }}>
          Dobrodošli
        </Title>

        <Text type="secondary">Prijavite se na svoj nalog</Text>

        <Form
          layout="vertical"
          style={{
            marginTop: 30,
          }}
          onFinish={onFinish}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                required: true,
                message: "Unesite email",
              },
              {
                type: "email",
                message: "Unesite validan email",
              },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item
            label="Lozinka"
            name="password"
            rules={[
              {
                required: true,
                message: "Unesite lozinku",
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Lozinka"
              size="large"
            />
          </Form.Item>

          <Button htmlType="submit" type="primary" block size="large">
            Prijavi se
          </Button>

          <div
            style={{
              marginTop: 20,
              textAlign: "center",
            }}
          >
            <Text>
              Nemate nalog? <a href="/register">Registrujte se</a>
            </Text>
          </div>
        </Form>
      </Card>
    </>
  );
}
