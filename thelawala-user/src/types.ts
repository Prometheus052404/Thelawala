export type VendorInfo = {
  thelaId: string;
  vendorId: string;
  location: { lat: number; lng: number };
  inventory: { id: string; name: string; quantity: number }[];
  distance?: number;
};
