"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Command } from "cmdk";
import { AppWindow, DoorOpen, MousePointer2, PenLine, Ruler, Type } from "lucide-react";
import { useTranslations } from "next-intl";
import { budgetTotal, getCatalogItem } from "@/domain/catalog";
import {
  deleteSelection,
  duplicateSelection,
  groupSelection,
  renameRoom,
  setShowMeasurements,
  spawnMany,
} from "@/domain/commands";
import { allExamples } from "@/domain/examples";
import { formatLength, roomAreaM2 } from "@/domain/format";
import { analyze } from "@/geometry/collision";
import { exportPng } from "@/features/export/exportPlan";
import { FloorCanvas } from "@/features/editor/canvas/FloorCanvas";
import {
  BeforeAfter,
  BudgetPanel,
  HistoryPanel,
  Inspector,
  LayoutPicker,
  LightingPanel,
  ScaleDialog,
  SharePanel,
} from "@/features/editor/Panels";
import { Library, placeCatalogItem } from "@/features/furniture/Library";
import { useEditor } from "@/features/editor/store";
import { loadLocal, saveLocal } from "@/features/projects/storage";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { saveRemote } from "@/lib/supabase/projects";

const RoomScene = dynamic(() => import("@/features/three-d/RoomScene").then((mod) => mod.RoomScene), {
  ssr: false,
});

function useIsMobile() {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia("(max-width: 800px)");
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => window.matchMedia("(max-width: 800px)").matches,
    () => false,
  );
}

