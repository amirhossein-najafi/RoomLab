"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { allCatalog, budgetTotal, getCatalogItem } from "@/domain/catalog";
import {
  alignSelection,
  deleteSelection,
  duplicateSelection,
  groupSelection,
  replaceFurniture,
  scaleFloorPlan,
  setBeforeImage,
  setBudgetLimit,
  setColor,
  setFloor,
  setFloorPlan,
  setLighting,
  setOrientation,
  setWallFinish,
  updateFurniture,
  updateOpening,
  updateText,
} from "@/domain/commands";
import { formatClock, formatLength, formatMoney, roomAreaM2 } from "@/domain/format";
import { COLOR_SWATCHES, FLOOR_MATERIALS, resolveColor, WALL_MATERIALS, type ProjectDocument } from "@/domain/schema";
import { distance } from "@/geometry/distance";
import { roomKind, suggestLayouts } from "@/domain/examples";
import { sunlightSpan } from "@/geometry/sun";
import { useEditor } from "@/features/editor/store";
import { exportJson, exportPdf, exportPng } from "@/features/export/exportPlan";
import { measureImage, readFileAsDataUrl } from "@/lib/files";
import { saveRemote, storeAsset } from "@/lib/supabase/projects";

export function Inspector() {
  const t = useTranslations();
  const doc = useEditor((state) => state.doc);
  const selection = useEditor((state) => state.selection);
  const [replaceMode, setReplaceMode] = useState<"same" | "cheaper" | "smaller" | "similar">("cheaper");
  if (!doc) return null;
  const furniture = doc.furniture.filter((item) => selection.includes(item.id));
  const wall = doc.walls.find((item) => selection.length === 1 && item.id === selection[0]);
  const opening = doc.openings.find((item) => selection.length === 1 && item.id === selection[0]);
  const text = doc.texts.find((item) => selection.length === 1 && item.id === selection[0]);
  const floor = selection.length === 1 && selection[0] === "floor";

  const commit = (next: ProjectDocument, key: string, params?: Record<string, string | number>) => {
    useEditor.getState().commit(next, key, params);
  };

  return (
    <section className="space-y-4 border-b border-white/10 px-3 py-3">
      {furniture.length === 1 ? (
        <FurnitureFields
          itemId={furniture[0].id}
          replaceMode={replaceMode}
          onMode={setReplaceMode}
          onCommit={commit}
        />
      ) : null}
      {furniture.length > 1 ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="editor-button" onClick={() => commit(alignSelection(doc, selection, "left"), "history.aligned")}>
            {t("inspector.alignLeft")}
          </button>
          <button type="button" className="editor-button" onClick={() => commit(alignSelection(doc, selection, "center"), "history.aligned")}>
            {t("inspector.alignCenter")}
          </button>
          <button type="button" className="editor-button" onClick={() => commit(alignSelection(doc, selection, "distribute"), "history.aligned")}>
            {t("inspector.distribute")}
          </button>
          <button type="button" className="editor-button" onClick={() => commit(groupSelection(doc, selection), "history.grouped")}>
            {t("inspector.group")}
          </button>
          <button type="button" className="editor-button" onClick={() => commit(duplicateSelection(doc, selection), "history.duplicated")}>
            {t("inspector.duplicate")}
          </button>
          <button type="button" className="editor-button" onClick={() => { commit(deleteSelection(doc, selection), "history.deleted"); useEditor.getState().setSelection([]); }}>
            {t("inspector.delete")}
          </button>
        </div>
      ) : null}
      {wall ? (
        <div>
          <p className="text-sm">{t("tools.wall")}</p>
          <p className="mt-2 text-xs text-[#e7d7c1]/60">{t("inspector.paint")}</p>
          <ColorSwatches
            value={resolveColor(wall.finish.paint)}
            onPick={(hex) => commit(setWallFinish(doc, wall.id, { paint: hex }), "history.material")}
            historyKey="history.material"
            onPreview={(hex) => useEditor.getState().preview(setWallFinish(doc, wall.id, { paint: hex }))}
          />
          <p className="mt-3 text-xs text-[#e7d7c1]/60">{t("inspector.material")}</p>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {WALL_MATERIALS.map((material) => (
              <button key={material} type="button" className={`editor-button ${wall.finish.material === material ? "bg-[#e7d7c1] text-[#1c1915]" : ""}`} onClick={() => commit(setWallFinish(doc, wall.id, { material }), "history.material")}>
                {t(`materials.${material}`)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {opening ? (
        <div className="space-y-2">
          <p className="text-sm">{t(opening.type === "door" ? "tools.door" : "tools.window")}</p>
          <NumberField label={t("inspector.openingWidth")} value={opening.width} onCommit={(width) => commit(updateOpening(doc, opening.id, { width }), "history.resized", { name: t(opening.type === "door" ? "tools.door" : "tools.window") })} />
          {opening.type === "door" ? (
            <div className="flex gap-2">
              {(["left", "right"] as const).map((swing) => (
                <button key={swing} type="button" className={`editor-button ${opening.swing === swing ? "bg-[#e7d7c1] text-[#1c1915]" : ""}`} onClick={() => commit(updateOpening(doc, opening.id, { swing }), "history.door")}>
                  {t(`inspector.${swing}`)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {text ? (
        <label className="block text-xs">
          {t("inspector.text")}
          <textarea className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2 text-sm" value={text.text} onChange={(event) => useEditor.getState().preview(updateText(doc, text.id, event.target.value))} onBlur={() => useEditor.getState().endGesture("history.text")} onFocus={() => useEditor.getState().startGesture()} />
        </label>
      ) : null}
      {floor ? (
        <div className="grid grid-cols-2 gap-1">
          {FLOOR_MATERIALS.map((material) => (
            <button key={material} type="button" className={`editor-button ${doc.floor.material === material ? "bg-[#e7d7c1] text-[#1c1915]" : ""}`} onClick={() => commit(setFloor(doc, material), "history.floor")}>
              {t(`floors.${material}`)}
            </button>
          ))}
        </div>
      ) : null}
      {furniture.length === 0 && !wall && !opening && !text && !floor ? (
        <p className="text-sm text-[#e7d7c1]/60">{t("inspector.empty")}</p>
      ) : null}
    </section>
  );
}

function FurnitureFields({
  itemId,
  replaceMode,
  onMode,
  onCommit,
}: {
  itemId: string;
  replaceMode: "same" | "cheaper" | "smaller" | "similar";
  onMode: (mode: "same" | "cheaper" | "smaller" | "similar") => void;
  onCommit: (doc: ProjectDocument, key: string, params?: Record<string, string | number>) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const doc = useEditor((state) => state.doc);
  const item = doc?.furniture.find((entry) => entry.id === itemId);
  if (!doc || !item) return null;
  const catalog = getCatalogItem(item.catalogItemId);
  const options = catalog
    ? allCatalog().filter((other) => {
        if (other.id === catalog.id || other.kind !== catalog.kind) return false;
        if (replaceMode === "same") return Math.abs(other.width - catalog.width) <= 20 && Math.abs(other.depth - catalog.depth) <= 20;
        if (replaceMode === "cheaper") return other.price < catalog.price;
        if (replaceMode === "smaller") return other.width * other.depth < catalog.width * catalog.depth * 0.95;
        return other.colorName === catalog.colorName;
      })
    : [];
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm">{catalog?.name}</p>
        <p className="text-xs text-[#e7d7c1]/50">{catalog ? formatMoney(catalog.price, locale) : ""}</p>
      </div>
      <NumberField label={`${t("inspector.width")} cm`} value={item.width} onCommit={(width) => onCommit(updateFurniture(doc, item.id, { width }), "history.resized", { name: catalog?.name ?? "Item" })} />
      <NumberField label={`${t("inspector.depth")} cm`} value={item.depth} onCommit={(depth) => onCommit(updateFurniture(doc, item.id, { depth }), "history.resized", { name: catalog?.name ?? "Item" })} />
      <NumberField label={t("inspector.rotation")} value={Math.round(item.rotation)} onCommit={(rotation) => onCommit(updateFurniture(doc, item.id, { rotation }), "history.rotated", { name: catalog?.name ?? "Item" })} />
      <div>
        <p className="text-xs text-[#e7d7c1]/60">{t("inspector.color")}</p>
        <ColorSwatches
          value={item.color}
          onPick={(hex) => onCommit(setColor(doc, [item.id], hex), "history.color")}
          historyKey="history.color"
          onPreview={(hex) => useEditor.getState().preview(setColor(doc, [item.id], hex))}
        />
      </div>
      <div className="flex gap-2">
        <button type="button" className="editor-button" onClick={() => onCommit(duplicateSelection(doc, [item.id]), "history.duplicated")}>{t("inspector.duplicate")}</button>
        <button type="button" className="editor-button" onClick={() => { onCommit(deleteSelection(doc, [item.id]), "history.deleted"); useEditor.getState().setSelection([]); }}>{t("inspector.delete")}</button>
      </div>
      <div>
        <p className="text-xs text-[#e7d7c1]/60">{t("inspector.replace")}</p>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {(["same", "cheaper", "smaller", "similar"] as const).map((mode) => (
            <button key={mode} type="button" className={`editor-button ${replaceMode === mode ? "bg-[#e7d7c1] text-[#1c1915]" : ""}`} onClick={() => onMode(mode)}>
              {t(`inspector.${mode}`)}
            </button>
          ))}
        </div>
        <div className="mt-2 space-y-1">
          {options.length === 0 ? <p className="text-xs text-[#e7d7c1]/50">{t("inspector.none")}</p> : null}
          {options.map((option) => (
            <button key={option.id} type="button" className="editor-button w-full text-left" onClick={() => onCommit(replaceFurniture(doc, item.id, option), "history.replaced", { name: option.name })}>
              {option.name} · {formatMoney(option.price, locale)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ColorSwatches({
  value,
  onPick,
  onPreview,
  historyKey,
}: {
  value: string;
  onPick: (hex: string) => void;
  onPreview: (hex: string) => void;
  historyKey: string;
}) {
  const t = useTranslations();
  const current = value.toLowerCase();
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {COLOR_SWATCHES.map((color) => (
        <button
          key={color.id}
          type="button"
          title={t(`colors.${color.id}`)}
          aria-label={t(`colors.${color.id}`)}
          className={`h-6 w-6 rounded-full border ${current === color.hex ? "border-white ring-1 ring-white" : "border-white/20"}`}
          style={{ background: color.hex }}
          onClick={() => onPick(color.hex)}
        />
      ))}
      <label className="relative h-6 w-6 overflow-hidden rounded-full border border-white/40" title={t("inspector.custom")}>
        <input
          type="color"
          aria-label={t("inspector.custom")}
          className="absolute -inset-1 h-8 w-8 cursor-pointer border-0 bg-transparent p-0"
          value={current.startsWith("#") && current.length === 7 ? current : "#f4f1ea"}
          onFocus={() => useEditor.getState().startGesture()}
          onInput={(event) => onPreview(event.currentTarget.value)}
          onBlur={() => useEditor.getState().endGesture(historyKey)}
        />
      </label>
    </div>
  );
}

function NumberField({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const [text, setText] = useState(String(Math.round(value)));
  useEffect(() => setText(String(Math.round(value))), [value]);
  return (
    <label className="block text-xs text-[#e7d7c1]/70">
      {label}
      <input
        className="mt-1 w-full rounded border border-white/10 bg-black/20 px-2 py-1 text-sm text-[#f4efe6]"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const next = Number(text);
          if (Number.isFinite(next)) onCommit(next);
        }}
      />
    </label>
  );
}

export function LightingPanel() {
  const t = useTranslations();
  const doc = useEditor((state) => state.doc);
  if (!doc) return null;
  const span = sunlightSpan(doc);
  return (
    <section className="space-y-3 border-b border-white/10 px-3 py-3">
      <p className="text-xs tracking-[0.16em] text-[#e7d7c1]/60 uppercase">{t("lighting.title")}</p>
      <label className="block text-xs">
        {t("lighting.time")} · {formatClock(doc.lighting.minutes)}
        <input
          className="mt-2 w-full accent-[#e7d7c1]"
          type="range"
          min={360}
          max={1080}
          step={10}
          value={doc.lighting.minutes}
          onChange={(event) => {
            const state = useEditor.getState();
            if (!state.gesture) state.startGesture();
            const base = useEditor.getState().gesture;
            if (!base) return;
            state.preview(setLighting(base, { minutes: Number(event.target.value) }));
          }}
          onPointerUp={() => useEditor.getState().endGesture("history.lighting")}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={doc.lighting.sunlight} onChange={(event) => useEditor.getState().commit(setLighting(doc, { sunlight: event.target.checked }), "history.lighting")} />
        {t("lighting.sun")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={doc.lighting.lamps} onChange={(event) => useEditor.getState().commit(setLighting(doc, { lamps: event.target.checked }), "history.lighting")} />
        {t("lighting.lamps")}
      </label>
      <div>
        <p className="text-xs text-[#e7d7c1]/60">{t("lighting.north")} ↑</p>
        <div className="mt-1 grid grid-cols-4 gap-1">
          {[0, 90, 180, 270].map((angle) => (
            <button key={angle} type="button" className={`editor-button ${doc.orientation === angle ? "bg-[#e7d7c1] text-[#1c1915]" : ""}`} onClick={() => useEditor.getState().commit(setOrientation(doc, angle), "history.orientation")}>
              {angle}°
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm leading-5 text-[#f0d8b0]">
        {span
          ? t("sun.direct", { room: doc.room.name, start: span.labelStart, end: span.labelEnd })
          : t("sun.none", { room: doc.room.name })}
      </p>
    </section>
  );
}

export function BudgetPanel() {
  const t = useTranslations();
  const locale = useLocale();
  const doc = useEditor((state) => state.doc);
  if (!doc) return null;
  const lines = doc.furniture.map((item) => ({
    id: item.id,
    name: getCatalogItem(item.catalogItemId)?.name ?? "Item",
    price: getCatalogItem(item.catalogItemId)?.price ?? 0,
  }));
  const total = budgetTotal(doc.furniture);
  const over = total - doc.budgetLimit;
  return (
    <section className="space-y-2 border-b border-white/10 px-3 py-3">
      <p className="text-xs tracking-[0.16em] text-[#e7d7c1]/60 uppercase">{t("budget.title")}</p>
      {lines.length === 0 ? <p className="text-sm text-[#e7d7c1]/50">{t("budget.empty")}</p> : null}
      {lines.map((line) => (
        <div key={line.id} className="flex justify-between text-sm">
          <span className="truncate pr-3">{line.name}</span>
          <span>{formatMoney(line.price, locale)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-white/10 pt-2 text-sm">
        <span>{t("budget.total")}</span>
        <span>{formatMoney(total, locale)}</span>
      </div>
      <NumberField label={t("budget.limit")} value={doc.budgetLimit} onCommit={(budgetLimit) => useEditor.getState().commit(setBudgetLimit(doc, budgetLimit), "history.budget")} />
      {over > 0 ? <p className="text-sm text-[#e7b0a4]">{t("budget.over", { amount: formatMoney(over, locale) })}</p> : null}
    </section>
  );
}

export function LayoutPicker() {
  const t = useTranslations();
  const doc = useEditor((state) => state.doc);
  if (!doc) return null;
  const kind = roomKind(doc.room.name);
  const layouts = suggestLayouts(doc);
  return (
    <section className="space-y-2 border-b border-white/10 px-3 py-3">
      <p className="text-xs tracking-[0.16em] text-[#e7d7c1]/60 uppercase">{t("layouts.title")}</p>
      <div className="grid grid-cols-3 gap-2">
        {layouts.map((layout) => (
          <button
            key={layout.id}
            type="button"
            className="rounded border border-white/10 p-1 text-left hover:border-[#e7d7c1]"
            onMouseEnter={() => useEditor.getState().setPreview(layout.furniture)}
            onMouseLeave={() => useEditor.getState().setPreview(null)}
            onClick={() => {
              useEditor.getState().commit({ ...doc, furniture: layout.furniture }, "history.layout", { id: layout.id });
              useEditor.getState().setPreview(null);
            }}
          >
            <Thumb doc={doc} furniture={layout.furniture} />
            <span className="mt-1 block text-center text-xs">{layout.id}</span>
          </button>
        ))}
      </div>
      {layouts.map((layout) => (
        <p key={`${layout.id}-copy`} className="text-xs text-[#e7d7c1]/70">
          {layout.id}. {t(`layouts.${kind}.${layout.id}`)}
        </p>
      ))}
    </section>
  );
}

function Thumb({ doc, furniture }: { doc: ProjectDocument; furniture: ProjectDocument["furniture"] }) {
  const w = doc.room.width;
  const d = doc.room.depth;
  return (
    <svg viewBox={`0 0 ${w} ${d}`} className="h-14 w-full bg-[#1a1c1e]">
      <rect width={w} height={d} fill="#2c2824" />
      {furniture.map((item) => (
        <rect
          key={item.id}
          x={-item.width / 2}
          y={-item.depth / 2}
          width={item.width}
          height={item.depth}
          fill={item.color}
          transform={`translate(${item.x} ${d - item.y}) rotate(${-item.rotation})`}
        />
      ))}
    </svg>
  );
}

export function HistoryPanel() {
  const t = useTranslations();
  const locale = useLocale();
  const entries = useEditor((state) => state.entries);
  const index = useEditor((state) => state.index);
  const format = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  return (
    <section className="px-3 py-3">
      <p className="text-xs tracking-[0.16em] text-[#e7d7c1]/60 uppercase">{t("history.title")}</p>
      <ol data-testid="history-list" className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {entries.length === 0 ? <li className="text-sm text-[#e7d7c1]/50">{t("history.empty")}</li> : null}
        {entries.map((entry, entryIndex) => (
          <li key={`${entry.at}-${entryIndex}`}>
            <button type="button" onClick={() => useEditor.getState().jump(entryIndex)} className={`flex w-full justify-between rounded px-2 py-1 text-left text-xs ${entryIndex === index ? "bg-white/10" : "hover:bg-white/5"}`}>
              <span>{t(entry.key, entry.params)}</span>
              <span className="text-[#e7d7c1]/40">{format.format(entry.at)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function SharePanel({ notice, setNotice }: { notice: string; setNotice: (value: string) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const doc = useEditor((state) => state.doc);
  if (!doc) return null;
  return (
    <section className="space-y-2 px-3 py-3">
      <p className="text-xs tracking-[0.16em] text-[#e7d7c1]/60 uppercase">{t("share.title")}</p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={doc.isPublic}
          onChange={(event) => useEditor.getState().patchCurrent({ ...doc, isPublic: event.target.checked })}
        />
        {t("share.public")}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="editor-button" onClick={() => exportPng()}>{t("share.png")}</button>
        <button type="button" className="editor-button" onClick={() => exportPdf(doc, locale)}>{t("share.pdf")}</button>
        <button type="button" className="editor-button" onClick={() => exportJson(doc)}>{t("share.json")}</button>
        <button
          type="button"
          className="editor-button"
          onClick={async () => {
            const current = useEditor.getState().doc;
            if (!current) return;
            const next = { ...current, isPublic: true };
            const result = await saveRemote(next);
            if (!result.ok) {
              setNotice(t("share.needCloud"));
              return;
            }
            useEditor.getState().patchCurrent(result.doc);
            await navigator.clipboard.writeText(`${window.location.origin}/${locale}/design/${result.doc.slug}`);
            setNotice(t("share.copied"));
          }}
        >
          {t("share.copy")}
        </button>
      </div>
      <label className="editor-button block cursor-pointer text-center">
        {t("landing.import")}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void attachPlan(file);
          }}
        />
      </label>
      <label className="editor-button block cursor-pointer text-center">
        {t("before.upload")}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void attachBefore(file);
          }}
        />
      </label>
      {doc.beforeImage ? (
        <button type="button" className="editor-button w-full" onClick={() => useEditor.getState().setBeforeAfter(true)}>
          {t("before.title")}
        </button>
      ) : null}
      {notice ? <p className="text-xs text-[#f0d8b0]">{notice}</p> : null}
      <p className="text-xs text-[#e7d7c1]/50">
        {roomAreaM2(doc.room.width, doc.room.depth).toFixed(1)} m² · {formatLength(distance(doc.walls[0]?.start ?? { x: 0, y: 0 }, doc.walls[0]?.end ?? { x: 0, y: 0 }), doc.unit)}
      </p>
    </section>
  );
}

async function attachPlan(file: File) {
  const doc = useEditor.getState().doc;
  if (!doc) return;
  const data = await readFileAsDataUrl(file);
  const size = await measureImage(data);
  const src = await storeAsset(doc.id, file, data);
  const width = doc.room.width;
  const height = width * (size.height / Math.max(1, size.width));
  useEditor.getState().commit(setFloorPlan(doc, { src, x: 0, y: 0, width, height }), "history.import");
  useEditor.getState().setTool("scale");
}

async function attachBefore(file: File) {
  const doc = useEditor.getState().doc;
  if (!doc) return;
  const data = await readFileAsDataUrl(file);
  const src = await storeAsset(doc.id, file, data);
  useEditor.getState().commit(setBeforeImage(doc, src), "history.before");
  useEditor.getState().setBeforeAfter(true);
}

export function ScaleDialog() {
  const t = useTranslations();
  const prompt = useEditor((state) => state.scalePrompt);
  const [meters, setMeters] = useState("4");
  if (!prompt) return null;
  return (
    <form
      className="absolute top-4 left-1/2 z-30 w-72 -translate-x-1/2 rounded-lg border border-white/10 bg-[#242628] p-3 shadow-xl"
      onSubmit={(event) => {
        event.preventDefault();
        const doc = useEditor.getState().doc;
        if (!doc) return;
        useEditor.getState().commit(scaleFloorPlan(doc, prompt.a, prompt.b, Number(meters) * 100), "history.scale");
        useEditor.getState().setScalePrompt(null);
      }}
    >
      <p className="text-sm">{t("import.hint")}</p>
      <label className="mt-2 block text-xs">
        {t("import.distance")}
        <input className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-1" value={meters} onChange={(event) => setMeters(event.target.value)} data-testid="scale-meters" />
      </label>
      <button type="submit" className="editor-button mt-2 w-full bg-[#e7d7c1] text-[#1c1915]">{t("import.apply")}</button>
    </form>
  );
}

export function BeforeAfter() {
  const t = useTranslations();
  const doc = useEditor((state) => state.doc);
  const open = useEditor((state) => state.beforeAfter);
  const [value, setValue] = useState(50);
  if (!open || !doc?.beforeImage) return null;
  return (
    <div className="absolute inset-0 z-20">
      <img src={doc.beforeImage} alt={t("before.before")} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 0 0 ${value}%)` }} />
      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
        <span className="text-xs text-[#f4efe6]">{t("before.design")}</span>
        <input type="range" min={0} max={100} value={value} onChange={(event) => setValue(Number(event.target.value))} className="w-56" />
        <span className="text-xs text-[#f4efe6]">{t("before.before")}</span>
        <button type="button" className="editor-button" onClick={() => useEditor.getState().setBeforeAfter(false)}>{t("common.close")}</button>
      </div>
    </div>
  );
}
