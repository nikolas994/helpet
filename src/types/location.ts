export interface Location {
  id: string;
  name: string;
  type: "vet" | "shop" | "salon" | "hotel";
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  image?: File;
}
