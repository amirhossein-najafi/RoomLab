import type { CatalogCategory } from "@/domain/catalog";

export const ROOM_PRESETS: Array<{ id: CatalogCategory; width: string; depth: string }> = [
  { id: "living", width: "5.2", depth: "4" },
  { id: "dining", width: "3.6", depth: "3.2" },
  { id: "kitchen", width: "3.6", depth: "2.8" },
  { id: "bedroom", width: "4.2", depth: "3.6" },
  { id: "bathroom", width: "2.4", depth: "2.1" },
  { id: "office", width: "3.6", depth: "3.2" },
  { id: "entry", width: "2.4", depth: "1.8" },
  { id: "laundry", width: "2.2", depth: "1.8" },
];
