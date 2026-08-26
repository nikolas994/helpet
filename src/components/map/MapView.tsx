"use client";

import {
  EnvironmentOutlined,
  SearchOutlined,
  ShopOutlined,
  ScissorOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  GlobalOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import * as L from "leaflet";

import { Input } from "antd";
import { useEffect, useMemo, useState } from "react";

import pb from "../../app/lib/pocketbase";
import type { Location } from "@/types/location";

import styles from "./MapView.module.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;

type LocationType = Location["type"];

const center: [number, number] = [44.7866, 20.4489];

const locationConfig: Record<
  LocationType,
  {
    label: string;
    icon: React.ReactNode;
    emoji: string;
    color: string;
  }
> = {
  vet: {
    label: "Veterinar",
    icon: <MedicineBoxOutlined />,
    emoji: "🩺",
    color: "#e47722",
  },

  shop: {
    label: "Pet shop",
    icon: <ShopOutlined />,
    emoji: "🛍️",
    color: "#5578c9",
  },

  salon: {
    label: "Pet salon",
    icon: <ScissorOutlined />,
    emoji: "✨",
    color: "#9655b5",
  },

  hotel: {
    label: "Pet hotel",
    icon: <HomeOutlined />,
    emoji: "🏠",
    color: "#4caa76",
  },
};

/* =========================================================
   CUSTOM MARKER
========================================================= */

const createIcon = (type: LocationType) => {
  const config = locationConfig[type];

  return L.divIcon({
    className: "custom-map-marker",

    html: `
      <div
        class="marker-pin marker-${type}"
        style="--marker-color: ${config.color};"
      >
        <div class="marker-pulse"></div>

        <div class="marker-tail"></div>

        <div class="marker-inner">
          <span class="marker-emoji">
            ${config.emoji}
          </span>
        </div>
      </div>
    `,

    iconSize: [64, 76],
    iconAnchor: [32, 70],
    popupAnchor: [0, -65],
  });
};

/* =========================================================
   MAP CONTROLLER
========================================================= */

function FlyToLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;

    map.flyTo(position, 15, {
      duration: 1.1,
      easeLinearity: 0.25,
    });
  }, [position, map]);

  return null;
}

/* =========================================================
   ZOOM CONTROLLER
========================================================= */

function ZoomController() {
  const map = useMap();

  useEffect(() => {
    const zoomIn = () => map.zoomIn();
    const zoomOut = () => map.zoomOut();

    window.addEventListener("leaflet-zoom-in", zoomIn);
    window.addEventListener("leaflet-zoom-out", zoomOut);

    return () => {
      window.removeEventListener("leaflet-zoom-in", zoomIn);
      window.removeEventListener("leaflet-zoom-out", zoomOut);
    };
  }, [map]);

  return null;
}

/* =========================================================
   IMAGE
========================================================= */

const getImageUrl = (record: any) => {
  if (!record.image) return null;

  return pb.files.getURL(record, record.image);
};

/* =========================================================
   COMPONENT
========================================================= */

