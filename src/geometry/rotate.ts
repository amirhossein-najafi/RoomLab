import type { Point } from "@/domain/schema";

export function rotatePoint(p: Point, origin: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * c - dy * s,
    y: origin.y + dx * s + dy * c,
  };
}

export function rotateVector(v: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** Keep the segment length and snap its angle to 0, 45, or 90 degrees. */
export function snapAngle(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { ...to };
  const angle = Math.atan2(dy, dx);
  const step = Math.PI / 4;
  const snapped = Math.round(angle / step) * step;
  return { x: from.x + Math.cos(snapped) * len, y: from.y + Math.sin(snapped) * len };
}

export function rotateTowards(v: Point, target: Point, degrees: number): Point {
  const cross = v.x * target.y - v.y * target.x;
  const sign = Math.abs(cross) < 1e-8 ? 1 : Math.sign(cross);
  return rotateVector(v, sign * degrees);
}
