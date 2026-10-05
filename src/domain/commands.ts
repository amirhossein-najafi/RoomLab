import { getCatalogItem, type CatalogItem } from "@/domain/catalog";
import { slugId, uid } from "@/domain/ids";
import type { FloorMaterial, Opening, Paint, Point, ProjectDocument, Wall, WallMaterial } from "@/domain/schema";
import { clamp, distance, distanceToSegment } from "@/geometry/distance";
import { aabbOf, furniturePolygon } from "@/geometry/polygon";
import { snapAngle } from "@/geometry/rotate";

const WALL_THICKNESS = 12;
const WALL_HEIGHT = 270;

function nid(seed: string | undefined, name: string) {
  return seed ? `${seed}-${name}` : uid();
}

export function createProject(
  input: { name: string; widthM: number; depthM: number; title?: string },
  seed?: string,
): ProjectDocument {
  const width = Math.max(120, Math.round(input.widthM * 100));
  const depth = Math.max(120, Math.round(input.depthM * 100));
  const finish = { paint: "white" as const, material: "paint" as const };
  const south: Wall = {
    id: nid(seed, "wall-s"),
    start: { x: 0, y: 0 },
    end: { x: width, y: 0 },
    thickness: WALL_THICKNESS,
    height: WALL_HEIGHT,
    finish,
  };
  const east: Wall = {
    id: nid(seed, "wall-e"),
    start: { x: width, y: 0 },
    end: { x: width, y: depth },
    thickness: WALL_THICKNESS,
    height: WALL_HEIGHT,
    finish,
  };
  const north: Wall = {
    id: nid(seed, "wall-n"),
    start: { x: width, y: depth },
    end: { x: 0, y: depth },
    thickness: WALL_THICKNESS,
    height: WALL_HEIGHT,
    finish,
  };
  const west: Wall = {
    id: nid(seed, "wall-w"),
    start: { x: 0, y: depth },
    end: { x: 0, y: 0 },
    thickness: WALL_THICKNESS,
    height: WALL_HEIGHT,
    finish,
  };
  const door: Opening = {
    id: nid(seed, "door"),
    wallId: south.id,
    type: "door",
    offset: 36,
    width: 90,
    height: 210,
    sill: 0,
    swing: "left",
  };
  const windowWidth = 140;
  const window: Opening = {
    id: nid(seed, "window"),
    wallId: west.id,
    type: "window",
    offset: Math.max(0, (depth - windowWidth) / 2),
    width: windowWidth,
    height: 120,
    sill: 90,
    swing: "left",
  };

  return {
    id: nid(seed, "project"),
    title: input.title ?? input.name,
    ownerId: null,
    unit: "m",
    slug: seed ?? slugId(),
    isPublic: false,
    budgetLimit: 1500,
    orientation: 0,
    room: {
      id: nid(seed, "room"),
      name: input.name,
      width,
      depth,
      ceiling: WALL_HEIGHT,
    },
    walls: [south, east, north, west],
    openings: [door, window],
    furniture: [],
    texts: [],
    measurements: [],
    floor: { material: "wood" },
    floorPlan: null,
    beforeImage: null,
    showMeasurements: true,
    lighting: { minutes: 16 * 60, sunlight: true, lamps: true },
    camera: {
      position: [width / 200, 2.8, depth / 100 + 2.2],
      target: [width / 200, 0.8, depth / 200],
    },
  };
}

export function addFurniture(
  doc: ProjectDocument,
  item: CatalogItem,
  x: number,
  y: number,
  id = uid(),
  rotation = 0,
): ProjectDocument {
  return {
    ...doc,
    furniture: [
      ...doc.furniture,
      {
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
      },
    ],
  };
}

export function expandIds(doc: ProjectDocument, ids: string[]) {
  const selected = new Set(ids);
  const groups = new Set(
    doc.furniture.filter((item) => selected.has(item.id) && item.groupId).map((item) => item.groupId),
  );
  return doc.furniture
    .filter((item) => selected.has(item.id) || (item.groupId && groups.has(item.groupId)))
    .map((item) => item.id);
}

export function moveFurnitureFrom(
  base: ProjectDocument,
  starts: Record<string, Point>,
  dx: number,
  dy: number,
  ids: string[],
) {
  const selected = new Set(ids);
  return {
    ...base,
    furniture: base.furniture.map((item) =>
      selected.has(item.id) && starts[item.id]
        ? { ...item, x: starts[item.id].x + dx, y: starts[item.id].y + dy }
        : item,
    ),
  };
}

export function updateFurniture(
  doc: ProjectDocument,
  id: string,
  patch: Partial<Pick<ProjectDocument["furniture"][number], "x" | "y" | "width" | "depth" | "height" | "rotation" | "color">>,
) {
  return {
    ...doc,
    furniture: doc.furniture.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  };
}

export function setColor(doc: ProjectDocument, ids: string[], color: string) {
  const selected = new Set(ids);
  return {
    ...doc,
    furniture: doc.furniture.map((item) => (selected.has(item.id) ? { ...item, color } : item)),
  };
}

