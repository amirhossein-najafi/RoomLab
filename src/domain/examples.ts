import { getCatalogItem } from "@/domain/catalog";
import { addFurniture, createProject, setFurnitureList } from "@/domain/commands";
import type { Furniture, ProjectDocument } from "@/domain/schema";
import { uid } from "@/domain/ids";

export type LayoutId = "A" | "B" | "C";
export type RoomKind = "living" | "dining" | "kitchen" | "bedroom" | "bathroom" | "office" | "entry" | "laundry";

export function roomKind(name: string): RoomKind {
  const value = name.toLowerCase();
  if (value.includes("laundry") || value.includes("لباسشویی")) return "laundry";
  if (value.includes("bath") || value.includes("حمام") || value.includes("دستشویی") || value.includes("سرویس")) return "bathroom";
  if (value.includes("kitchen") || value.includes("آشپز")) return "kitchen";
  if (value.includes("dining") || value.includes("ناهار")) return "dining";
  if (value.includes("entry") || value.includes("hall") || value.includes("ورودی") || value.includes("راهرو")) return "entry";
  if (value.includes("office") || value.includes("studio") || value.includes("دفتر")) return "office";
  if (value.includes("living") || value.includes("نشیم")) return "living";
  if (value.includes("bed") || value.includes("خواب")) return "bedroom";
  return "living";
}

function place(doc: ProjectDocument, catalogId: string, x: number, y: number, rotation = 0, used?: Set<string>): Furniture {
  const item = getCatalogItem(catalogId);
  if (!item) {
    return {
      id: uid(),
      catalogItemId: catalogId,
      x,
      y,
      width: 80,
      depth: 80,
      height: 80,
      rotation,
      color: "#d8c3a5",
      groupId: null,
    };
  }
  const existing = doc.furniture.find((entry) => !used?.has(entry.id) && getCatalogItem(entry.catalogItemId)?.kind === item.kind);
  if (existing) {
    used?.add(existing.id);
    return { ...existing, x, y, rotation, width: item.width, depth: item.depth, height: item.height };
  }
  const id = uid();
  used?.add(id);
  return {
    id,
    catalogItemId: item.id,
    x,
    y,
    width: item.width,
    depth: item.depth,
    height: item.height,
    rotation,
    color: item.color,
    groupId: null,
  };
}

function arrange(doc: ProjectDocument, slots: Array<[string, number, number, number?]>): Furniture[] {
  const used = new Set<string>();
  return slots.map(([catalogId, x, y, rotation]) => place(doc, catalogId, x, y, rotation ?? 0, used));
}

