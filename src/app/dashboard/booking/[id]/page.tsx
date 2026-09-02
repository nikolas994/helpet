"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { message, DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import pb from "@/app/lib/pocketbase";
import type { Location } from "@/types/location";
import styles from "./BookingPage.module.css";

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number | string;
  price: number | string;
  active?: boolean;
}

interface Pet {
  id: string;
  name: string;
  type?: string;
  breed?: string;
}

export default function BookingPage() {
  const router = useRouter();
  const params = useParams();

  const locationId = params?.id as string;

  const [messageApi, contextHolder] = message.useMessage();

  const [location, setLocation] = useState<Location | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [userPets, setUserPets] = useState<Pet[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");

  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedTime, setSelectedTime] = useState("");

  const [note, setNote] = useState("");

  // =========================================
  // TERMINI
  // =========================================

  const timeSlots = [
    "09:00",
    "10:00",
    "11:30",
    "13:00",
    "14:30",
    "16:00",
    "17:30",
  ];

  // =========================================
  // UČITAVANJE PODATAKA
  // =========================================

  useEffect(() => {
    if (!locationId) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        const userId = pb.authStore.model?.id;

        if (!userId) {
          router.push("/login");
          return;
        }

        const locationData = await pb
          .collection("locations")
          .getOne<Location>(locationId, {
            requestKey: null,
          });

        const servicesData = await pb
          .collection("services")
          .getFullList<Service>({
            filter: `location = "${locationId}" && active = true`,
            sort: "name",
            requestKey: null,
          });

        const petsData = await pb.collection("pets").getFullList<Pet>({
          filter: `owner = "${userId}"`,
          sort: "name",
          requestKey: null,
        });

        if (!isMounted) return;

        setLocation(locationData);
        setServices(servicesData);
        setUserPets(petsData);

        if (servicesData.length > 0) {
          setSelectedServiceId(servicesData[0].id);
        }

        if (petsData.length > 0) {
          setSelectedPetId(petsData[0].id);
        }
      } catch (error: any) {
        if (
          error?.isAbort ||
          error?.name === "AbortError" ||
          error?.status === 0
        ) {
          return;
        }

        console.error("Greška pri učitavanju booking podataka:", error);

        if (isMounted) {
          messageApi.error("Greška pri učitavanju podataka za zakazivanje.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [locationId, router]);

  // =========================================
  // SELEKTOVANI PODACI
  // =========================================

  const selectedService = services.find(
    (service) => service.id === selectedServiceId,
  );

  const selectedPet = userPets.find((pet) => pet.id === selectedPetId);

  // =========================================
  // PROVERA TERMINA
  // =========================================

  const isTimeInPast = (time: string) => {
    if (!selectedDate) return false;

    const today = dayjs();

    if (!selectedDate.isSame(today, "day")) {
      return false;
    }

    const [hours, minutes] = time.split(":").map(Number);

    const selectedDateTime = selectedDate
      .hour(hours)
      .minute(minutes)
      .second(0)
      .millisecond(0);

    return selectedDateTime.isBefore(today);
  };

  // =========================================
  // NASTAVI
  // =========================================

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!selectedServiceId) {
        messageApi.warning("Molimo izaberite uslugu.");
        return;
      }

      if (!selectedService) {
        messageApi.error("Izabrana usluga više nije dostupna.");
        return;
      }

      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!selectedPetId) {
        messageApi.warning("Molimo izaberite ljubimca.");
        return;
      }

      if (!selectedPet) {
        messageApi.error("Izabrani ljubimac nije pronađen.");
        return;
      }

      if (!selectedDate) {
        messageApi.warning("Molimo izaberite datum.");
        return;
      }

      if (!selectedTime) {
        messageApi.warning("Molimo izaberite vreme.");
        return;
      }

      if (isTimeInPast(selectedTime)) {
        messageApi.warning(
          "Izabrani termin je već prošao. Molimo izaberite drugo vreme.",
        );
        return;
      }

      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (submitting) return;

      if (!selectedService || !selectedPet || !selectedDate || !selectedTime) {
        messageApi.error("Nedostaju podaci za rezervaciju.");
        return;
      }

      const userId = pb.authStore.model?.id;

      if (!userId) {
        messageApi.error("Morate biti prijavljeni.");
        router.push("/login");
        return;
      }

      const [hours, minutes] = selectedTime.split(":").map(Number);

      const appointmentDate = selectedDate
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);

      if (appointmentDate.isBefore(dayjs())) {
        messageApi.warning(
          "Izabrani termin je već prošao. Molimo izaberite drugo vreme.",
        );
        return;
      }

      try {
        setSubmitting(true);

        const payload = {
          user: userId,
          location: locationId,
          pet: selectedPetId,
          service: selectedServiceId,
          date: appointmentDate.toISOString(),
          status: "pending",
          note: note.trim(),
        };

        await pb.collection("appointments").create(payload);

        messageApi.success("Uspešno ste poslali zahtev za zakazivanje!");

        setCurrentStep(1);
        setSelectedDate(null);
        setSelectedTime("");
        setNote("");

        setTimeout(() => {
          router.push("/dashboard/map");
        }, 1200);
      } catch (error: any) {
        console.error("Greška pri kreiranju appointment-a:", error);
        messageApi.error(
          error?.response?.message ||
            "Greška pri zakazivanju. Pokušajte ponovo.",
        );
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (submitting) return;

    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      return;
    }

    router.back();
  };

  const handleDateChange = (date: Dayjs | null) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  if (loading) {
    return (
      <div
        className={styles.container}
        style={{ textAlign: "center", paddingTop: 100 }}
      >
        <p>Učitavanje podataka o rezervaciji...</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div
        className={styles.container}
        style={{ textAlign: "center", paddingTop: 100 }}
      >
        {contextHolder}
        <h2>Objekat nije pronađen</h2>
        <p>
          Objekat koji pokušavate da otvorite ne postoji ili više nije dostupan.
        </p>
        <button className={styles.nextButton} onClick={() => router.back()}>
          ← Nazad
        </button>
      </div>
    );
  }

  const morningSlots = timeSlots.filter(
    (time) => parseInt(time.split(":")[0]) < 12,
  );
  const afternoonSlots = timeSlots.filter(
    (time) => parseInt(time.split(":")[0]) >= 12,
  );

  return (
    <div className={styles.container}>
      {contextHolder}

      {/* HEADER + STEPPER */}
      <div className={styles.headerRow}>
        <button
          className={styles.backButton}
          onClick={handleBack}
          disabled={submitting}
        >
          ← Nazad
        </button>

        <div className={styles.stepper}>
          <div
            className={`${styles.step} ${
              currentStep >= 1 ? styles.activeStep : ""
            }`}
          >
            01
          </div>
          <div className={styles.stepLine} />
          <div
            className={`${styles.step} ${
              currentStep >= 2 ? styles.activeStep : ""
            }`}
          >
            02
          </div>
          <div className={styles.stepLine} />
          <div
            className={`${styles.step} ${
              currentStep >= 3 ? styles.activeStep : ""
            }`}
          >
            03
          </div>
        </div>
      </div>

      {/* LOCATION CARD */}
      <div className={styles.profileCard}>
        <div className={styles.profileAvatar}>
          {location.type === "vet" ? "🩺" : "✨"}
        </div>
        <div className={styles.profileDetails}>
          <span className={styles.badge}>
            {location.type?.toUpperCase() || "LOKACIJA"}
          </span>
          <h2>{location.name}</h2>
          <div className={styles.metaRow}>
            {location.address && <span>📍 {location.address}</span>}
            {location.phone && <span>📞 {location.phone}</span>}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className={styles.contentCard}>
        {/* STEP 1 - USLUGA */}
        {currentStep === 1 && (
          <div>
            <div className={styles.stepTitle}>
              <span className={styles.stepNumber}>01</span>
              <div>
                <h3>Izaberi uslugu</h3>
                <p>Odaberi uslugu koju želiš da zakažeš.</p>
              </div>
            </div>

            <div className={styles.servicesList}>
              {services.map((service) => {
                const isSelected = selectedServiceId === service.id;
                return (
                  <div
                    key={service.id}
                    className={`${styles.serviceItem} ${
                      isSelected ? styles.selectedService : ""
                    }`}
                    onClick={() => setSelectedServiceId(service.id)}
                  >
                    <div className={styles.serviceIcon}>🐾</div>
                    <div className={styles.serviceInfo}>
                      <h4>{service.name}</h4>
                      {service.description && <p>{service.description}</p>}
                      <small>⏱ {service.duration} min</small>
                    </div>
                    <div className={styles.servicePrice}>
                      <strong>
                        {Number(service.price).toLocaleString("sr-RS")} RSD
                      </strong>
                      {isSelected && (
                        <span className={styles.checkBadge}>✓</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {services.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px 10px",
                    color: "#888",
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🐾</div>
                  <p>Trenutno nema dostupnih usluga za ovu lokaciju.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 - DATUM / VREME / LJUBIMAC */}
        {currentStep === 2 && (
          <div>
            <div className={styles.stepTitle}>
              <span className={styles.stepNumber}>02</span>
              <div>
                <h3>Termin i ljubimac</h3>
                <p>
                  Izaberi svog ljubimca, željeni datum i odgovarajuće vreme.
                </p>
              </div>
            </div>

            <div className={styles.stepForm}>
              {/* IZBOR LJUBIMCA */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Izaberi ljubimca</label>
                {userPets.length > 0 ? (
                  <div className={styles.petGrid}>
                    {userPets.map((pet) => {
                      const isSelected = selectedPetId === pet.id;
                      return (
                        <div
                          key={pet.id}
                          className={`${styles.petCard} ${
                            isSelected ? styles.selectedPetCard : ""
                          }`}
                          onClick={() => setSelectedPetId(pet.id)}
                        >
                          <div className={styles.petIcon}>
                            {pet.type?.toLowerCase().includes("mačka") ||
                            pet.type?.toLowerCase().includes("cat")
                              ? "🐱"
                              : "🐶"}
                          </div>
                          <div className={styles.petDetails}>
                            <span className={styles.petName}>{pet.name}</span>
                            {pet.type && (
                              <span className={styles.petType}>{pet.type}</span>
                            )}
                          </div>
                          {isSelected && (
                            <div className={styles.petCheck}>✓</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.noPetsBox}>
                    <div>
                      <strong>Nemate dodatih ljubimaca.</strong>
                      <p>
                        Dodajte ljubimca u svom profilu kako biste nastavili
                        zakazivanje.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.addPetBtn}
                      onClick={() => router.push("/dashboard/profile")}
                    >
                      + Dodaj ljubimca
                    </button>
                  </div>
                )}
              </div>

              {/* IZBOR DATUMA */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Izaberi datum</label>
                <div className={styles.datePickerWrapper}>
                  <DatePicker
                    size="large"
                    className={styles.customDatePicker}
                    value={selectedDate}
                    onChange={handleDateChange}
                    format="DD.MM.YYYY."
                    disabledDate={(current) =>
                      current && current < dayjs().startOf("day")
                    }
                    placeholder="Klikni za izbor datuma..."
                  />
                </div>
              </div>

              {/* IZBOR VREMENA */}
              {selectedDate && (
                <div className={styles.fieldGroup}>
                  <div className={styles.timeHeader}>
                    <label
                      className={styles.fieldLabel}
                      style={{ marginBottom: 0 }}
                    >
                      Dostupni termini
                    </label>
                    <span className={styles.selectedDateBadge}>
                      📅 {selectedDate.format("DD. MMMM YYYY.")}
                    </span>
                  </div>

                  {/* Jutarnji termini */}
                  {morningSlots.length > 0 && (
                    <div className={styles.timeSection}>
                      <span className={styles.timeSectionTitle}>
                        ☀️ Prepodne
                      </span>
                      <div className={styles.timeGrid}>
                        {morningSlots.map((time) => {
                          const isSelected = selectedTime === time;
                          const isPast = isTimeInPast(time);
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={isPast}
                              onClick={() => !isPast && setSelectedTime(time)}
                              className={`${styles.timeSlot} ${
                                isSelected ? styles.selectedTimeSlot : ""
                              } ${isPast ? styles.disabledTimeSlot : ""}`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Popodnevni termini */}
                  {afternoonSlots.length > 0 && (
                    <div className={styles.timeSection}>
                      <span className={styles.timeSectionTitle}>
                        🌤️ Popodne
                      </span>
                      <div className={styles.timeGrid}>
                        {afternoonSlots.map((time) => {
                          const isSelected = selectedTime === time;
                          const isPast = isTimeInPast(time);
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={isPast}
                              onClick={() => !isPast && setSelectedTime(time)}
                              className={`${styles.timeSlot} ${
                                isSelected ? styles.selectedTimeSlot : ""
                              } ${isPast ? styles.disabledTimeSlot : ""}`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 - POTVRDA */}
        {currentStep === 3 && (
          <div>
            <div className={styles.stepTitle}>
              <span className={styles.stepNumber}>03</span>
              <div>
                <h3>Potvrda rezervacije</h3>
                <p>
                  Proveri podatke pre nego što pošalješ zahtev za zakazivanje.
                </p>
              </div>
            </div>

            <div
              style={{
                background: "#f9fafb",
                padding: 20,
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div>
                <strong>Objekat:</strong> {location.name}
              </div>
              <div>
                <strong>Usluga:</strong> {selectedService?.name}
              </div>
              <div>
                <strong>Cena:</strong>{" "}
                {selectedService
                  ? Number(selectedService.price).toLocaleString("sr-RS")
                  : 0}{" "}
                RSD
              </div>
              <div>
                <strong>Trajanje:</strong> {selectedService?.duration} min
              </div>
              <div>
                <strong>Ljubimac:</strong> {selectedPet?.name || "Nije izabran"}
              </div>
              <div>
                <strong>Datum:</strong> {selectedDate?.format("DD.MM.YYYY.")}
              </div>
              <div>
                <strong>Vreme:</strong> {selectedTime} h
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <label
                style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
              >
                Napomena (opciono):
              </label>
              <textarea
                rows={4}
                maxLength={1000}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  resize: "vertical",
                  fontFamily: "inherit",
                  outline: "none",
                }}
                placeholder="Napišite napomenu za osoblje..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <small style={{ display: "block", marginTop: 5, color: "#888" }}>
                {note.length}/1000
              </small>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className={styles.footerRow}>
          <button
            className={styles.nextButton}
            onClick={handleNext}
            disabled={submitting}
          >
            {submitting
              ? "Slanje..."
              : currentStep === 3
              ? "✓ Potvrdi i zakaži"
              : "Nastavi →"}
          </button>
        </div>
      </div>
    </div>
  );
}
