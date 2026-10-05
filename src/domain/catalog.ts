export type CatalogKind =
  | "sofa"
  | "armchair"
  | "chair"
  | "dining-chair"
  | "office-chair"
  | "stool"
  | "bench"
  | "coffee-table"
  | "side-table"
  | "dining-table"
  | "console"
  | "desk"
  | "island"
  | "bed"
  | "wardrobe"
  | "dresser"
  | "nightstand"
  | "bookshelf"
  | "sideboard"
  | "cabinet"
  | "shoe-cabinet"
  | "filing"
  | "lamp"
  | "tv"
  | "rug"
  | "plant"
  | "mirror"
  | "fridge"
  | "cooker"
  | "sink"
  | "dishwasher"
  | "toilet"
  | "vanity"
  | "bathtub"
  | "shower"
  | "washer"
  | "dryer"
  | "coat-rack";

export type CatalogBrand = "ikea" | "muji" | "west-elm" | "generic";
export type CatalogCategory = "living" | "dining" | "kitchen" | "bedroom" | "bathroom" | "office" | "entry" | "laundry";

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  "living",
  "dining",
  "kitchen",
  "bedroom",
  "bathroom",
  "office",
  "entry",
  "laundry",
];

export type CatalogItem = {
  id: string;
  brand: CatalogBrand;
  category: CatalogCategory;
  kind: CatalogKind;
  name: string;
  width: number;
  depth: number;
  height: number;
  price: number;
  color: string;
  colorName: string;
  url: string;
};

function piece(
  id: string,
  brand: CatalogBrand,
  category: CatalogCategory,
  kind: CatalogKind,
  name: string,
  width: number,
  depth: number,
  height: number,
  price: number,
  color: string,
  colorName: string,
  url: string,
): CatalogItem {
  return { id, brand, category, kind, name, width, depth, height, price, color, colorName, url };
}

const g = (id: string, category: CatalogCategory, kind: CatalogKind, name: string, width: number, depth: number, height: number, price: number, color: string, colorName: string) =>
  piece(id, "generic", category, kind, name, width, depth, height, price, color, colorName, `https://example.com/catalog/${id}`);