export function suggestLayouts(doc: ProjectDocument): { id: LayoutId; furniture: Furniture[] }[] {
  const kind = roomKind(doc.room.name);
  const w = doc.room.width;
  const d = doc.room.depth;
  if (kind === "kitchen") {
    return [
      { id: "A", furniture: arrange(doc, [["generic-fridge", 50, d - 50], ["generic-cooker", 140, d - 45], ["generic-sink", w - 60, d - 45], ["generic-island", w / 2, d * 0.38]]) },
      { id: "B", furniture: arrange(doc, [["generic-fridge", 50, d / 2, 90], ["generic-cabinet", w / 2, d - 45], ["generic-cooker", w - 50, d - 45], ["generic-dishwasher", w - 50, d - 120]]) },
      { id: "C", furniture: arrange(doc, [["generic-sink", w / 2, d - 45], ["generic-cabinet", 55, d - 45], ["generic-stool", w / 2 - 40, d * 0.45], ["generic-stool", w / 2 + 40, d * 0.45]]) },
    ];
  }
  if (kind === "dining") {
    return [
      { id: "A", furniture: arrange(doc, [["generic-dining-table", w / 2, d / 2], ["generic-dining-chair", w / 2 - 40, d / 2 + 70], ["generic-dining-chair", w / 2 + 40, d / 2 + 70], ["generic-dining-chair", w / 2, d / 2 - 70, 180], ["generic-sideboard", w / 2, d - 40]]) },
      { id: "B", furniture: arrange(doc, [["generic-dining-table", w / 2, d * 0.42], ["generic-dining-chair", 50, d * 0.42, 90], ["generic-dining-chair", w - 50, d * 0.42, 90], ["generic-sideboard", w / 2, 40]]) },
      { id: "C", furniture: arrange(doc, [["muji-dining-table", w / 2, d / 2], ["ikea-dining-chair", w / 2, d / 2 + 65], ["ikea-dining-chair", w / 2, d / 2 - 65, 180], ["muji-pendant", w / 2, d / 2]]) },
    ];
  }
  if (kind === "bathroom") {
    return [
      { id: "A", furniture: arrange(doc, [["generic-vanity", w / 2, 40], ["generic-toilet", w - 40, d - 50], ["generic-shower", 55, d - 55]]) },
      { id: "B", furniture: arrange(doc, [["generic-bathtub", w / 2, d - 50], ["generic-vanity", 55, 40], ["generic-toilet", w - 40, 55]]) },
      { id: "C", furniture: arrange(doc, [["generic-shower", w - 55, d / 2, 90], ["ikea-vanity", 45, 40], ["generic-bath-mirror", 45, 70]]) },
    ];
  }
  if (kind === "entry") {
    return [
      { id: "A", furniture: arrange(doc, [["generic-console", w / 2, d - 30], ["generic-bench", w / 2, d / 2], ["generic-shoe", 50, 40]]) },
      { id: "B", furniture: arrange(doc, [["generic-shoe", w / 2, d - 30], ["generic-coat", 40, d - 40], ["generic-bench", w / 2, 40]]) },
      { id: "C", furniture: arrange(doc, [["ikea-shoe", 50, d / 2, 90], ["generic-console", w - 40, d / 2, 90], ["generic-coat", w - 40, 40]]) },
    ];
  }
  if (kind === "laundry") {
    return [
      { id: "A", furniture: arrange(doc, [["generic-washer", 50, d - 45], ["generic-dryer", 120, d - 45], ["generic-laundry-cabinet", w - 50, d / 2, 90]]) },
      { id: "B", furniture: arrange(doc, [["generic-washer", w / 2 - 35, d / 2], ["generic-dryer", w / 2 + 35, d / 2], ["generic-laundry-cabinet", w / 2, 40]]) },
      { id: "C", furniture: arrange(doc, [["generic-washer", 45, 50], ["generic-dryer", 45, d - 50], ["generic-cabinet", w - 50, d / 2, 90]]) },
    ];
  }
  if (kind === "office") {
    return [
      { id: "A", furniture: [place(doc, "generic-desk", w / 2, d - 55), place(doc, "generic-office-chair", w / 2, d - 150)] },
      { id: "B", furniture: [place(doc, "generic-desk", w - 90, d / 2, 90), place(doc, "generic-office-chair", w - 180, d / 2, 90)] },
      { id: "C", furniture: [place(doc, "generic-desk", 90, 70), place(doc, "generic-office-chair", 90, 160), place(doc, "generic-lamp", w - 40, d - 40)] },
    ];
  }
  if (kind === "living") {
    return [
      {
        id: "A",
        furniture: [
          place(doc, "generic-sofa", w / 2, d - 70),
          place(doc, "generic-coffee", w / 2, d / 2),
          place(doc, "generic-tv", w / 2, 40),
        ],
      },
      {
        id: "B",
        furniture: [
          place(doc, "generic-sofa", 80, d / 2, 90),
          place(doc, "generic-coffee", w / 2, d / 2),
          place(doc, "generic-tv", w - 40, d / 2, 90),
        ],
      },
      {
        id: "C",
        furniture: [
          place(doc, "generic-sofa", w / 2, 80, 180),
          place(doc, "generic-chair", w - 50, d - 50),
          place(doc, "generic-lamp", 40, d - 40),
        ],
      },
    ];
  }
  return [
    {
      id: "A",
      furniture: [
        place(doc, "generic-bed", w / 2, d - 110),
        place(doc, "generic-wardrobe", w - 50, d / 2, 90),
      ],
    },
    {
      id: "B",
      furniture: [
        place(doc, "generic-bed", 130, d / 2, 90),
        place(doc, "generic-wardrobe", w - 50, 80, 90),
        place(doc, "generic-lamp", 40, d - 40),
      ],
    },
    {
      id: "C",
      furniture: [
        place(doc, "generic-bed", w * 0.32, d - 110),
        place(doc, "generic-desk", w - 90, 70),
        place(doc, "generic-office-chair", w - 90, 160),
      ],
    },
  ];
}

