"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#eef0f2",
        color: "#777e86",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
      }}
    >
      Učitavanje HELPet mape...
    </div>
  ),
});

export default function MapPage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        margin: 0,
        padding: 0,
      }}
    >
      <MapView />
    </div>
  );
}
