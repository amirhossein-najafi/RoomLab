import type { Point } from "@/domain/schema";

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(a: Point, scale: number): Point {
  return { x: a.x * scale, y: a.y * scale };
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

export function length(a: Point) {
  return Math.hypot(a.x, a.y);
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(a: Point): Point {
  const len = length(a) || 1;
  return { x: a.x / len, y: a.y / len };
}

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function distanceToSegment(p: Point, a: Point, b: Point) {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y || 1;
  const t = clamp(dot(sub(p, a), ab) / len2, 0, 1);
  const point = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return { point, t, distance: distance(p, point) };
}
