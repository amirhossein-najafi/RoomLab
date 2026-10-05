import { z } from "zod";

export const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const paintSchema = z.string().min(1);
export const wallMaterialSchema = z.enum(["paint", "brick", "concrete", "wood"]);
export const floorMaterialSchema = z.enum(["wood", "tile", "carpet", "concrete"]);

export const wallSchema = z.object({
  id: z.string(),
  start: pointSchema,
  end: pointSchema,
  thickness: z.number().positive(),
  height: z.number().positive(),
  finish: z.object({
    paint: paintSchema,
    material: wallMaterialSchema,
  }),
});

export const openingSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  type: z.enum(["door", "window"]),
  offset: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  sill: z.number(),
  swing: z.enum(["left", "right"]),
});

export const furnitureSchema = z.object({
  id: z.string(),
  catalogItemId: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  depth: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  color: z.string(),
  groupId: z.string().nullable(),
});

export const textLabelSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  text: z.string(),
});

export const measurementSchema = z.object({
  id: z.string(),
  a: pointSchema,
  b: pointSchema,
});

export const floorPlanSchema = z.object({
  src: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  ownerId: z.string().nullable(),
  unit: z.enum(["m", "cm"]),
  slug: z.string(),
  isPublic: z.boolean(),
  budgetLimit: z.number(),
  orientation: z.number(),
  room: z.object({
    id: z.string(),
    name: z.string(),
    width: z.number().positive(),
    depth: z.number().positive(),
    ceiling: z.number().positive(),
  }),
  walls: z.array(wallSchema),
  openings: z.array(openingSchema),
  furniture: z.array(furnitureSchema),
  texts: z.array(textLabelSchema),
  measurements: z.array(measurementSchema),
  floor: z.object({ material: floorMaterialSchema }),
  floorPlan: floorPlanSchema.nullable(),
  beforeImage: z.string().nullable(),
  showMeasurements: z.boolean(),
  lighting: z.object({
    minutes: z.number(),
    sunlight: z.boolean(),
    lamps: z.boolean(),
  }),
  camera: z.object({
    position: z.tuple([z.number(), z.number(), z.number()]),
    target: z.tuple([z.number(), z.number(), z.number()]),
  }),
});

export type Point = z.infer<typeof pointSchema>;
export type Paint = z.infer<typeof paintSchema>;
export type WallMaterial = z.infer<typeof wallMaterialSchema>;
export type FloorMaterial = z.infer<typeof floorMaterialSchema>;
export type Wall = z.infer<typeof wallSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type Furniture = z.infer<typeof furnitureSchema>;
export type TextLabel = z.infer<typeof textLabelSchema>;
export type Measurement = z.infer<typeof measurementSchema>;
export type FloorPlanImage = z.infer<typeof floorPlanSchema>;
export type ProjectDocument = z.infer<typeof projectSchema>;

export const WALL_MATERIALS: WallMaterial[] = ["paint", "brick", "concrete", "wood"];
export const FLOOR_MATERIALS: FloorMaterial[] = ["wood", "tile", "carpet", "concrete"];

export const COLOR_SWATCHES = [
  { id: "white", hex: "#f7f4ee" },
  { id: "ivory", hex: "#f3ead7" },
  { id: "cream", hex: "#efe2c4" },
  { id: "sand", hex: "#d9c4a3" },
  { id: "beige", hex: "#d8c3a5" },
  { id: "tan", hex: "#c4a574" },
  { id: "oak", hex: "#b08968" },
  { id: "walnut", hex: "#6b4b32" },
  { id: "brown", hex: "#5c3a2e" },
  { id: "terracotta", hex: "#c46b4a" },
  { id: "rust", hex: "#8c3a2f" },
  { id: "red", hex: "#b23b3b" },
  { id: "coral", hex: "#e07a5f" },
  { id: "pink", hex: "#e7a3b5" },
  { id: "blush", hex: "#f2c9c2" },
  { id: "orange", hex: "#e08a3c" },
  { id: "amber", hex: "#e3b15a" },
  { id: "yellow", hex: "#e6d36a" },
  { id: "olive", hex: "#6d6a45" },
  { id: "sage", hex: "#8fa37a" },
  { id: "green", hex: "#3d6b45" },
  { id: "mint", hex: "#b7d4c4" },
  { id: "teal", hex: "#3d7a78" },
  { id: "sky", hex: "#8eb8d4" },
  { id: "blue", hex: "#3d6f9a" },
  { id: "navy", hex: "#243044" },
  { id: "indigo", hex: "#3d3f73" },
  { id: "purple", hex: "#6d4c7d" },
  { id: "plum", hex: "#5a3048" },
  { id: "gray", hex: "#b9b4ae" },
  { id: "charcoal", hex: "#4a4e52" },
  { id: "black", hex: "#2a2a2a" },
] as const;

const NAMED_COLORS = Object.fromEntries(COLOR_SWATCHES.map((swatch) => [swatch.id, swatch.hex]));

export function resolveColor(value: string) {
  if (value.startsWith("#")) return value;
  return NAMED_COLORS[value] ?? "#f4f1ea";
}
