"use client";

import {
  ArrowRightOutlined,
  EnvironmentOutlined,
  HeartFilled,
  MedicineBoxOutlined,
  PlusOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { Button } from "antd";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Ako ti se CSS fajl zove page.module.css promeni liniju ispod u: import styles from "./page.module.css";
import styles from "./Dashboard.module.css";

export default function Page() {
  const router = useRouter();

  return (
    <main className={styles.dashboard}>
      {/* =====================================================
      HERO
      ===================================================== */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />

        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <span />
            DOBRODOŠAO U HELPet
          </div>

          <h1>
            Sve za tvog
            <br />
            <strong>ljubimca.</strong>
          </h1>

          <p>
            HELPet ti omogućava da na jednom mestu čuvaš podatke o svojim
            ljubimcima, pronađeš korisne lokacije i upoznaš druge ljubimce.
          </p>

          <div className={styles.heroActions}>
            <Button
              icon={<PlusOutlined />}
              size="large"
              type="primary"
              onClick={() => router.push("/dashboard/profile/add-pet")}
            >
              Dodaj ljubimca
            </Button>

            <button
              className={styles.heroLink}
              onClick={() => router.push("/dashboard/map")}
            >
              Istraži mapu
              <ArrowRightOutlined />
            </button>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.visualCircle}>
            <div className={styles.heroLogoWrap}>
              <Image
                alt="HELPet"
                className={styles.heroLogo}
                fill
                priority
                sizes="220px"
                src="/images/logo.png"
              />
            </div>
          </div>

          <div className={`${styles.floatingCard} ${styles.cardOne}`}>
            <div className={styles.floatingIcon}>
              <HeartFilled />
            </div>

            <div>
              <strong>LovePlace</strong>
              <span>Nova poznanstva</span>
            </div>
          </div>

          <div className={`${styles.floatingCard} ${styles.cardTwo}`}>
            <div className={styles.floatingIcon}>
              <EnvironmentOutlined />
            </div>

            <div>
              <strong>HELPet mapa</strong>
              <span>Lokacije u blizini</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
      FEATURES
      ===================================================== */}
      <section className={styles.features}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionEyebrow}>ŠTA MOŽEŠ SA HELPet-OM</span>

          <h2>
            Jedna aplikacija.
            <br />
            Sve što ti treba.
          </h2>

          <p>HELPet je napravljen da ti olakša svakodnevnu brigu o ljubimcu.</p>
        </div>

        <div className={styles.featureGrid}>
          <button
            className={`${styles.featureCard} ${styles.featurePrimary}`}
            onClick={() => router.push("/dashboard/profile")}
          >
            <div className={styles.featureNumber}>01</div>

            <div className={styles.featureIcon}>
              <UserOutlined />
            </div>

            <h3>Moji ljubimci</h3>

            <p>
              Napravi profil svog ljubimca i na jednom mestu čuvaj njegove
              osnovne i važne podatke.
            </p>

            <span className={styles.featureLink}>
              Otvori profile
              <ArrowRightOutlined />
            </span>
          </button>

          <button
            className={styles.featureCard}
            onClick={() => router.push("/dashboard/map")}
          >
            <div className={styles.featureNumber}>02</div>

            <div className={styles.featureIcon}>
              <EnvironmentOutlined />
            </div>

            <h3>HELPet mapa</h3>

            <p>
              Pronađi veterinare, pet shopove, salone i hotele za ljubimce na
              jednom mestu.
            </p>

            <span className={styles.featureLink}>
              Otvori mapu
              <ArrowRightOutlined />
            </span>
          </button>

          <button
            className={styles.featureCard}
            onClick={() => router.push("/dashboard/loveplace")}
          >
            <div className={styles.featureNumber}>03</div>

            <div className={styles.featureIcon}>
              <HeartFilled />
            </div>

            <h3>LovePlace</h3>

            <p>
              Pogledaj profile drugih ljubimaca i pronađi nove prijatelje za
              svog ljubimca.
            </p>

            <span className={styles.featureLink}>
              Istraži LovePlace
              <ArrowRightOutlined />
            </span>
          </button>
        </div>
      </section>

      {/* =====================================================
      HOW IT WORKS
      ===================================================== */}
      <section className={styles.howSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionEyebrow}>KAKO FUNKCIONIŠE</span>

          <h2>
            Počni za
            <br />
            nekoliko koraka.
          </h2>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>01</div>

            <div className={styles.stepIcon}>
              <PlusOutlined />
            </div>

            <h3>Dodaj ljubimca</h3>

            <p>
              Kreiraj profil svog ljubimca i dodaj njegove osnovne informacije.
            </p>
          </div>

          <div className={styles.stepLine} />

          <div className={styles.step}>
            <div className={styles.stepNumber}>02</div>

            <div className={styles.stepIcon}>
              <EnvironmentOutlined />
            </div>

            <h3>Pronađi šta ti treba</h3>

            <p>
              Koristi HELPet mapu da pronađeš korisne lokacije u svojoj blizini.
            </p>
          </div>

          <div className={styles.stepLine} />

          <div className={styles.step}>
            <div className={styles.stepNumber}>03</div>

            <div className={styles.stepIcon}>
              <HeartFilled />
            </div>

            <h3>Upoznaj druge</h3>

            <p>Istraži LovePlace i pronađi nove prijatelje za svog ljubimca.</p>
          </div>
        </div>
      </section>

      {/* =====================================================
      MAP FEATURE
      ===================================================== */}
      <section className={styles.mapFeature}>
        <div className={styles.mapFeatureContent}>
          <span className={styles.sectionEyebrow}>HELPET MAPA</span>

          <h2>
            Sve korisne
            <br />
            lokacije na mapi.
          </h2>

          <p>
            Ne traži više veterinara, pet shop ili salon po internetu. HELPet
            mapa ti omogućava da ih pronađeš brzo i jednostavno.
          </p>

          <div className={styles.locationTypes}>
            <div>
              <MedicineBoxOutlined />
              <span>Veterinari</span>
            </div>

            <div>
              <ShopOutlined />
              <span>Pet shopovi</span>
            </div>

            <div>
              <HeartFilled />
              <span>Pet saloni</span>
            </div>

            <div>
              <EnvironmentOutlined />
              <span>Pet hoteli</span>
            </div>
          </div>

          <button
            className={styles.darkButton}
            onClick={() => router.push("/dashboard/map")}
          >
            Istraži mapu
            <ArrowRightOutlined />
          </button>
        </div>

        <div className={styles.mapPreview}>
          <div className={styles.mapGrid} />

          <div className={`${styles.mapMarker} ${styles.markerOne}`}>🏥</div>
          <div className={`${styles.mapMarker} ${styles.markerTwo}`}>🛍️</div>
          <div className={`${styles.mapMarker} ${styles.markerThree}`}>✨</div>

          <div className={styles.mapCenter}>
            <EnvironmentOutlined />
          </div>
        </div>
      </section>

      {/* =====================================================
      LOVEPLACE
      ===================================================== */}
      <section className={styles.loveplace}>
        <div className={styles.loveplaceVisual}>
          <div className={styles.loveplaceGlow} />

          <div className={styles.loveplaceOrb}>
            <HeartFilled />
          </div>

          <div className={`${styles.loveplacePet} ${styles.petImageOne}`}>
            <Image
              alt="HELPet ljubimac"
              className={styles.loveplaceImage}
              fill
              sizes="110px"
              src="/images/logo3.png"
            />
          </div>

          <div className={`${styles.loveplacePetSecond} ${styles.petImageTwo}`}>
            <Image
              alt="HELPet ljubimac"
              className={styles.loveplaceImage}
              fill
              sizes="110px"
              src="/images/logo2.png"
            />
          </div>

          <div className={styles.loveplaceBadge}>
            <HeartFilled />
            <span>Nova prijateljstva</span>
          </div>
        </div>

        <div className={styles.loveplaceContent}>
          <span className={styles.sectionEyebrow}>LOVEPLACE</span>

          <h2>
            Jer svaki
            <br />
            ljubimac zaslužuje
            <br />
            <strong>prijatelja.</strong>
          </h2>

          <p>
            LovePlace je prostor za upoznavanje ljubimaca. Pogledaj profile,
            pronađi zanimljive ljubimce i poveži se sa njihovim vlasnicima.
          </p>

          <button
            className={styles.orangeButton}
            onClick={() => router.push("/dashboard/loveplace")}
          >
            Otvori LovePlace
            <ArrowRightOutlined />
          </button>
        </div>
      </section>

      {/* =====================================================
      FINAL CTA
      ===================================================== */}
      <section className={styles.finalCta}>
        <div className={styles.finalGlow} />

        <div className={styles.finalLogo}>
          <Image
            alt="HELPet"
            className={styles.finalLogoImage}
            fill
            sizes="180px"
            src="/images/logo1.png"
          />
        </div>

        <span className={styles.sectionEyebrow}>HELPet</span>

        <h2>
          Spreman za
          <br />
          <strong>HELPet?</strong>
        </h2>

        <p>
          Dodaj svog prvog ljubimca i počni da koristiš sve što HELPet nudi.
        </p>

        <Button
          icon={<PlusOutlined />}
          size="large"
          type="primary"
          onClick={() => router.push("/dashboard/profile/add-pet")}
        >
          Dodaj ljubimca
        </Button>
      </section>

      {/* =====================================================
      FOOTER
      ===================================================== */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <div className={styles.footerLogo}>
            <Image
              alt="HELPet"
              className={styles.footerLogoImage}
              fill
              sizes="140px"
              src="/images/logo1.png"
            />
          </div>

          <span>Briga o ljubimcima, jednostavnija.</span>
        </div>

        <span>© 2026 HELPet</span>
      </footer>
    </main>
  );
}
