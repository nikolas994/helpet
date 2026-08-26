// import-locations.js
const POCKETBASE_URL = "http://127.0.0.1:8090";

// Geografski opseg (Bounding Box): jug, zapad, sever, istok (Beograd i okolina)
const BBOX = "44.70,20.30,44.88,20.60";

// Overpass QL upit
const query = `
  [out:json][timeout:60];
  (
    node["amenity"="veterinary"](${BBOX});
    node["shop"="pet"](${BBOX});
    node["shop"="pet_grooming"](${BBOX});
  );
  out body;
`;

async function importLocations() {
  try {
    console.log("🔍 Preuzimam podatke sa OpenStreetMap-a...");

    // Koristimo direktan POST zahtev na primarni Overpass API endpoint sa User-Agent zaglavljem
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "HelpetApp/1.0 (contact@helpet.app)",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    const rawText = await response.text();

    if (!response.ok || rawText.trim().startsWith("<")) {
      console.error(
        "Server je vratio HTML grešku umesto JSON-a. Odgovor servera:",
      );
      console.error(rawText.substring(0, 300));
      return;
    }

    const data = JSON.parse(rawText);

    if (!data.elements || data.elements.length === 0) {
      console.log("Nije pronađena nijedna lokacija u zadatom opsegu.");
      return;
    }

    console.log(
      `🚀 Pronađeno ${data.elements.length} lokacija! Započinjem uvoz u PocketBase...`,
    );

    let importedCount = 0;

    for (const el of data.elements) {
      if (!el.tags || !el.tags.name) continue;

      let type = "shop";
      if (el.tags.amenity === "veterinary") type = "vet";
      if (el.tags.shop === "pet_grooming") type = "salon";

      const street = el.tags["addr:street"] || "";
      const housenumber = el.tags["addr:housenumber"] || "";
      const fullAddress =
        `${street} ${housenumber}`.trim() || el.tags["addr:city"] || "";

      const newRecord = {
        name: el.tags.name,
        type: type,
        lat: el.lat,
        lng: el.lon,
        address: fullAddress,
        phone: el.tags.phone || el.tags["contact:phone"] || "",
        website: el.tags.website || el.tags["contact:website"] || "",
      };

      try {
        const pbRes = await fetch(
          `${POCKETBASE_URL}/api/collections/locations/records`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newRecord),
          },
        );

        if (pbRes.ok) {
          console.log(`✅ Ubaceno: [${type.toUpperCase()}] ${newRecord.name}`);
          importedCount++;
        } else {
          const errData = await pbRes.json();
          console.error(
            `❌ Greška pri upisu za ${newRecord.name}:`,
            JSON.stringify(errData),
          );
        }
      } catch (err) {
        console.error(`❌ Mrežna greška za ${newRecord.name}:`, err.message);
      }
    }

    console.log(
      `\n🎉 Uvoz uspešno završen! Ukupno ubačeno ${importedCount} lokacija.`,
    );
  } catch (error) {
    console.error("Fatalna greška tokom preuzimanja:", error);
  }
}

importLocations();
