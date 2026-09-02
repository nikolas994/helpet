"use client";

import {
  Form,
  Input,
  Button,
  Select,
  Card,
  InputNumber,
  message,
  Upload,
} from "antd";

import { EnvironmentOutlined, UploadOutlined } from "@ant-design/icons";

import { useState } from "react";

import { useRouter } from "next/navigation";

import pb from "@/app/lib/pocketbase";
export default function CreateLocationPage() {
  const router = useRouter();

  const [messageApi, contextHolder] = message.useMessage();

  const [file, setFile] = useState<File | null>(null);

  const onFinish = async (values: any) => {
    try {
      const formData = new FormData();

      formData.append("name", values.name);

      formData.append("description", values.description || "");

      formData.append("type", values.type);

      formData.append("address", values.address || "");

      formData.append("phone", values.phone || "");

      formData.append("lat", String(values.lat));

      formData.append("lng", String(values.lng));

      if (file) {
        formData.append("image", file);
      }

      await pb.collection("locations").create(formData);

      messageApi.success("Lokacija uspešno dodata");

      setTimeout(() => {
        router.push("/dashboard/locations");
      }, 800);
    } catch (error) {
      console.error("CREATE LOCATION ERROR:", error);

      messageApi.error("Greška pri dodavanju lokacije");
    }
  };

  return (
    <>
      {contextHolder}

      <Card
        title="Dodaj novu lokaciju"
        style={{
          maxWidth: 700,
        }}
      >
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Naziv"
            name="name"
            rules={[
              {
                required: true,
                message: "Unesite naziv",
              },
            ]}
          >
            <Input size="large" placeholder="Veterinar PetCare" />
          </Form.Item>

          <Form.Item
            label="Tip"
            name="type"
            rules={[
              {
                required: true,
                message: "Izaberite tip",
              },
            ]}
          >
            <Select
              size="large"
              options={[
                {
                  label: "Veterinar",
                  value: "vet",
                },

                {
                  label: "Pet Shop",
                  value: "shop",
                },

                {
                  label: "Salon",
                  value: "salon",
                },

                {
                  label: "Hotel",
                  value: "hotel",
                },

                {
                  label: "Grooming",
                  value: "grooming",
                },
              ]}
            />
          </Form.Item>

          <Form.Item label="Opis" name="description">
            <Input.TextArea rows={4} placeholder="Opis lokacije" />
          </Form.Item>

          <Form.Item label="Adresa" name="address">
            <Input
              size="large"
              prefix={<EnvironmentOutlined />}
              placeholder="Adresa"
            />
          </Form.Item>

          <Form.Item label="Telefon" name="phone">
            <Input size="large" placeholder="+381..." />
          </Form.Item>

          <Form.Item label="Slika lokacije">
            <Upload
              maxCount={1}
              beforeUpload={(file) => {
                setFile(file);

                return false;
              }}
              onRemove={() => {
                setFile(null);
              }}
            >
              <Button icon={<UploadOutlined />}>Izaberi sliku</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            label="Latitude"
            name="lat"
            rules={[
              {
                required: true,
                message: "Unesite latitude",
              },
            ]}
          >
            <InputNumber
              size="large"
              style={{
                width: "100%",
              }}
              placeholder="44.7866"
            />
          </Form.Item>

          <Form.Item
            label="Longitude"
            name="lng"
            rules={[
              {
                required: true,
                message: "Unesite longitude",
              },
            ]}
          >
            <InputNumber
              size="large"
              style={{
                width: "100%",
              }}
              placeholder="20.4489"
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block>
            Sačuvaj lokaciju
          </Button>
        </Form>
      </Card>
    </>
  );
}