export const CATALOG: CatalogItem[] = [
  g("generic-sofa", "living", "sofa", "Sofa", 240, 95, 85, 899, "#d8c3a5", "beige"),
  piece("ikea-sofa", "ikea", "living", "sofa", "Strand Sofa", 228, 88, 80, 499, "#b9b4ae", "gray", "https://www.ikea.com/"),
  piece("muji-sofa", "muji", "living", "sofa", "Plain Sofa", 200, 90, 78, 1200, "#ebe6dc", "white", "https://www.muji.com/"),
  piece("westelm-sofa", "west-elm", "living", "sofa", "Haven Sofa", 240, 100, 86, 1800, "#2c3a4f", "navy", "https://www.westelm.com/"),
  g("generic-armchair", "living", "armchair", "Armchair", 85, 85, 80, 320, "#6b4b32", "walnut"),
  piece("ikea-armchair", "ikea", "living", "armchair", "Nook Chair", 78, 80, 76, 149, "#b9b4ae", "gray", "https://www.ikea.com/"),
  piece("westelm-armchair", "west-elm", "living", "armchair", "Lounge Chair", 90, 90, 78, 890, "#2c3a4f", "navy", "https://www.westelm.com/"),
  g("generic-chair", "living", "chair", "Side Chair", 55, 55, 80, 180, "#6b4b32", "walnut"),
  g("generic-coffee", "living", "coffee-table", "Coffee Table", 120, 60, 40, 220, "#6b4b32", "walnut"),
  g("generic-side-table", "living", "side-table", "Side Table", 45, 45, 50, 70, "#6b4b32", "walnut"),
  g("generic-tv", "living", "tv", "Media Console", 160, 40, 50, 450, "#242424", "black"),
  g("generic-lamp", "living", "lamp", "Arc Lamp", 40, 40, 160, 90, "#d8c3a5", "beige"),
  g("generic-rug", "living", "rug", "Wool Rug", 240, 160, 2, 180, "#c4a882", "beige"),
  g("generic-bookshelf", "living", "bookshelf", "Open Shelf", 80, 35, 180, 260, "#c4a574", "oak"),
  g("generic-plant", "living", "plant", "Floor Plant", 40, 40, 140, 45, "#3d6b45", "green"),

  g("generic-dining-table", "dining", "dining-table", "Dining Table", 160, 90, 75, 480, "#6b4b32", "walnut"),
  piece("westelm-dining-table", "west-elm", "dining", "dining-table", "Pedestal Table", 180, 90, 76, 1200, "#6b4b32", "walnut", "https://www.westelm.com/"),
  piece("muji-dining-table", "muji", "dining", "dining-table", "Straight Table", 140, 80, 72, 650, "#c4a574", "oak", "https://www.muji.com/"),
  g("generic-dining-chair", "dining", "dining-chair", "Dining Chair", 46, 50, 90, 90, "#6b4b32", "walnut"),
  piece("ikea-dining-chair", "ikea", "dining", "dining-chair", "Stack Chair", 45, 48, 80, 35, "#b9b4ae", "gray", "https://www.ikea.com/"),
  g("generic-sideboard", "dining", "sideboard", "Sideboard", 160, 45, 80, 420, "#6b4b32", "walnut"),
  piece("muji-pendant", "muji", "dining", "lamp", "Pendant Lamp", 35, 35, 40, 120, "#ebe6dc", "white", "https://www.muji.com/"),

  g("generic-fridge", "kitchen", "fridge", "Fridge", 70, 70, 180, 650, "#f4f1ea", "white"),
  g("generic-cooker", "kitchen", "cooker", "Range Cooker", 60, 60, 90, 540, "#242424", "black"),
  g("generic-sink", "kitchen", "sink", "Kitchen Sink", 80, 60, 90, 280, "#f4f1ea", "white"),
  g("generic-cabinet", "kitchen", "cabinet", "Base Cabinet", 80, 60, 90, 160, "#f4f1ea", "white"),
  piece("ikea-cabinet", "ikea", "kitchen", "cabinet", "Run Cabinet", 60, 60, 90, 90, "#f4f1ea", "white", "https://www.ikea.com/"),
  g("generic-island", "kitchen", "island", "Kitchen Island", 140, 70, 90, 520, "#6b4b32", "walnut"),
  g("generic-dishwasher", "kitchen", "dishwasher", "Dishwasher", 60, 60, 85, 380, "#f4f1ea", "white"),
  g("generic-stool", "kitchen", "stool", "Counter Stool", 40, 40, 75, 70, "#242424", "black"),
  piece("muji-stool", "muji", "kitchen", "stool", "Low Stool", 36, 36, 45, 55, "#c4a574", "oak", "https://www.muji.com/"),

  g("generic-bed", "bedroom", "bed", "Platform Bed", 160, 200, 100, 550, "#d8c3a5", "beige"),
  piece("ikea-bed", "ikea", "bedroom", "bed", "Fjord Bed", 140, 200, 90, 299, "#f4f1ea", "white", "https://www.ikea.com/"),
  piece("muji-bed", "muji", "bedroom", "bed", "Low Bed", 160, 200, 80, 890, "#c4a574", "oak", "https://www.muji.com/"),
  piece("westelm-bed", "west-elm", "bedroom", "bed", "Upholstered Bed", 180, 200, 120, 1400, "#2c3a4f", "navy", "https://www.westelm.com/"),
  g("generic-wardrobe", "bedroom", "wardrobe", "Wardrobe", 120, 60, 210, 700, "#6b4b32", "walnut"),
  piece("ikea-wardrobe", "ikea", "bedroom", "wardrobe", "Compact Wardrobe", 100, 55, 180, 350, "#f4f1ea", "white", "https://www.ikea.com/"),
  g("generic-nightstand", "bedroom", "nightstand", "Nightstand", 50, 40, 50, 80, "#6b4b32", "walnut"),
  piece("ikea-nightstand", "ikea", "bedroom", "nightstand", "Bedside Table", 48, 38, 45, 40, "#f4f1ea", "white", "https://www.ikea.com/"),
  piece("muji-nightstand", "muji", "bedroom", "nightstand", "Low Nightstand", 45, 40, 35, 95, "#c4a574", "oak", "https://www.muji.com/"),
  g("generic-dresser", "bedroom", "dresser", "Dresser", 120, 48, 80, 340, "#6b4b32", "walnut"),
  g("generic-mirror", "bedroom", "mirror", "Floor Mirror", 50, 8, 170, 120, "#1b1d20", "black"),
  g("generic-bed-lamp", "bedroom", "lamp", "Bedside Lamp", 25, 25, 45, 40, "#d8c3a5", "beige"),
  g("generic-bedroom-rug", "bedroom", "rug", "Bedroom Rug", 200, 140, 2, 150, "#8d6a55", "beige"),

  g("generic-toilet", "bathroom", "toilet", "Toilet", 40, 70, 80, 180, "#f4f1ea", "white"),
  g("generic-vanity", "bathroom", "vanity", "Vanity", 90, 48, 85, 320, "#f4f1ea", "white"),
  piece("ikea-vanity", "ikea", "bathroom", "vanity", "Compact Vanity", 60, 45, 80, 150, "#f4f1ea", "white", "https://www.ikea.com/"),
  g("generic-bathtub", "bathroom", "bathtub", "Bathtub", 170, 75, 60, 490, "#f7f7f5", "white"),
  g("generic-shower", "bathroom", "shower", "Shower", 90, 90, 210, 420, "#d5dde3", "white"),
  g("generic-bath-mirror", "bathroom", "mirror", "Bath Mirror", 70, 6, 80, 60, "#c8cdd2", "gray"),

  g("generic-desk", "office", "desk", "Work Desk", 140, 70, 75, 220, "#6b4b32", "walnut"),
  piece("westelm-desk", "west-elm", "office", "desk", "Studio Desk", 160, 70, 75, 640, "#6b4b32", "walnut", "https://www.westelm.com/"),
  g("generic-office-chair", "office", "office-chair", "Office Chair", 65, 65, 110, 160, "#242424", "black"),
  piece("muji-chair", "muji", "office", "office-chair", "Task Chair", 60, 60, 95, 240, "#b9b4ae", "gray", "https://www.muji.com/"),
  g("generic-filing", "office", "filing", "Filing Cabinet", 45, 50, 70, 140, "#b9b4ae", "gray"),
  g("generic-office-shelf", "office", "bookshelf", "Bookcase", 80, 30, 180, 190, "#6b4b32", "walnut"),
  piece("westelm-office-shelf", "west-elm", "office", "bookshelf", "Library Shelf", 100, 35, 200, 540, "#6b4b32", "walnut", "https://www.westelm.com/"),

  g("generic-console", "entry", "console", "Console Table", 110, 35, 80, 180, "#6b4b32", "walnut"),
  g("generic-shoe", "entry", "shoe-cabinet", "Shoe Cabinet", 80, 35, 120, 150, "#f4f1ea", "white"),
  piece("ikea-shoe", "ikea", "entry", "shoe-cabinet", "Hall Cabinet", 70, 30, 90, 80, "#f4f1ea", "white", "https://www.ikea.com/"),
  g("generic-coat", "entry", "coat-rack", "Coat Rack", 40, 40, 180, 60, "#6b4b32", "walnut"),
  g("generic-bench", "entry", "bench", "Entry Bench", 100, 40, 45, 120, "#6b4b32", "walnut"),

  g("generic-washer", "laundry", "washer", "Washer", 60, 65, 85, 420, "#f4f1ea", "white"),
  g("generic-dryer", "laundry", "dryer", "Dryer", 60, 65, 85, 380, "#f4f1ea", "white"),
  g("generic-laundry-cabinet", "laundry", "cabinet", "Laundry Cabinet", 80, 40, 180, 200, "#f4f1ea", "white"),
];

