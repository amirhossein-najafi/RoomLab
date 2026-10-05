import type { Opening, Point, Wall } from "@/domain/schema";
import { add, clamp, distance, distanceToSegment, mul, normalize, sub } from "@/geometry/distance";
import { rotateTowards } from "@/geometry/rotate";

export function inwardNormal(wall: Wall, roomCenter: Point): Point {
  const dir = normalize(sub(wall.end, wall.start));
  const left = { x: -dir.y, y: dir.x };
  const mid = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 };
  const toCenter = sub(roomCenter, mid);
  const score = left.x * toCenter.x + left.y * toCenter.y;
  return score >= 0 ? left : { x: -left.x, y: -left.y };
}

export function wallPolygon(wall: Wall, roomCenter: Point): Point[] {
  const outward = mul(inwardNormal(wall, roomCenter), -1);
  const offset = mul(outward, wall.thickness);
  return [wall.start, wall.end, add(wall.end, offset), add(wall.start, offset)];
}

export function openingPolygon(opening: Opening, wall: Wall, roomCenter: Point): Point[] {
  const dir = normalize(sub(wall.end, wall.start));
  const outward = mul(inwardNormal(wall, roomCenter), -wall.thickness);
  const a = add(wall.start, mul(dir, opening.offset));
  const b = add(a, mul(dir, opening.width));
  return [a, b, add(b, outward), add(a, outward)];
}

export function doorSwingPolygon(opening: Opening, wall: Wall, roomCenter: Point): Point[] {
  if (opening.type !== "door") return [];
  const dir = normalize(sub(wall.end, wall.start));
  const inward = inwardNormal(wall, roomCenter);
  const hingeDist = opening.swing === "left" ? opening.offset : opening.offset + opening.width;
  const hinge = add(wall.start, mul(dir, hingeDist));
  const leafDir = opening.swing === "left" ? dir : mul(dir, -1);
  const points: Point[] = [hinge];
  for (let deg = 0; deg <= 90; deg += 8) {
    points.push(add(hinge, mul(rotateTowards(leafDir, inward, deg), opening.width)));
  }
  return points;
}

export type WallPiece = { t0: number; t1: number; h0: number; h1: number };

export function wallPieces(wall: Wall, openings: Opening[]): WallPiece[] {
  const len = distance(wall.start, wall.end);
  const mine = openings
    .filter((opening) => opening.wallId === wall.id)
    .slice()
    .sort((a, b) => a.offset - b.offset);
  const pieces: WallPiece[] = [];
  let cursor = 0;
  for (const opening of mine) {
    const a = clamp(opening.offset, 0, len);
    const b = clamp(opening.offset + opening.width, 0, len);
    if (b - a < 1) continue;
    if (a > cursor + 0.5) pieces.push({ t0: cursor, t1: a, h0: 0, h1: wall.height });
    if (opening.type === "door") {
      if (opening.height < wall.height - 0.5) {
        pieces.push({ t0: a, t1: b, h0: opening.height, h1: wall.height });
      }
    } else {
      if (opening.sill > 0.5) pieces.push({ t0: a, t1: b, h0: 0, h1: opening.sill });
      const head = opening.sill + opening.height;
      if (head < wall.height - 0.5) pieces.push({ t0: a, t1: b, h0: head, h1: wall.height });
    }
    cursor = Math.max(cursor, b);
  }
  if (cursor < len - 0.5) pieces.push({ t0: cursor, t1: len, h0: 0, h1: wall.height });
  return pieces;
}

export function nearestWall(walls: Wall[], point: Point, maxDistance = 36) {
  let best: { wall: Wall; t: number; distance: number } | null = null;
  for (const wall of walls) {
    const hit = distanceToSegment(point, wall.start, wall.end);
    if (hit.distance <= maxDistance && (!best || hit.distance < best.distance)) {
      best = { wall, t: hit.t, distance: hit.distance };
    }
  }
  return best;
}