export function deleteSelection(doc: ProjectDocument, ids: string[]) {
  const selected = new Set(ids);
  const walls = doc.walls.filter((wall) => !selected.has(wall.id));
  const wallIds = new Set(walls.map((wall) => wall.id));
  return {
    ...doc,
    walls,
    openings: doc.openings.filter((opening) => !selected.has(opening.id) && wallIds.has(opening.wallId)),
    furniture: doc.furniture.filter((item) => !selected.has(item.id)),
    texts: doc.texts.filter((item) => !selected.has(item.id)),
    measurements: doc.measurements.filter((item) => !selected.has(item.id)),
  };
}

export function duplicateSelection(doc: ProjectDocument, ids: string[]) {
  const selected = new Set(expandIds(doc, ids));
  const groupMap = new Map<string, string>();
  const created = doc.furniture
    .filter((item) => selected.has(item.id))
    .map((item) => {
      let groupId = item.groupId;
      if (groupId) {
        if (!groupMap.has(groupId)) groupMap.set(groupId, uid());
        groupId = groupMap.get(groupId) ?? null;
      }
      return { ...item, id: uid(), x: item.x + 30, y: item.y + 30, groupId };
    });
  return { ...doc, furniture: [...doc.furniture, ...created] };
}

export function groupSelection(doc: ProjectDocument, ids: string[]) {
  const selected = new Set(expandIds(doc, ids));
  const groupId = uid();
  return {
    ...doc,
    furniture: doc.furniture.map((item) => (selected.has(item.id) ? { ...item, groupId } : item)),
  };
}

export function alignSelection(doc: ProjectDocument, ids: string[], mode: "left" | "center" | "distribute") {
  const items = doc.furniture.filter((item) => ids.includes(item.id));
  if (items.length < 2) return doc;
  const boxes = items.map((item) => ({ item, box: aabbOf(furniturePolygon(item)) }));
  let next = items;
  if (mode === "left") {
    const target = Math.min(...boxes.map((entry) => entry.box.minX));
    next = boxes.map(({ item, box }) => ({ ...item, x: item.x + (target - box.minX) }));
  } else if (mode === "center") {
    const minX = Math.min(...boxes.map((entry) => entry.box.minX));
    const maxX = Math.max(...boxes.map((entry) => entry.box.maxX));
    const mid = (minX + maxX) / 2;
    next = boxes.map(({ item, box }) => ({
      ...item,
      x: item.x + (mid - (box.minX + box.maxX) / 2),
    }));
  } else if (items.length >= 3) {
    const sorted = [...boxes].sort((a, b) => a.box.minX - b.box.minX);
    const span = sorted[sorted.length - 1].box.minX - sorted[0].box.minX;
    const step = span / (sorted.length - 1);
    next = sorted.map(({ item, box }, index) => ({
      ...item,
      x: item.x + (sorted[0].box.minX + step * index - box.minX),
    }));
  }
  const byId = new Map(next.map((item) => [item.id, item]));
  return { ...doc, furniture: doc.furniture.map((item) => byId.get(item.id) ?? item) };
}

export function addWall(doc: ProjectDocument, start: Point, end: Point) {
  if (distance(start, end) < 8) return doc;
  const wall: Wall = {
    id: uid(),
    start,
    end,
    thickness: WALL_THICKNESS,
    height: doc.room.ceiling,
    finish: { paint: "white", material: "paint" },
  };
  return { ...doc, walls: [...doc.walls, wall] };
}

export function addOpening(doc: ProjectDocument, wallId: string, type: "door" | "window", point: Point) {
  const wall = doc.walls.find((item) => item.id === wallId);
  if (!wall) return doc;
  const len = distance(wall.start, wall.end);
  const preferred = type === "door" ? 90 : 140;
  const width = Math.min(preferred, Math.max(40, len - 4));
  const along = distanceToSegment(point, wall.start, wall.end);
  const offset = clamp(along.t * len - width / 2, 0, Math.max(0, len - width));
  const opening: Opening = {
    id: uid(),
    wallId,
    type,
    offset,
    width,
    height: type === "door" ? 210 : 120,
    sill: type === "door" ? 0 : 90,
    swing: "left",
  };
  return { ...doc, openings: [...doc.openings, opening] };
}

export function updateOpening(doc: ProjectDocument, id: string, patch: Partial<Opening>) {
  return {
    ...doc,
    openings: doc.openings.map((opening) => (opening.id === id ? { ...opening, ...patch } : opening)),
  };
}

export function setWallFinish(
  doc: ProjectDocument,
  wallId: string,
  finish: { paint?: Paint; material?: WallMaterial },
) {
  return {
    ...doc,
    walls: doc.walls.map((wall) =>
      wall.id === wallId ? { ...wall, finish: { ...wall.finish, ...finish } } : wall,
    ),
  };
}

export function setFloor(doc: ProjectDocument, material: FloorMaterial) {
  return { ...doc, floor: { material } };
}

