"use client";

import { Button, Card, Form, Input, Typography, message } from "antd";

import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";

import pb from "../app/lib/pocketbase";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function RegisterForm() {
  const [messageApi, contextHolder] = message.useMessage();

  const router = useRouter();

  const onFinish = async (values: any) => {
    try {
      // 1. Kreiranje korisnika u PocketBase
      await pb.collection("users").create({
        name: values.name,
        email: values.email,
        password: values.password,
        passwordConfirm: values.passwordConfirm,
      });

      // 2. Automatski login posle registracije
      await pb
        .collection("users")
        .authWithPassword(values.email, values.password);

      messageApi.success("Registracija uspešna");

      // 3. Prebacivanje na dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.log("ERROR DATA:", JSON.stringify(error.response.data, null, 2));

      messageApi.error("Greška prilikom registracije");
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
        <Title level={2}>Kreiraj nalog</Title>

        <Text type="secondary">Registrujte se da nastavite</Text>

        <Form
          layout="vertical"
          style={{
            marginTop: 30,
          }}
          onFinish={onFinish}
        >
          <Form.Item
            label="Ime"
            name="name"
            rules={[
              {
                required: true,
                message: "Unesite ime",
              },
            ]}
          >
            <Input prefix={<UserOutlined />} size="large" placeholder="Ime" />
          </Form.Item>

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
                message: "Email nije validan",
              },
            ]}
          >
            <Input prefix={<MailOutlined />} size="large" placeholder="Email" />
          </Form.Item>

          <Form.Item
            label="Lozinka"
            name="password"
            rules={[
              {
                required: true,
                message: "Unesite lozinku",
              },
              {
                validator(_, value) {
                  if (!value) {
                    return Promise.resolve();
                  }

                  const hasMinLength = value.length >= 8;
                  const hasUpperCase = /[A-Z]/.test(value);
                  const hasNumber = /[0-9]/.test(value);
                  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

                  if (
                    hasMinLength &&
                    hasUpperCase &&
                    hasNumber &&
                    hasSpecialChar
                  ) {
                    return Promise.resolve();
                  }

                  return Promise.reject(
                    new Error(
                      "Lozinka mora imati minimum 8 karaktera, jedno veliko slovo, broj i specijalni karakter",
                    ),
                  );
                },
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              size="large"
              placeholder="Lozinka"
            />
          </Form.Item>

          <Form.Item
            label="Ponovi lozinku"
            name="passwordConfirm"
            dependencies={["password"]}
            rules={[
              {
                required: true,
                message: "Ponovite lozinku",
              },

              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error("Lozinke se ne poklapaju"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block>
            Registruj se
          </Button>
        </Form>
      </Card>
    </>
  );
}
