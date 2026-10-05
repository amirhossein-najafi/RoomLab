import { describe, expect, it } from "vitest";
import { createProject } from "@/domain/commands";
import { addFurniture } from "@/domain/commands";
import { getCatalogItem } from "@/domain/catalog";
import { analyze } from "@/geometry/collision";
import { polygonArea, polygonsIntersect } from "@/geometry/polygon";
import { rotatePoint, snapAngle } from "@/geometry/rotate";
import { snapFurniturePosition } from "@/geometry/snap";
import { SpatialIndex } from "@/geometry/spatialIndex";
import { sunlightSpan, sunAzimuthDeg } from "@/geometry/sun";
import { doorSwingPolygon } from "@/geometry/walls";

describe("geometry", () => {
  it("snaps a wall direction to 0 and 45 degrees", () => {
    const flat = snapAngle({ x: 0, y: 0 }, { x: 10, y: 1 });
    expect(flat.y).toBeCloseTo(0, 5);
    expect(flat.x).toBeCloseTo(Math.hypot(10, 1), 5);
    const diagonal = snapAngle({ x: 0, y: 0 }, { x: 10, y: 9 });
    expect((Math.atan2(diagonal.y, diagonal.x) * 180) / Math.PI).toBeCloseTo(45, 5);
  });

  it("rotates a point counter-clockwise", () => {
    const next = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 90);
    expect(next.x).toBeCloseTo(0, 5);
    expect(next.y).toBeCloseTo(1, 5);
  });

  it("measures a square and detects overlap", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(polygonArea(square)).toBeCloseTo(100, 5);
    expect(
      polygonsIntersect(square, [
        { x: 8, y: 8 },
        { x: 14, y: 8 },
        { x: 14, y: 14 },
        { x: 8, y: 14 },
      ]),
    ).toBe(true);
  });

  it("shows a 30cm wall gap and snaps flush inside 8cm", () => {
    const doc = createProject({ name: "Bedroom", widthM: 4.2, depthM: 3.6 }, "snap");
    const chair = getCatalogItem("generic-chair");
    expect(chair).toBeTruthy();
    const gap = snapFurniturePosition(
      {
        id: "table",
        catalogItemId: chair!.id,
        x: 80,
        y: 200,
        width: 100,
        depth: 80,
        height: 40,
        rotation: 0,
        color: "#fff",
        groupId: null,
      },
      doc,
    );
    expect(gap.guides.some((guide) => guide.type === "gap" && guide.cm === 30)).toBe(true);

    const flush = snapFurniturePosition(
      {
        id: "table",
        catalogItemId: chair!.id,
        x: 54,
        y: 200,
        width: 100,
        depth: 80,
        height: 40,
        rotation: 0,
        color: "#fff",
        groupId: null,
      },
      doc,
    );
    expect(flush.x).toBeCloseTo(50, 3);
  });

  it("flags a door that cannot open and a tight walking gap", () => {
    let doc = createProject({ name: "Bedroom", widthM: 4.2, depthM: 3.6 }, "collide");
    const bed = getCatalogItem("generic-bed")!;
    const wardrobe = getCatalogItem("generic-wardrobe")!;
    doc = addFurniture(doc, bed, 85, 40, "bed");
    const blocked = analyze(doc);
    expect(blocked.blockedDoors.length).toBeGreaterThan(0);

    const center = { x: doc.room.width / 2, y: doc.room.depth / 2 };
    const swing = doorSwingPolygon(doc.openings[0], doc.walls[0], center);
    expect(swing.length).toBeGreaterThan(4);

    let spaced = createProject({ name: "Bedroom", widthM: 6, depthM: 5 }, "gap");
    spaced = addFurniture(spaced, bed, 200, 300, "bed-2");
    spaced = addFurniture(spaced, wardrobe, 320, 300, "wardrobe", 90);
    const clearance = analyze(spaced);
    expect(clearance.clearances.some((item) => item.cm > 0 && item.cm < 70)).toBe(true);
  });

  it("queries only nearby objects from the spatial index", () => {
    const index = new SpatialIndex(100);
    index.insert("near", { minX: 0, minY: 0, maxX: 20, maxY: 20 });
    index.insert("far", { minX: 2000, minY: 2000, maxX: 2020, maxY: 2020 });
    expect(index.query({ minX: 0, minY: 0, maxX: 30, maxY: 30 })).toEqual(["near"]);
  });

  it("finds an afternoon sun window on the west wall", () => {
    const doc = createProject({ name: "Bedroom", widthM: 4.2, depthM: 3.6 }, "sun");
    expect(sunAzimuthDeg(12 * 60)).toBeCloseTo(180, 5);
    const span = sunlightSpan(doc);
    expect(span).not.toBeNull();
    expect(span!.start).toBeGreaterThan(13 * 60);
    expect(span!.end).toBeGreaterThan(span!.start);
    expect(span!.end).toBeLessThanOrEqual(18 * 60);
  });
});