export function EditorApp({ projectId }: { projectId: string }) {
  const t = useTranslations();
  const doc = useEditor((state) => state.doc);
  const selection = useEditor((state) => state.selection);
  const tool = useEditor((state) => state.tool);
  const view = useEditor((state) => state.view);
  const walk = useEditor((state) => state.walk);
  const paletteOpen = useEditor((state) => state.paletteOpen);
  const sheet = useEditor((state) => state.sheet);
  const preview = useEditor((state) => state.previewFurniture);
  const viewport = useEditor((state) => state.viewport);
  const [missing, setMissing] = useState(false);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const mobile = useIsMobile();
  const primed = useRef(false);
  const shown = useMemo(() => (doc && preview ? { ...doc, furniture: preview } : doc), [doc, preview]);
  const warnings = useMemo(() => (shown ? analyze(shown) : null), [shown]);

  useEffect(() => {
    const found = loadLocal(projectId) ?? allExamples().find((item) => item.id === projectId) ?? null;
    if (!found) setMissing(true);
    else {
      useEditor.getState().load(found);
      if (sessionStorage.getItem("roomlab:intent") === "scale") {
        useEditor.getState().setTool("scale");
        sessionStorage.removeItem("roomlab:intent");
      }
    }
    setReady(true);
  }, [projectId]);

  useEffect(() => {
    if (!doc) return;
    const timer = window.setTimeout(() => saveLocal(doc), 400);
    return () => window.clearTimeout(timer);
  }, [doc]);

  useEffect(() => {
    if (mobile && !primed.current) {
      primed.current = true;
      useEditor.getState().setView("3d");
    }
  }, [mobile]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable);
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        useEditor.getState().setPalette(!useEditor.getState().paletteOpen);
        return;
      }
      if (typing || useEditor.getState().paletteOpen) return;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) useEditor.getState().redo();
        else useEditor.getState().undo();
      } else if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        useEditor.getState().redo();
      } else if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        const current = useEditor.getState().doc;
        if (current) useEditor.getState().commit(duplicateSelection(current, useEditor.getState().selection), "history.duplicated");
      } else if (meta && event.key.toLowerCase() === "g") {
        event.preventDefault();
        const current = useEditor.getState().doc;
        if (current) useEditor.getState().commit(groupSelection(current, useEditor.getState().selection), "history.grouped");
      } else if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        const current = useEditor.getState().doc;
        const ids = useEditor.getState().selection;
        if (!current || !ids.length) return;
        event.preventDefault();
        useEditor.getState().commit(deleteSelection(current, ids), "history.deleted");
        useEditor.getState().setSelection([]);
      } else if (event.key === "Escape") {
        useEditor.getState().cancelGesture();
        useEditor.getState().setDraft(null);
        useEditor.getState().setPalette(false);
      } else if (!meta && !event.altKey) {
        const next = { v: "select", w: "wall", d: "door", n: "window", m: "measure", t: "text" } as const;
        const toolKey = next[event.key.toLowerCase() as keyof typeof next];
        if (toolKey) useEditor.getState().setTool(toolKey);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function save() {
    const current = useEditor.getState().doc;
    if (!current) return;
    setNotice(t("editor.saving"));
    saveLocal(current);
    const result = await saveRemote(current);
    if (result.ok) {
      useEditor.getState().patchCurrent(result.doc);
      setNotice(t("editor.saved"));
    } else if (result.reason === "missing") setNotice(t("editor.saveLocal"));
    else setNotice(t("editor.saveError"));
  }

  if (!ready) return <div className="h-dvh bg-[#16181a]" />;
  if (missing || !doc || !shown) {
    return (
      <div className="grid h-dvh place-items-center bg-[#f3eee6] text-[#1c1915]">
        <Link href="/" className="underline">{t("nav.home")}</Link>
      </div>
    );
  }

  const names = (id: string) => {
    const item = shown.furniture.find((entry) => entry.id === id);
    return item ? (getCatalogItem(item.catalogItemId)?.name ?? "Item") : "Item";
  };

  return (
    <div data-testid="editor" className="flex h-dvh flex-col bg-[#16181a] text-[#f4efe6]">
      <header className="flex items-center gap-3 border-b border-white/10 px-3 py-2">
        <Link href="/" className="font-display text-lg">RoomLab</Link>
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          defaultValue={doc.room.name}
          key={doc.room.name}
          onBlur={(event) => {
            if (event.target.value && event.target.value !== doc.room.name) {
              useEditor.getState().commit(renameRoom(doc, event.target.value), "history.created");
            }
          }}
        />
        <span className="hidden text-xs text-[#e7d7c1]/50 sm:inline">
          {roomAreaM2(doc.room.width, doc.room.depth).toFixed(1)} m² · {formatLength(doc.room.width, doc.unit)} × {formatLength(doc.room.depth, doc.unit)}
        </span>
        <button type="button" data-testid="undo" className="editor-button" onClick={() => useEditor.getState().undo()}>{t("editor.undo")}</button>
        <button type="button" data-testid="redo" className="editor-button" onClick={() => useEditor.getState().redo()}>{t("editor.redo")}</button>
        <button type="button" className="editor-button bg-[#e7d7c1] text-[#1c1915]" onClick={() => void save()}>{t("editor.save")}</button>
        <LanguageSwitch />
      </header>
      <div className={`grid min-h-0 flex-1 ${mobile ? "grid-cols-1" : "grid-cols-[240px_56px_minmax(0,1fr)_300px]"}`}>
        {mobile ? null : (
          <aside className="min-h-0 border-e border-white/10">
            <Library />
          </aside>
        )}
        {mobile ? null : (
          <div className="flex flex-col gap-1 border-e border-white/10 p-1">
            {(
              [
                ["select", MousePointer2],
                ["wall", PenLine],
                ["door", DoorOpen],
                ["window", AppWindow],
                ["measure", Ruler],
                ["text", Type],
              ] as const
            ).map(([item, Icon]) => (
              <button key={item} type="button" data-testid={`tool-${item}`} title={t(`tools.${item}`)} aria-label={t(`tools.${item}`)} className={`editor-button grid h-9 w-9 place-items-center px-0 ${tool === item ? "bg-[#e7d7c1] text-[#1c1915]" : ""}`} onClick={() => useEditor.getState().setTool(item)}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        )}
        <main className="relative min-h-0 min-w-0">
          {warnings && (warnings.overlaps.length || warnings.blockedDoors.length || warnings.clearances.length) ? (
            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 space-y-1">
              {warnings.overlaps.slice(0, 2).map((id) => (
                <p key={id} className="rounded bg-[#3a201c]/90 px-2 py-1 text-xs text-[#ffd2c8]">{t("warnings.overlap", { name: names(id) })}</p>
              ))}
              {warnings.blockedDoors.length ? <p className="rounded bg-[#3a201c]/90 px-2 py-1 text-xs text-[#ffd2c8]">{t("warnings.door")}</p> : null}
              {warnings.clearances.slice(0, 2).map((item) => (
                <p key={`${item.aId}-${item.bId}`} className="rounded bg-[#3a201c]/90 px-2 py-1 text-xs text-[#ffd2c8]">
                  {t("warnings.clearance", { cm: item.cm, a: names(item.aId), b: names(item.bId) })}
                </p>
              ))}
              {warnings.clearances.length ? <p className="rounded bg-[#3a201c]/90 px-2 py-1 text-xs text-[#ffd2c8]">{t("warnings.recommended")}</p> : null}
            </div>
          ) : null}
          <div className={view === "2d" ? "h-full" : "invisible absolute inset-0"}>
            <FloorCanvas />
          </div>
          {view === "3d" ? (
            <div className="absolute inset-0" data-testid="view-3d-canvas">
              <RoomScene doc={shown} walk={walk} />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <button type="button" className="editor-button bg-[#e7d7c1] text-[#1c1915]" onClick={() => useEditor.getState().setWalk(!walk)}>
                  {walk ? t("editor.exitWalk") : t("editor.walk")}
                </button>
                {walk ? <span className="rounded bg-black/50 px-2 py-1 text-xs">{t("editor.walkHint")}</span> : null}
              </div>
            </div>
          ) : null}
          <BeforeAfter />
          <ScaleDialog />
          {mobile && sheet ? (
            <div className="absolute inset-x-0 bottom-0 z-20 max-h-[48%] overflow-y-auto rounded-t-2xl border border-white/10 bg-[#222528]">
              {sheet === "objects" ? <Library onPlace={(item) => placeCatalogItem(item)} /> : null}
              {sheet === "style" ? (
                <>
                  <Inspector />
                  <LightingPanel />
                  <BudgetPanel />
                  <LayoutPicker />
                </>
              ) : null}
              {sheet === "measure" ? (
                <div className="p-3 text-sm">
                  <p>{t("measure.hint")}</p>
                  <button type="button" className="editor-button mt-2" onClick={() => useEditor.getState().setTool("measure")}>{t("tools.measure")}</button>
                </div>
              ) : null}
              {sheet === "share" ? <SharePanel notice={notice} setNotice={setNotice} /> : null}
            </div>
          ) : null}
        </main>
        {mobile ? null : (
          <aside className="min-h-0 overflow-y-auto border-s border-white/10">
            <Inspector />
            <LightingPanel />
            <BudgetPanel />
            <LayoutPicker />
            <HistoryPanel />
            <SharePanel notice={notice} setNotice={setNotice} />
          </aside>
        )}
      </div>
      <footer className="flex items-center gap-2 border-t border-white/10 px-3 py-2 text-sm">
        <button type="button" data-testid="view-2d" className={`editor-button ${view === "2d" ? "bg-[#e7d7c1] text-[#1c1915]" : ""}`} onClick={() => useEditor.getState().setView("2d")}>{t("view.2d")}</button>
        <button type="button" data-testid="view-3d" className={`editor-button ${view === "3d" ? "bg-[#e7d7c1] text-[#1c1915]" : ""}`} onClick={() => useEditor.getState().setView("3d")}>{t("view.3d")}</button>
        <button type="button" className="editor-button" onClick={() => useEditor.getState().zoomToFit()}>{t("editor.fit")}</button>
        <span className="text-xs text-[#e7d7c1]/50">{Math.round(viewport.scale * 100)}% · {t("editor.objects", { count: shown.furniture.length })}</span>
        <span className="ms-auto text-xs text-[#e7d7c1]/40">{notice || `£${budgetTotal(shown.furniture)}`}</span>
        {mobile ? (
          <div className="flex gap-1">
            {(["objects", "style", "measure", "share"] as const).map((item) => (
              <button key={item} type="button" className={`editor-button ${sheet === item ? "bg-[#e7d7c1] text-[#1c1915]" : ""}`} onClick={() => useEditor.getState().setSheet(sheet === item ? null : item)}>
                {t(`mobile.${item}`)}
              </button>
            ))}
          </div>
        ) : null}
      </footer>
      <Command.Dialog open={paletteOpen} onOpenChange={(open) => useEditor.getState().setPalette(open)} label={t("palette.placeholder")}>
        <Command.Input placeholder={t("palette.placeholder")} />
        <Command.List>
          <Command.Empty>{t("library.empty")}</Command.Empty>
          <Command.Item onSelect={() => { const item = getCatalogItem("generic-sofa"); if (item) placeCatalogItem(item); useEditor.getState().setPalette(false); }}>{t("palette.addSofa")}</Command.Item>
          <Command.Item onSelect={() => { useEditor.getState().setView("3d"); useEditor.getState().setPalette(false); }}>{t("palette.switch3d")}</Command.Item>
          <Command.Item onSelect={() => { exportPng(); useEditor.getState().setPalette(false); }}>{t("palette.export")}</Command.Item>
          <Command.Item onSelect={() => { useEditor.getState().zoomToFit(); useEditor.getState().setPalette(false); }}>{t("palette.fit")}</Command.Item>
          <Command.Item onSelect={() => { useEditor.getState().patchCurrent(setShowMeasurements(doc, !doc.showMeasurements)); useEditor.getState().setPalette(false); }}>{t("palette.measure")}</Command.Item>
          <Command.Item onSelect={() => { useEditor.getState().commit(spawnMany(doc, 500), "history.stress", { count: 500 }); useEditor.getState().setPalette(false); }}>{t("palette.stress")}</Command.Item>
        </Command.List>
      </Command.Dialog>
      <span className="sr-only">{selection.length}</span>
    </div>
  );
}
