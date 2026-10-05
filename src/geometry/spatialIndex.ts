import type { Box } from "@/geometry/polygon";

export class SpatialIndex {
  private cells = new Map<string, string[]>();

  constructor(private readonly cellSize = 80) {}

  insert(id: string, box: Box) {
    const minX = Math.floor(box.minX / this.cellSize);
    const maxX = Math.floor(box.maxX / this.cellSize);
    const minY = Math.floor(box.minY / this.cellSize);
    const maxY = Math.floor(box.maxY / this.cellSize);
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const key = `${x}:${y}`;
        const list = this.cells.get(key);
        if (list) list.push(id);
        else this.cells.set(key, [id]);
      }
    }
  }

  query(box: Box) {
    const found = new Set<string>();
    const minX = Math.floor(box.minX / this.cellSize);
    const maxX = Math.floor(box.maxX / this.cellSize);
    const minY = Math.floor(box.minY / this.cellSize);
    const maxY = Math.floor(box.maxY / this.cellSize);
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const list = this.cells.get(`${x}:${y}`);
        if (!list) continue;
        for (const id of list) found.add(id);
      }
    }
    return [...found];
  }
}
