import type { Furniture, Point } from "@/domain/schema";
import { distance } from "@/geometry/distance";
import { rotatePoint } from "@/geometry/rotate";

export type Box = { minX: number; minY: number; maxX: number; maxY: number };

export function polygonArea(points: Point[]) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function pointInPolygon(p: Point, poly: Point[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function aabbOf(points: Point[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export function expandBox(box: Box, amount: number): Box {
  return {
    minX: box.minX - amount,
    minY: box.minY - amount,
    maxX: box.maxX + amount,
    maxY: box.maxY + amount,
  };
}

export function boxesOverlap(a: Box, b: Box) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function project(poly: Point[], axis: Point) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of poly) {
    const v = p.x * axis.x + p.y * axis.y;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return { min, max };
}

export function polygonsIntersect(a: Point[], b: Point[]) {
  if (a.length < 3 || b.length < 3) return false;
  const axes: Point[] = [];
  const push = (poly: Point[]) => {
    for (let i = 0; i < poly.length; i += 1) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const edgeX = q.x - p.x;
      const edgeY = q.y - p.y;
      const len = Math.hypot(edgeX, edgeY) || 1;
      axes.push({ x: -edgeY / len, y: edgeX / len });
    }
  };
  push(a);
  push(b);
  for (const axis of axes) {
    const pa = project(a, axis);
    const pb = project(b, axis);
    if (pa.max < pb.min || pb.max < pa.min) return false;
  }
  return true;
}

export function furniturePolygon(f: Pick<Furniture, "x" | "y" | "width" | "depth" | "rotation">): Point[] {
  const hw = f.width / 2;
  const hd = f.depth / 2;
  const origin = { x: f.x, y: f.y };
  return [
    { x: f.x - hw, y: f.y - hd },
    { x: f.x + hw, y: f.y - hd },
    { x: f.x + hw, y: f.y + hd },
    { x: f.x - hw, y: f.y + hd },
  ].map((corner) => rotatePoint(corner, origin, f.rotation));
}

export function closestPoints(a: Point[], b: Point[]) {
  if (polygonsIntersect(a, b) || pointInPolygon(a[0], b) || pointInPolygon(b[0], a)) {
    return { p: a[0], q: b[0], distance: 0 };
  }
  let best = Infinity;
  let p = a[0];
  let q = b[0];
  const consider = (from: Point[], to: Point[], swap: boolean) => {
    for (const pt of from) {
      for (let i = 0; i < to.length; i += 1) {
        const s = to[i];
        const e = to[(i + 1) % to.length];
        const abx = e.x - s.x;
        const aby = e.y - s.y;
        const len2 = abx * abx + aby * aby || 1;
        const t = Math.max(0, Math.min(1, ((pt.x - s.x) * abx + (pt.y - s.y) * aby) / len2));
        const c = { x: s.x + abx * t, y: s.y + aby * t };
        const d = distance(pt, c);
        if (d < best) {
          best = d;
          p = swap ? c : pt;
          q = swap ? pt : c;
        }
      }
    }
  };
  consider(a, b, false);
  consider(b, a, true);
  return { p, q, distance: best };
}
