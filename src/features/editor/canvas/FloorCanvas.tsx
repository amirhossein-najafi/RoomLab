"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import { getCatalogItem } from "@/domain/catalog";
import {
  addFurniture,
  addMeasurement,
  addOpening,
  addText,
  addWall,
  expandIds,
  moveFurnitureFrom,
  snapPointer,
  updateFurniture,
} from "@/domain/commands";
import { uid } from "@/domain/ids";
import { formatLength } from "@/domain/format";
import { resolveColor, type Furniture, type Point, type ProjectDocument } from "@/domain/schema";
import { analyze } from "@/geometry/collision";
import { add, distance, mul } from "@/geometry/distance";
import { furniturePolygon } from "@/geometry/polygon";
import { rotatePoint } from "@/geometry/rotate";
import { snapFurniturePosition } from "@/geometry/snap";
import { northVector } from "@/geometry/sun";
import { doorSwingPolygon, nearestWall, openingPolygon, wallPolygon } from "@/geometry/walls";
import { setStage } from "@/features/export/stage";
import { useEditor, type Draft } from "@/features/editor/store";
import { screenToWorld, worldToScreen, zoomAt } from "@/features/editor/viewport";

const FLOOR_FILL = {
  wood: "#6d5136",
  tile: "#8f9ba0",
  carpet: "#6d3d49",
  concrete: "#7d807e",
} as const;

const MATERIAL_FILL = {
  brick: "#8d4b3a",
  concrete: "#8d908e",
  wood: "#a67c52",
} as const;

function wallFill(finish: { paint: string; material: string }, selected: boolean) {
  if (selected && finish.material !== "paint") return "#d7c4a4";
  if (finish.material === "paint") return resolveColor(finish.paint);
  return MATERIAL_FILL[finish.material as keyof typeof MATERIAL_FILL] ?? "#3c4146";
}

type Sample = { clientX: number; clientY: number; shiftKey: boolean; pointerType: string };

const FurnitureShape = memo(function FurnitureShape({
  item,
  selected,
}: {
  item: Furniture;
  selected: boolean;
}) {
  const points = furniturePolygon(item).flatMap((point) => [point.x, -point.y]);
  const catalog = getCatalogItem(item.catalogItemId);
  const label = catalog?.name ?? "";
  return (
    <Group>
      <Line
        name={`furniture:${item.id}`}
        points={points}
        closed
        fill={item.color}
        stroke={selected ? "#f0d8b0" : "#1c1915"}
        strokeWidth={selected ? 2 : 1}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
      />
      {label ? (
        <Text
          x={item.x - item.width / 2}
          y={-item.y - 6}
          width={item.width}
          text={label}
          align="center"
          fontSize={Math.max(8, Math.min(13, item.width * 0.1))}
          fill="#1c1915"
          listening={false}
        />
      ) : null}
    </Group>
  );
});

function PlanImage({ plan }: { plan: NonNullable<ProjectDocument["floorPlan"]> }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const next = new window.Image();
    next.onload = () => setImage(next);
    next.src = plan.src;
  }, [plan.src]);
  if (!image) return null;
  return (
    <KonvaImage
      image={image}
      x={plan.x}
      y={-(plan.y + plan.height)}
      width={plan.width}
      height={plan.height}
      opacity={0.55}
      listening={false}
    />
  );
}

function pointsOf(poly: Point[]) {
  return poly.flatMap((point) => [point.x, -point.y]);
}

