import type { Furniture, Point, ProjectDocument } from "@/domain/schema";
import { add, dot, mul, sub } from "@/geometry/distance";
import { furniturePolygon } from "@/geometry/polygon";
import { inwardNormal } from "@/geometry/walls";

export type SnapGuide =
  | { type: "center-x"; x: number }
  | { type: "center-y"; y: number }
  | { type: "gap"; a: Point; b: Point; cm: number };

const GRID = 10;
const SNAP = 8;
const GUIDE = 48;

export function snapFurniturePosition(proposed: Furniture, doc: ProjectDocument) {
  const guides: SnapGuide[] = [];
  let x = proposed.x;
  let y = proposed.y;
  let lockX = false;
  let lockY = false;

  const centerTargetsX = [doc.room.width / 2];
  const centerTargetsY = [doc.room.depth / 2];
  for (const other of doc.furniture) {
    if (other.id === proposed.id) continue;
    centerTargetsX.push(other.x);
    centerTargetsY.push(other.y);
  }

  for (const target of centerTargetsX) {
    if (Math.abs(proposed.x - target) <= SNAP) {
      x = target;
      lockX = true;
      guides.push({ type: "center-x", x: target });
      break;
    }
  }
  for (const target of centerTargetsY) {
    if (Math.abs(proposed.y - target) <= SNAP) {
      y = target;
      lockY = true;
      guides.push({ type: "center-y", y: target });
      break;
    }
  }

  if (!lockX) x = Math.round(proposed.x / GRID) * GRID;
  if (!lockY) y = Math.round(proposed.y / GRID) * GRID;

  const center = { x: doc.room.width / 2, y: doc.room.depth / 2 };
  const nearest = (px: number, py: number) => {
    let wallX: { gap: number; outward: Point; support: Point } | null = null;
    let wallY: { gap: number; outward: Point; support: Point } | null = null;
    const poly = furniturePolygon({ ...proposed, x: px, y: py });
    for (const wall of doc.walls) {
      const inward = inwardNormal(wall, center);
      const outward = mul(inward, -1);
      let support = poly[0];
      let best = dot(support, outward);
      for (const point of poly) {
        const score = dot(point, outward);
        if (score > best) {
          best = score;
          support = point;
        }
      }
      const gap = -dot(sub(support, wall.start), outward);
      const entry = { gap, outward, support };
      if (Math.abs(outward.x) > Math.abs(outward.y)) {
        if (!wallX || Math.abs(gap) < Math.abs(wallX.gap)) wallX = entry;
      } else if (!wallY || Math.abs(gap) < Math.abs(wallY.gap)) {
        wallY = entry;
      }
    }
    return { wallX, wallY };
  };

  let hit = nearest(x, y);
  if (hit.wallX && Math.abs(hit.wallX.gap) <= SNAP) x += hit.wallX.outward.x * hit.wallX.gap;
  if (hit.wallY && Math.abs(hit.wallY.gap) <= SNAP) y += hit.wallY.outward.y * hit.wallY.gap;
  hit = nearest(x, y);
  const pushGuide = (entry: { gap: number; outward: Point; support: Point } | null) => {
    if (!entry || entry.gap <= 1 || entry.gap > GUIDE) return;
    guides.push({
      type: "gap",
      a: entry.support,
      b: add(entry.support, mul(entry.outward, entry.gap)),
      cm: Math.round(entry.gap),
    });
  };
  pushGuide(hit.wallX);
  pushGuide(hit.wallY);

  return { x, y, guides, lockX, lockY };
}
