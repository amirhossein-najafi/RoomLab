import type { Point, ProjectDocument } from "@/domain/schema";
import { getCatalogItem } from "@/domain/catalog";
import { isTightClearance, RECOMMENDED_CLEARANCE } from "@/geometry/clearance";
import { aabbOf, closestPoints, expandBox, furniturePolygon, pointInPolygon, polygonsIntersect } from "@/geometry/polygon";
import { SpatialIndex } from "@/geometry/spatialIndex";
import { doorSwingPolygon, wallPolygon } from "@/geometry/walls";

const LARGE_KINDS = new Set(["bed", "wardrobe", "sofa", "desk", "tv", "dining-table", "fridge", "island", "bathtub", "bookshelf", "dresser", "sideboard"]);

export type Clearance = {
  aId: string;
  bId: string;
  cm: number;
  p: Point;
  q: Point;
};

export type Analysis = {
  overlaps: string[];
  blockedDoors: string[];
  clearances: Clearance[];
};

export function analyze(doc: ProjectDocument): Analysis {
  const center = { x: doc.room.width / 2, y: doc.room.depth / 2 };
  const wallPolys = doc.walls.map((wall) => wallPolygon(wall, center));
  const overlaps: string[] = [];
  const index = new SpatialIndex(100);
  const boxes = new Map<string, ReturnType<typeof aabbOf>>();
  const polys = new Map<string, Point[]>();

  for (const item of doc.furniture) {
    const poly = furniturePolygon(item);
    const box = aabbOf(poly);
    polys.set(item.id, poly);
    boxes.set(item.id, box);
    index.insert(item.id, box);
    if (wallPolys.some((wall) => polygonsIntersect(poly, wall))) overlaps.push(item.id);
  }

  const blockedDoors: string[] = [];
  for (const opening of doc.openings) {
    if (opening.type !== "door") continue;
    const wall = doc.walls.find((item) => item.id === opening.wallId);
    if (!wall) continue;
    const swing = doorSwingPolygon(opening, wall, center);
    const box = expandBox(aabbOf(swing), 4);
    const candidates = index.query(box);
    const blocked = candidates.some((id) => {
      const poly = polys.get(id);
      return poly ? polygonsIntersect(swing, poly) || pointInPolygon(poly[0], swing) : false;
    });
    if (blocked) blockedDoors.push(opening.id);
  }

  const clearances: Clearance[] = [];
  const seen = new Set<string>();
  for (const item of doc.furniture) {
    const kind = getCatalogItem(item.catalogItemId)?.kind;
    if (!kind || !LARGE_KINDS.has(kind)) continue;
    const box = boxes.get(item.id);
    const poly = polys.get(item.id);
    if (!box || !poly) continue;
    const near = index.query(expandBox(box, RECOMMENDED_CLEARANCE));
    for (const otherId of near) {
      if (otherId === item.id) continue;
      const key = [item.id, otherId].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      const other = doc.furniture.find((entry) => entry.id === otherId);
      if (!other || (item.groupId && item.groupId === other.groupId)) continue;
      const otherKind = getCatalogItem(other.catalogItemId)?.kind;
      if (!otherKind || !LARGE_KINDS.has(otherKind)) continue;
      const otherPoly = polys.get(otherId);
      if (!otherPoly) continue;
      const gap = closestPoints(poly, otherPoly);
      if (isTightClearance(gap.distance)) {
        clearances.push({
          aId: item.id,
          bId: otherId,
          cm: Math.round(gap.distance),
          p: gap.p,
          q: gap.q,
        });
      }
    }
  }

  clearances.sort((a, b) => a.cm - b.cm);
  return { overlaps, blockedDoors, clearances: clearances.slice(0, 8) };
}

export function circleBlocked(doc: ProjectDocument, point: Point, radius = 18) {
  if (
    point.x < radius ||
    point.y < radius ||
    point.x > doc.room.width - radius ||
    point.y > doc.room.depth - radius
  ) {
    return true;
  }
  for (const item of doc.furniture) {
    const poly = furniturePolygon(item);
    if (pointInPolygon(point, poly)) return true;
    const box = aabbOf(poly);
    if (
      point.x > box.minX - radius &&
      point.x < box.maxX + radius &&
      point.y > box.minY - radius &&
      point.y < box.maxY + radius &&
      closestPoints([point, point, point], poly).distance < radius
    ) {
      return true;
    }
  }
  return false;
}
