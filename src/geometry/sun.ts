import type { Point, ProjectDocument } from "@/domain/schema";
import { formatClock } from "@/domain/format";
import { dot, mul } from "@/geometry/distance";
import { inwardNormal } from "@/geometry/walls";

const MIN_ELEVATION = 5;
const FACING = 0.7;

export function sunAzimuthDeg(minutes: number) {
  const t = (minutes - 360) / 720;
  return 90 + t * 180;
}

export function sunElevationDeg(minutes: number) {
  const t = (minutes - 360) / 720;
  return Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 62;
}

/** Direction toward the sun. Plan +Y is north when orientation is 0. */
export function sunVector(minutes: number, orientationDeg: number): Point {
  const az = ((sunAzimuthDeg(minutes) + orientationDeg) * Math.PI) / 180;
  return { x: Math.sin(az), y: Math.cos(az) };
}

export function northVector(orientationDeg: number): Point {
  const az = (orientationDeg * Math.PI) / 180;
  return { x: Math.sin(az), y: Math.cos(az) };
}

export function sunColorHex(minutes: number) {
  const hour = minutes / 60;
  if (hour < 8) return "#ffd2a8";
  if (hour < 15) return "#fff6e8";
  if (hour < 16.5) return "#ffc48a";
  return "#ff9a4a";
}

export function sunlightSpan(doc: ProjectDocument) {
  const center = { x: doc.room.width / 2, y: doc.room.depth / 2 };
  const windows = doc.openings.filter((opening) => opening.type === "window");
  if (!windows.length) return null;
  const hits: number[] = [];
  for (let minutes = 360; minutes <= 1080; minutes += 10) {
    if (sunElevationDeg(minutes) < MIN_ELEVATION) continue;
    const sun = sunVector(minutes, doc.orientation);
    const lit = windows.some((opening) => {
      const wall = doc.walls.find((item) => item.id === opening.wallId);
      if (!wall) return false;
      const outward = mul(inwardNormal(wall, center), -1);
      return dot(sun, outward) > FACING;
    });
    if (lit) hits.push(minutes);
  }
  if (!hits.length) return null;
  let bestStart = hits[0];
  let bestEnd = hits[0];
  let runStart = hits[0];
  let previous = hits[0];
  for (let i = 1; i <= hits.length; i += 1) {
    const minutes = hits[i];
    if (minutes === undefined || minutes - previous > 15) {
      if (previous - runStart > bestEnd - bestStart) {
        bestStart = runStart;
        bestEnd = previous;
      }
      runStart = minutes ?? previous;
    }
    if (minutes !== undefined) previous = minutes;
  }
  return {
    start: bestStart,
    end: bestEnd,
    labelStart: formatClock(bestStart),
    labelEnd: formatClock(bestEnd),
  };
}