export function addMeasurement(doc: ProjectDocument, a: Point, b: Point) {
  if (distance(a, b) < 2) return doc;
  return { ...doc, measurements: [...doc.measurements, { id: uid(), a, b }] };
}

export function addText(doc: ProjectDocument, x: number, y: number) {
  const label = { id: uid(), x, y, text: "Note" };
  return { doc: { ...doc, texts: [...doc.texts, label] }, id: label.id };
}

export function updateText(doc: ProjectDocument, id: string, text: string) {
  return { ...doc, texts: doc.texts.map((item) => (item.id === id ? { ...item, text } : item)) };
}

export function setLighting(doc: ProjectDocument, lighting: Partial<ProjectDocument["lighting"]>) {
  return { ...doc, lighting: { ...doc.lighting, ...lighting } };
}

export function setOrientation(doc: ProjectDocument, orientation: number) {
  return { ...doc, orientation };
}

export function setBudgetLimit(doc: ProjectDocument, budgetLimit: number) {
  return { ...doc, budgetLimit: Math.max(0, budgetLimit) };
}

export function setShowMeasurements(doc: ProjectDocument, showMeasurements: boolean) {
  return { ...doc, showMeasurements };
}

export function replaceFurniture(doc: ProjectDocument, id: string, item: CatalogItem) {
  return {
    ...doc,
    furniture: doc.furniture.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            catalogItemId: item.id,
            width: item.width,
            depth: item.depth,
            height: item.height,
            color: item.color,
          }
        : entry,
    ),
  };
}

export function setFurnitureList(doc: ProjectDocument, furniture: ProjectDocument["furniture"]) {
  return { ...doc, furniture };
}

export function setFloorPlan(doc: ProjectDocument, floorPlan: ProjectDocument["floorPlan"]) {
  return { ...doc, floorPlan };
}

export function scaleFloorPlan(doc: ProjectDocument, a: Point, b: Point, desiredCm: number) {
  const plan = doc.floorPlan;
  if (!plan) return doc;
  const current = distance(a, b);
  if (current < 1 || desiredCm < 1) return doc;
  const scale = desiredCm / current;
  return {
    ...doc,
    floorPlan: {
      ...plan,
      x: a.x + (plan.x - a.x) * scale,
      y: a.y + (plan.y - a.y) * scale,
      width: plan.width * scale,
      height: plan.height * scale,
    },
  };
}

export function setBeforeImage(doc: ProjectDocument, beforeImage: string | null) {
  return { ...doc, beforeImage };
}

export function renameRoom(doc: ProjectDocument, name: string) {
  return { ...doc, title: name, room: { ...doc.room, name } };
}

export function spawnMany(doc: ProjectDocument, count: number) {
  const item = getCatalogItem("generic-chair");
  if (!item) return doc;
  const furniture = [...doc.furniture];
  const cols = 25;
  for (let i = 0; i < count; i += 1) {
    furniture.push({
      id: uid(),
      catalogItemId: item.id,
      x: 40 + (i % cols) * 70,
      y: 40 + Math.floor(i / cols) * 70,
      width: 50,
      depth: 50,
      height: item.height,
      rotation: 0,
      color: item.color,
      groupId: null,
    });
  }
  return { ...doc, furniture };
}

export function snapPointer(doc: ProjectDocument, point: Point, shift: boolean, anchor?: Point) {
  const next = anchor && shift ? snapAngle(anchor, point) : point;
  let best = next;
  let bestDistance = 14;
  for (const wall of doc.walls) {
    for (const end of [wall.start, wall.end]) {
      const d = distance(next, end);
      if (d < bestDistance) {
        best = end;
        bestDistance = d;
      }
    }
  }
  if (best === next && !(anchor && shift)) {
    best = { x: Math.round(next.x / 10) * 10, y: Math.round(next.y / 10) * 10 };
  }
  return best;
}

export function cloneDocument(doc: ProjectDocument, title?: string): ProjectDocument {
  const wallMap = new Map<string, string>();
  const walls = doc.walls.map((wall) => {
    const id = uid();
    wallMap.set(wall.id, id);
    return { ...wall, id };
  });
  const groupMap = new Map<string, string>();
  return {
    ...structuredClone(doc),
    id: uid(),
    slug: slugId(),
    title: title ?? doc.title,
    isPublic: false,
    ownerId: null,
    walls,
    openings: doc.openings.map((opening) => ({
      ...opening,
      id: uid(),
      wallId: wallMap.get(opening.wallId) ?? opening.wallId,
    })),
    furniture: doc.furniture.map((item) => {
      let groupId = item.groupId;
      if (groupId) {
        if (!groupMap.has(groupId)) groupMap.set(groupId, uid());
        groupId = groupMap.get(groupId) ?? null;
      }
      return { ...item, id: uid(), groupId };
    }),
    texts: doc.texts.map((item) => ({ ...item, id: uid() })),
    measurements: doc.measurements.map((item) => ({ ...item, id: uid() })),
    room: { ...doc.room, id: uid() },
  };
}