export function applyLayout(doc: ProjectDocument, furniture: Furniture[]) {
  return setFurnitureList(doc, furniture);
}

export function exampleBedroom() {
  let doc = createProject(
    { name: "Bedroom", widthM: 4.2, depthM: 3.6, title: "Alex's Minimal Bedroom" },
    "alex",
  );
  doc.isPublic = true;
  doc.budgetLimit = 1500;
  const bed = getCatalogItem("generic-bed");
  const wardrobe = getCatalogItem("generic-wardrobe");
  const desk = getCatalogItem("generic-desk");
  const chair = getCatalogItem("generic-office-chair");
  if (bed) doc = addFurniture(doc, bed, 210, 250, "alex-bed");
  if (wardrobe) doc = addFurniture(doc, wardrobe, 362, 250, "alex-wardrobe", 90);
  if (desk) doc = addFurniture(doc, desk, 220, 40, "alex-desk");
  if (chair) doc = addFurniture(doc, chair, 220, 120, "alex-chair");
  return doc;
}

export function exampleLiving() {
  let doc = createProject({ name: "Living Room", widthM: 5.2, depthM: 4, title: "South Light Living" }, "living");
  doc.isPublic = true;
  const sofa = getCatalogItem("generic-sofa");
  const table = getCatalogItem("generic-coffee");
  const tv = getCatalogItem("generic-tv");
  const lamp = getCatalogItem("generic-lamp");
  if (sofa) doc = addFurniture(doc, sofa, 260, 330, "living-sofa");
  if (table) doc = addFurniture(doc, table, 260, 210, "living-table");
  if (tv) doc = addFurniture(doc, tv, 260, 40, "living-tv");
  if (lamp) doc = addFurniture(doc, lamp, 80, 80, "living-lamp");
  return doc;
}

export function exampleOffice() {
  let doc = createProject({ name: "Office", widthM: 3.6, depthM: 3.2, title: "Studio Office" }, "office");
  doc.isPublic = true;
  const desk = getCatalogItem("generic-desk");
  const chair = getCatalogItem("generic-office-chair");
  const lamp = getCatalogItem("generic-lamp");
  if (desk) doc = addFurniture(doc, desk, 180, 250, "office-desk");
  if (chair) doc = addFurniture(doc, chair, 180, 160, "office-chair");
  if (lamp) doc = addFurniture(doc, lamp, 40, 40, "office-lamp");
  return doc;
}

export function exampleKitchen() {
  let doc = createProject({ name: "Kitchen", widthM: 3.6, depthM: 2.8, title: "Weeknight Kitchen" }, "kitchen");
  doc.isPublic = true;
  const fridge = getCatalogItem("generic-fridge");
  const cooker = getCatalogItem("generic-cooker");
  const sink = getCatalogItem("generic-sink");
  const island = getCatalogItem("generic-island");
  if (fridge) doc = addFurniture(doc, fridge, 50, 230, "kitchen-fridge");
  if (cooker) doc = addFurniture(doc, cooker, 140, 235, "kitchen-cooker");
  if (sink) doc = addFurniture(doc, sink, 300, 235, "kitchen-sink");
  if (island) doc = addFurniture(doc, island, 180, 110, "kitchen-island");
  return doc;
}

export function exampleBathroom() {
  let doc = createProject({ name: "Bathroom", widthM: 2.4, depthM: 2.1, title: "Quiet Bathroom" }, "bath");
  doc.isPublic = true;
  const vanity = getCatalogItem("generic-vanity");
  const toilet = getCatalogItem("generic-toilet");
  const shower = getCatalogItem("generic-shower");
  if (vanity) doc = addFurniture(doc, vanity, 120, 40, "bath-vanity");
  if (toilet) doc = addFurniture(doc, toilet, 200, 160, "bath-toilet");
  if (shower) doc = addFurniture(doc, shower, 55, 155, "bath-shower");
  return doc;
}

export function allExamples() {
  return [exampleBedroom(), exampleLiving(), exampleOffice(), exampleKitchen(), exampleBathroom()];
}

export function exampleBySlug(slug: string) {
  return allExamples().find((doc) => doc.slug === slug) ?? null;
}