export default function MapView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filter, setFilter] = useState<LocationType | null>(null);
  const [search, setSearch] = useState("");
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  /* =======================================================
     LOAD LOCATIONS
  ======================================================= */

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await pb.collection("locations").getFullList<Location>({
          sort: "name",
          requestKey: null,
        });

        setLocations(data);
      } catch (error: any) {
        if (
          error?.name === "AbortError" ||
          error?.originalError?.name === "AbortError" ||
          error?.status === 0
        ) {
          return;
        }

        console.error("Greška pri učitavanju lokacija:", error);
      }
    };

    fetchLocations();
  }, []);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredLocations = useMemo(() => {
    if (!filter) return locations;

    return locations.filter((location) => location.type === filter);
  }, [locations, filter]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const handleSearch = (value: string) => {
    const query = value.toLowerCase().trim();

    setSearch(value);

    if (!query) {
      setFlyTo(center);
      return;
    }

    const found = locations.find((location) => {
      return (
        location.name?.toLowerCase().includes(query) ||
        location.address?.toLowerCase().includes(query)
      );
    });

    if (found) {
      setFlyTo([found.lat, found.lng]);
    } else {
      setFlyTo(center);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* ===================================================
          TOP BAR
      =================================================== */}

      <div className={styles.topBar}>
        <div className={styles.searchBox}>
          <div className={styles.searchIcon}>
            <SearchOutlined />
          </div>

          <Input
            variant="borderless"
            placeholder="Pretraži lokaciju..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onPressEnter={() => handleSearch(search)}
          />

          <button
            className={styles.searchButton}
            onClick={() => handleSearch(search)}
          >
            <span>Pretraži</span>
            <ArrowRightOutlined />
          </button>
        </div>
      </div>

      {/* ===================================================
          FILTERS
      =================================================== */}

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${
            filter === null ? styles.active : ""
          }`}
          onClick={() => setFilter(null)}
        >
          <span className={styles.filterIcon}>
            <EnvironmentOutlined />
          </span>

          <span>Sve lokacije</span>

          <small>{locations.length}</small>
        </button>

        {(Object.keys(locationConfig) as LocationType[]).map((type) => {
          const config = locationConfig[type];

          const count = locations.filter(
            (location) => location.type === type,
          ).length;

          return (
            <button
              key={type}
              className={`${styles.filterButton} ${
                filter === type ? styles.active : ""
              } ${styles[`filter-${type}`]}`}
              onClick={() => setFilter(filter === type ? null : type)}
            >
              <span className={styles.filterIcon}>{config.icon}</span>

              <span>{config.label}</span>

              <small>{count}</small>
            </button>
          );
        })}
      </div>

      {/* ===================================================
          MAP
      =================================================== */}

      <MapContainer
        center={center}
        zoom={14}
        className={styles.map}
        zoomControl={false}
        attributionControl
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />

        <FlyToLocation position={flyTo} />
        <ZoomController />

        {filteredLocations.map((loc) => {
          const config = locationConfig[loc.type];
          const imageUrl = getImageUrl(loc);

          return (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={createIcon(loc.type)}
            >
              <Popup closeButton className="modern-map-popup">
                <div
                  className={`${styles.popup} ${styles[`popup-${loc.type}`]}`}
                >
                  {/* IMAGE */}

                  {imageUrl ? (
                    <div className={styles.popupImage}>
                      <img src={imageUrl} alt={loc.name} />

                      <div className={styles.popupOverlay} />

                      <div
                        className={styles.popupType}
                        style={{ color: config.color }}
                      >
                        <span
                          className={styles.popupTypeIcon}
                          style={{
                            background: `${config.color}18`,
                            color: config.color,
                          }}
                        >
                          {config.icon}
                        </span>

                        {config.label}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={styles.popupImagePlaceholder}
                      style={{
                        background: `linear-gradient(
                          135deg,
                          ${config.color}12,
                          ${config.color}30
                        )`,
                        color: config.color,
                      }}
                    >
                      <span>{config.emoji}</span>
                    </div>
                  )}

                  {/* CONTENT */}

                  <div className={styles.popupContent}>
                    <div className={styles.popupTitleRow}>
                      <div>
                        <div className={styles.popupMiniLabel}>HELPet</div>

                        <h3>{loc.name}</h3>
                      </div>
                    </div>

                    {loc.address && (
                      <div className={styles.popupRow}>
                        <span
                          className={styles.popupRowIcon}
                          style={{ color: config.color }}
                        >
                          <EnvironmentOutlined />
                        </span>

                        <span>{loc.address}</span>
                      </div>
                    )}

                    {loc.phone && (
                      <div className={styles.popupRow}>
                        <span
                          className={styles.popupRowIcon}
                          style={{ color: config.color }}
                        >
                          <PhoneOutlined />
                        </span>

                        <span>{loc.phone}</span>
                      </div>
                    )}

                    {loc.website && (
                      <a
                        href={loc.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.website}
                        style={{ color: config.color }}
                      >
                        <GlobalOutlined />

                        <span>Poseti website</span>

                        <ArrowRightOutlined className={styles.websiteArrow} />
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* ===================================================
          LEGEND
      =================================================== */}

      <div className={styles.legend}>
        <div className={styles.legendHeader}>
          <span className={styles.legendBrandDot} />

          <span>HELPet mapa</span>
        </div>

        <div className={styles.legendItems}>
          {(Object.keys(locationConfig) as LocationType[]).map((type) => {
            const config = locationConfig[type];

            return (
              <div key={type} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{
                    background: config.color,
                    boxShadow: `0 0 0 4px ${config.color}18`,
                  }}
                />

                <span>{config.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================
          ZOOM
      =================================================== */}
    </div>
  );
}
