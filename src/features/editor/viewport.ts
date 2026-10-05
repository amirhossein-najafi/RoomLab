import type { Point } from "@/domain/schema";

export type Viewport = { x: number; y: number; scale: number };

export function worldToScreen(point: Point, viewport: Viewport) {
  return {
    x: viewport.x + point.x * viewport.scale,
    y: viewport.y - point.y * viewport.scale,
  };
}

export function screenToWorld(x: number, y: number, viewport: Viewport): Point {
  return {
    x: (x - viewport.x) / viewport.scale,
    y: (viewport.y - y) / viewport.scale,
  };
}

export function zoomAt(viewport: Viewport, x: number, y: number, factor: number): Viewport {
  const scale = Math.min(8, Math.max(0.04, viewport.scale * factor));
  const worldX = (x - viewport.x) / viewport.scale;
  const worldY = (viewport.y - y) / viewport.scale;
  return { scale, x: x - worldX * scale, y: y + worldY * scale };
}

export function fitViewport(width: number, depth: number, viewW: number, viewH: number): Viewport {
  const pad = 80;
  const scale = Math.min((viewW - pad * 2) / width, (viewH - pad * 2) / depth);
  const safe = Math.max(0.04, Number.isFinite(scale) ? scale : 0.4);
  return {
    scale: safe,
    x: (viewW - width * safe) / 2,
    y: (viewH + depth * safe) / 2,
  };
}