let remoteCatalog: CatalogItem[] | null = null;

export function setRemoteCatalog(items: CatalogItem[] | null) {
  remoteCatalog = items && items.length ? items : null;
}

export function allCatalog() {
  return remoteCatalog ?? CATALOG;
}

export function getCatalogItem(id: string) {
  return allCatalog().find((item) => item.id === id) ?? CATALOG.find((item) => item.id === id);
}

export function budgetTotal(items: { catalogItemId: string }[]) {
  return items.reduce((sum, item) => sum + (getCatalogItem(item.catalogItemId)?.price ?? 0), 0);
}

export const KIND_EMOJI: Record<CatalogKind, string> = {
  sofa: "🛋",
  armchair: "🪑",
  chair: "🪑",
  "dining-chair": "🪑",
  "office-chair": "🪑",
  stool: "🪑",
  bench: "🪑",
  "coffee-table": "☕",
  "side-table": "🪵",
  "dining-table": "🍽",
  console: "🪵",
  desk: "🖥",
  island: "🍳",
  bed: "🛏",
  wardrobe: "🗄",
  dresser: "🗄",
  nightstand: "🪵",
  bookshelf: "📚",
  sideboard: "🗄",
  cabinet: "🗄",
  "shoe-cabinet": "👟",
  filing: "🗄",
  lamp: "💡",
  tv: "📺",
  rug: "🟫",
  plant: "🌿",
  mirror: "🪞",
  fridge: "🧊",
  cooker: "🔥",
  sink: "🚰",
  dishwasher: "🍽",
  toilet: "🚽",
  vanity: "🚰",
  bathtub: "🛁",
  shower: "🚿",
  washer: "🫧",
  dryer: "💨",
  "coat-rack": "🧥",
};