export function FloorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const doc = useEditor((state) => state.doc);
  const preview = useEditor((state) => state.previewFurniture);
  const viewport = useEditor((state) => state.viewport);
  const viewSize = useEditor((state) => state.viewSize);
  const selection = useEditor((state) => state.selection);
  const draft = useEditor((state) => state.draft);
  const guides = useEditor((state) => state.guides);
  const tool = useEditor((state) => state.tool);
  const shown = useMemo(
    () => (doc && preview ? { ...doc, furniture: preview } : doc),
    [doc, preview],
  );
  const analysis = useMemo(() => (shown ? analyze(shown) : null), [shown]);
  const space = useRef(false);
  const pan = useRef<Point | null>(null);
  const drag = useRef<
    | { kind: "move"; ids: string[]; origin: Point; starts: Record<string, Point>; primary: string }
    | { kind: "rotate" | "resize"; id: string }
    | null
  >(null);
  const marquee = useRef<{ start: Point; additive: boolean } | null>(null);
  const frame = useRef(0);
  const pending = useRef<Sample | null>(null);
  const fitted = useRef<string | null>(null);

  useEffect(() => {
    setStage(stageRef.current);
    return () => setStage(null);
  });

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width < 10) return;
      useEditor.getState().setViewSize({ w: rect.width, h: rect.height });
      const id = useEditor.getState().doc?.id;
      if (id && fitted.current !== id) {
        fitted.current = id;
        useEditor.getState().zoomToFit();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const current = useEditor.getState().viewport;
      if (event.ctrlKey || event.metaKey) {
        useEditor.getState().setViewport(zoomAt(current, x, y, Math.exp(-event.deltaY * 0.0015)));
      } else {
        useEditor.getState().setViewport({
          ...current,
          x: current.x - event.deltaX,
          y: current.y - event.deltaY,
        });
      }
    };
    let lastPinch = 0;
    const pinchDistance = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) lastPinch = pinchDistance(event.touches);
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const next = pinchDistance(event.touches);
      const rect = element.getBoundingClientRect();
      const x = (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left;
      const y = (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top;
      if (lastPinch) {
        useEditor.getState().setViewport(zoomAt(useEditor.getState().viewport, x, y, next / lastPinch));
      }
      lastPinch = next;
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof HTMLInputElement)) {
        space.current = true;
        event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") space.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  if (!shown) return <div ref={wrapRef} className="h-full w-full" data-testid="canvas" />;

  const center = { x: shown.room.width / 2, y: shown.room.depth / 2 };
  const selected = new Set(selection);
  const single = shown.furniture.find((item) => selection.length === 1 && item.id === selection[0]);

  function localPoint(sample: Sample): Point {
    const rect = wrapRef.current?.getBoundingClientRect();
    const viewportNow = useEditor.getState().viewport;
    return screenToWorld(sample.clientX - (rect?.left ?? 0), sample.clientY - (rect?.top ?? 0), viewportNow);
  }

  function shapeAt(sample: Sample) {
    const stage = stageRef.current;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!stage || !rect) return null;
    return stage.getIntersection({ x: sample.clientX - rect.left, y: sample.clientY - rect.top });
  }

  function move(sample: Sample) {
    const state = useEditor.getState();
    const current = state.doc;
    if (!current) return;
    const world = localPoint(sample);
    if (pan.current) {
      const dx = sample.clientX - pan.current.x;
      const dy = sample.clientY - pan.current.y;
      pan.current = { x: sample.clientX, y: sample.clientY };
      state.setViewport({ ...state.viewport, x: state.viewport.x + dx, y: state.viewport.y + dy });
      return;
    }
    const active = drag.current;
    const base = state.gesture ?? current;
    if (active?.kind === "move") {
      const primary = base.furniture.find((item) => item.id === active.primary);
      const origin = active.starts[active.primary];
      if (primary && origin) {
        const proposed = {
          ...primary,
          x: origin.x + (world.x - active.origin.x),
          y: origin.y + (world.y - active.origin.y),
        };
        const snapped = snapFurniturePosition(proposed, {
          ...base,
          furniture: base.furniture.filter((item) => !active.ids.includes(item.id)),
        });
        state.setGuides(snapped.guides);
        state.preview(
          moveFurnitureFrom(base, active.starts, snapped.x - origin.x, snapped.y - origin.y, active.ids),
        );
      }
      return;
    }
    if (active?.kind === "rotate") {
      const item = base.furniture.find((entry) => entry.id === active.id);
      if (!item) return;
      let angle = (Math.atan2(world.y - item.y, world.x - item.x) * 180) / Math.PI - 90;
      if (sample.shiftKey) angle = Math.round(angle / 45) * 45;
      state.preview(updateFurniture(base, item.id, { rotation: angle }));
      return;
    }
    if (active?.kind === "resize") {
      const item = base.furniture.find((entry) => entry.id === active.id);
      if (!item) return;
      const local = rotatePoint(world, { x: item.x, y: item.y }, -item.rotation);
      state.preview(
        updateFurniture(base, item.id, {
          width: Math.max(30, Math.abs(local.x) * 2),
          depth: Math.max(30, Math.abs(local.y) * 2),
        }),
      );
      return;
    }
    const liveDraft = state.draft;
    if (liveDraft && liveDraft.type !== "marquee") {
      state.setDraft({
        ...liveDraft,
        current: snapPointer(current, world, sample.shiftKey, liveDraft.start),
      });
    }
    if (marquee.current) {
      state.setDraft({ type: "marquee", start: marquee.current.start, current: world });
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!wrapRef.current) return;
    wrapRef.current.setPointerCapture(event.pointerId);
    const sample: Sample = {
      clientX: event.clientX,
      clientY: event.clientY,
      shiftKey: event.shiftKey,
      pointerType: event.pointerType,
    };
    const world = localPoint(sample);
    const state = useEditor.getState();
    const current = state.doc;
    if (!current) return;
    if (event.button === 1 || space.current) {
      pan.current = { x: event.clientX, y: event.clientY };
      return;
    }
    if (state.tool === "select") {
      const hit = shapeAt(sample);
      const name = hit?.name() ?? "";
      if (sample.pointerType === "touch" && !name) {
        pan.current = { x: event.clientX, y: event.clientY };
        return;
      }
      if (name.startsWith("rotate:") || name.startsWith("resize:")) {
        const id = name.slice(name.indexOf(":") + 1);
        drag.current = { kind: name.startsWith("rotate:") ? "rotate" : "resize", id };
        state.startGesture();
        return;
      }
      if (name.startsWith("furniture:")) {
        const id = name.slice(10);
        let ids = state.selection;
        if (event.shiftKey) ids = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
        else if (!ids.includes(id)) ids = [id];
        state.setSelection(ids);
        const expanded = expandIds(current, ids);
        const starts: Record<string, Point> = {};
        for (const item of current.furniture) {
          if (expanded.includes(item.id)) starts[item.id] = { x: item.x, y: item.y };
        }
        drag.current = { kind: "move", ids: expanded, origin: world, starts, primary: id };
        state.startGesture();
        return;
      }
      if (name.startsWith("wall:")) {
        state.setSelection([name.slice(5)]);
        return;
      }
      if (name.startsWith("opening:")) {
        state.setSelection([name.slice(8)]);
        return;
      }
      if (name === "floor" || !name) {
        state.setSelection(name === "floor" ? ["floor"] : []);
        marquee.current = { start: world, additive: event.shiftKey };
      }
      return;
    }
    if (state.tool === "wall" || state.tool === "measure" || state.tool === "scale") {
      const point = snapPointer(current, world, event.shiftKey);
      const live = state.draft;
      if (!live || live.type !== state.tool) {
        state.setDraft({ type: state.tool, start: point, current: point });
        return;
      }
      const end = snapPointer(current, world, event.shiftKey, live.start);
      if (state.tool === "wall") state.commit(addWall(current, live.start, end), "history.wall");
      if (state.tool === "measure") state.commit(addMeasurement(current, live.start, end), "history.measure");
      if (state.tool === "scale") state.setScalePrompt({ a: live.start, b: end });
      state.setDraft(null);
      return;
    }
    if (state.tool === "door" || state.tool === "window") {
      const nearest = nearestWall(current.walls, world);
      if (!nearest) return;
      state.commit(
        addOpening(current, nearest.wall.id, state.tool, world),
        state.tool === "door" ? "history.door" : "history.window",
      );
      return;
    }
    if (state.tool === "text") {
      const created = addText(current, world.x, world.y);
      state.commit(created.doc, "history.text");
      state.setSelection([created.id]);
      state.setTool("select");
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    pending.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      shiftKey: event.shiftKey,
      pointerType: event.pointerType,
    };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (pending.current) move(pending.current);
    });
  }

  function onPointerUp() {
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      if (pending.current) move(pending.current);
    }
    pan.current = null;
    const state = useEditor.getState();
    const active = drag.current;
    drag.current = null;
    if (active && state.doc) {
      const item = state.doc.furniture.find((entry) => entry.id === ("id" in active ? active.id : active.primary));
      const name = item ? (getCatalogItem(item.catalogItemId)?.name ?? "Item") : "Item";
      const key = active.kind === "move" ? "history.moved" : active.kind === "rotate" ? "history.rotated" : "history.resized";
      state.endGesture(key, { name });
    }
    const box = marquee.current;
    marquee.current = null;
    const liveDraft = state.draft;
    if (box && liveDraft?.type === "marquee" && state.doc) {
      const width = Math.abs(liveDraft.current.x - liveDraft.start.x);
      const height = Math.abs(liveDraft.current.y - liveDraft.start.y);
      if (width > 4 || height > 4) {
        const minX = Math.min(liveDraft.start.x, liveDraft.current.x);
        const maxX = Math.max(liveDraft.start.x, liveDraft.current.x);
        const minY = Math.min(liveDraft.start.y, liveDraft.current.y);
        const maxY = Math.max(liveDraft.start.y, liveDraft.current.y);
        const ids = state.doc.furniture
          .filter((item) => item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY)
          .map((item) => item.id);
        state.setSelection(box.additive ? [...new Set([...state.selection, ...ids])] : ids);
      }
      state.setDraft(null);
    } else if (liveDraft?.type === "marquee") {
      state.setDraft(null);
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const catalogId = event.dataTransfer.getData("text/plain");
    const item = getCatalogItem(catalogId);
    const current = useEditor.getState().doc;
    if (!item || !current) return;
    const world = localPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      shiftKey: false,
      pointerType: "mouse",
    });
    const id = uid();
    useEditor.getState().commit(addFurniture(current, item, world.x, world.y, id), "history.added", { name: item.name });
    useEditor.getState().setSelection([id]);
  }

  const north = northVector(shown.orientation);
  const northOrigin = { x: shown.room.width - 48, y: shown.room.depth - 36 };
  const northTip = add(northOrigin, mul(north, 34));
  const labels = labelsFor(shown, draft, guides, analysis?.clearances ?? []);

  return (
    <div
      ref={wrapRef}
      data-testid="canvas"
      className="relative h-full w-full overflow-hidden bg-[#121416]"
      style={{ touchAction: "none", cursor: tool === "select" ? "default" : "crosshair" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Stage ref={stageRef} width={viewSize.w} height={viewSize.h}>
        <Layer>
          <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
            {shown.floorPlan ? <PlanImage plan={shown.floorPlan} /> : null}
            <Rect
              name="floor"
              x={0}
              y={-shown.room.depth}
              width={shown.room.width}
              height={shown.room.depth}
              fill={FLOOR_FILL[shown.floor.material]}
            />
            {gridLines(shown.room.width, shown.room.depth)}
            {shown.walls.map((wall) => (
              <Line
                key={wall.id}
                name={`wall:${wall.id}`}
                points={pointsOf(wallPolygon(wall, center))}
                closed
                fill={wallFill(wall.finish, selected.has(wall.id))}
                stroke={selected.has(wall.id) ? "#f0d8b0" : "#17191b"}
                strokeWidth={1}
                strokeScaleEnabled={false}
              />
            ))}
            {shown.openings.map((opening) => {
              const wall = shown.walls.find((item) => item.id === opening.wallId);
              if (!wall) return null;
              return (
                <Line
                  key={opening.id}
                  name={`opening:${opening.id}`}
                  points={pointsOf(openingPolygon(opening, wall, center))}
                  closed
                  fill={opening.type === "window" ? "#9eb4c4" : "#121416"}
                />
              );
            })}
            {shown.openings.map((opening) => {
              if (opening.type !== "door") return null;
              const wall = shown.walls.find((item) => item.id === opening.wallId);
              if (!wall) return null;
              return (
                <Line
                  key={`${opening.id}-swing`}
                  points={pointsOf(doorSwingPolygon(opening, wall, center))}
                  stroke="#e7d7c1"
                  dash={[6, 4]}
                  strokeScaleEnabled={false}
                  listening={false}
                />
              );
            })}
            {shown.furniture.map((item) => {
              const screen = worldToScreen(item, viewport);
              const margin = 120 + Math.max(item.width, item.depth) * viewport.scale;
              if (screen.x < -margin || screen.y < -margin || screen.x > viewSize.w + margin || screen.y > viewSize.h + margin) {
                return null;
              }
              return <FurnitureShape key={item.id} item={item} selected={selected.has(item.id)} />;
            })}
            {shown.measurements.map((item) => (
              <Line
                key={item.id}
                name={`measure:${item.id}`}
                points={[item.a.x, -item.a.y, item.b.x, -item.b.y]}
                stroke="#f0d8b0"
                strokeScaleEnabled={false}
              />
            ))}
            {(analysis?.clearances ?? []).map((item) => (
              <Line
                key={`${item.aId}-${item.bId}`}
                points={[item.p.x, -item.p.y, item.q.x, -item.q.y]}
                stroke="#e15b4a"
                strokeWidth={2}
                strokeScaleEnabled={false}
                listening={false}
              />
            ))}
            {guides.map((guide, index) =>
              guide.type === "gap" ? (
                <Line
                  key={`gap-${index}`}
                  points={[guide.a.x, -guide.a.y, guide.b.x, -guide.b.y]}
                  stroke="#f0d8b0"
                  strokeScaleEnabled={false}
                  listening={false}
                />
              ) : guide.type === "center-x" ? (
                <Line
                  key={`cx-${index}`}
                  points={[guide.x, 80, guide.x, -shown.room.depth - 80]}
                  stroke="#7eb6ff"
                  dash={[4, 4]}
                  strokeScaleEnabled={false}
                  listening={false}
                />
              ) : (
                <Line
                  key={`cy-${index}`}
                  points={[-80, -guide.y, shown.room.width + 80, -guide.y]}
                  stroke="#7eb6ff"
                  dash={[4, 4]}
                  strokeScaleEnabled={false}
                  listening={false}
                />
              ),
            )}
            {draft && draft.type !== "marquee" ? (
              <Line
                points={[draft.start.x, -draft.start.y, draft.current.x, -draft.current.y]}
                stroke="#f0d8b0"
                dash={[5, 4]}
                strokeScaleEnabled={false}
                listening={false}
              />
            ) : null}
            {draft?.type === "marquee" ? (
              <Rect
                x={Math.min(draft.start.x, draft.current.x)}
                y={-Math.max(draft.start.y, draft.current.y)}
                width={Math.abs(draft.current.x - draft.start.x)}
                height={Math.abs(draft.current.y - draft.start.y)}
                stroke="#e7d7c1"
                dash={[4, 3]}
                strokeScaleEnabled={false}
                listening={false}
              />
            ) : null}
            <Line
              points={[northOrigin.x, -northOrigin.y, northTip.x, -northTip.y]}
              stroke="#f0d8b0"
              strokeWidth={2}
              strokeScaleEnabled={false}
              listening={false}
            />
            {single && tool === "select" ? (
              <>
                {furniturePolygon(single).map((corner, index) => (
                  <Circle
                    key={index}
                    name={`resize:${single.id}`}
                    x={corner.x}
                    y={-corner.y}
                    radius={6 / viewport.scale}
                    fill="#f0d8b0"
                  />
                ))}
                <Circle
                  name={`rotate:${single.id}`}
                  x={rotatePoint({ x: single.x, y: single.y + single.depth / 2 + 22 }, single, single.rotation).x}
                  y={-rotatePoint({ x: single.x, y: single.y + single.depth / 2 + 22 }, single, single.rotation).y}
                  radius={7 / viewport.scale}
                  fill="#7eb6ff"
                />
              </>
            ) : null}
          </Group>
        </Layer>
      </Stage>
      {labels.map((label) => {
        const screen = worldToScreen(label.at, viewport);
        return (
          <div
            key={label.key}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded bg-[#1c1915]/90 px-1.5 py-0.5 text-[11px] text-[#f0d8b0]"
            style={{ left: screen.x, top: screen.y - 8 }}
          >
            {label.text}
          </div>
        );
      })}
      <div
        className="pointer-events-none absolute text-xs tracking-[0.2em] text-[#f0d8b0]"
        style={(() => {
          const screen = worldToScreen(northTip, viewport);
          return { left: screen.x + 6, top: screen.y - 8 };
        })()}
      >
        N
      </div>
    </div>
  );
}

function gridLines(width: number, depth: number) {
  const lines = [];
  for (let x = 0; x <= width; x += 50) {
    lines.push(
      <Line
        key={`vx-${x}`}
        points={[x, 0, x, -depth]}
        stroke="#2a2e32"
        strokeScaleEnabled={false}
        listening={false}
      />,
    );
  }
  for (let y = 0; y <= depth; y += 50) {
    lines.push(
      <Line
        key={`hy-${y}`}
        points={[0, -y, width, -y]}
        stroke="#2a2e32"
        strokeScaleEnabled={false}
        listening={false}
      />,
    );
  }
  return lines;
}

function labelsFor(
  doc: ProjectDocument,
  draft: Draft,
  guides: { type: string; a?: Point; b?: Point; cm?: number }[],
  clearances: { aId: string; bId: string; cm: number; p: Point; q: Point }[],
) {
  const labels: { key: string; at: Point; text: string }[] = [];
  if (doc.showMeasurements) {
    doc.walls.forEach((wall) => {
      labels.push({
        key: wall.id,
        at: { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 },
        text: formatLength(distance(wall.start, wall.end), doc.unit),
      });
    });
  }
  doc.measurements.forEach((item) => {
    labels.push({
      key: item.id,
      at: { x: (item.a.x + item.b.x) / 2, y: (item.a.y + item.b.y) / 2 },
      text: formatLength(distance(item.a, item.b), doc.unit),
    });
  });
  if (draft && draft.type !== "marquee") {
    labels.push({
      key: "draft",
      at: { x: (draft.start.x + draft.current.x) / 2, y: (draft.start.y + draft.current.y) / 2 },
      text: formatLength(distance(draft.start, draft.current), doc.unit),
    });
  }
  guides.forEach((guide, index) => {
    if (guide.type === "gap" && guide.a && guide.b && guide.cm !== undefined) {
      labels.push({
        key: `gap-${index}`,
        at: { x: (guide.a.x + guide.b.x) / 2, y: (guide.a.y + guide.b.y) / 2 },
        text: `${guide.cm} cm`,
      });
    }
  });
  clearances.forEach((item) => {
    labels.push({
      key: `clear-${item.aId}-${item.bId}`,
      at: { x: (item.p.x + item.q.x) / 2, y: (item.p.y + item.q.y) / 2 },
      text: `${item.cm} cm`,
    });
  });
  doc.texts.forEach((item) => labels.push({ key: item.id, at: item, text: item.text }));
  return labels;
}
