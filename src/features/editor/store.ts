"use client";

import { create } from "zustand";
import type { Furniture, Point, ProjectDocument } from "@/domain/schema";
import { fitViewport, type Viewport } from "@/features/editor/viewport";

export type Tool = "select" | "wall" | "door" | "window" | "measure" | "text" | "scale";
export type Sheet = "objects" | "style" | "measure" | "share" | null;
export type Draft =
  | { type: "wall" | "measure" | "scale"; start: Point; current: Point }
  | { type: "marquee"; start: Point; current: Point }
  | null;

export type Guide =
  | { type: "center-x"; x: number }
  | { type: "center-y"; y: number }
  | { type: "gap"; a: Point; b: Point; cm: number };

export type HistoryEntry = {
  key: string;
  params?: Record<string, string | number>;
  at: number;
  snapshot: ProjectDocument;
};

type EditorState = {
  doc: ProjectDocument | null;
  entries: HistoryEntry[];
  index: number;
  selection: string[];
  tool: Tool;
  viewport: Viewport;
  viewSize: { w: number; h: number };
  draft: Draft;
  guides: Guide[];
  view: "2d" | "3d";
  walk: boolean;
  paletteOpen: boolean;
  sheet: Sheet;
  previewFurniture: Furniture[] | null;
  gesture: ProjectDocument | null;
  scalePrompt: { a: Point; b: Point } | null;
  beforeAfter: boolean;
  load: (doc: ProjectDocument) => void;
  commit: (doc: ProjectDocument, key: string, params?: Record<string, string | number>) => void;
  patchCurrent: (doc: ProjectDocument) => void;
  startGesture: () => void;
  preview: (doc: ProjectDocument) => void;
  endGesture: (key: string, params?: Record<string, string | number>) => void;
  cancelGesture: () => void;
  undo: () => void;
  redo: () => void;
  jump: (index: number) => void;
  setSelection: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
  setViewport: (viewport: Viewport) => void;
  setViewSize: (size: { w: number; h: number }) => void;
  zoomToFit: () => void;
  setDraft: (draft: Draft) => void;
  setGuides: (guides: Guide[]) => void;
  setView: (view: "2d" | "3d") => void;
  setWalk: (walk: boolean) => void;
  setPalette: (open: boolean) => void;
  setSheet: (sheet: Sheet) => void;
  setPreview: (furniture: Furniture[] | null) => void;
  setScalePrompt: (prompt: { a: Point; b: Point } | null) => void;
  setBeforeAfter: (open: boolean) => void;
};

const HISTORY_LIMIT = 100;

export const useEditor = create<EditorState>((set, get) => ({
  doc: null,
  entries: [],
  index: 0,
  selection: [],
  tool: "select",
  viewport: { x: 80, y: 480, scale: 0.6 },
  viewSize: { w: 960, h: 640 },
  draft: null,
  guides: [],
  view: "2d",
  walk: false,
  paletteOpen: false,
  sheet: null,
  previewFurniture: null,
  gesture: null,
  scalePrompt: null,
  beforeAfter: false,
  load: (doc) =>
    set({
      doc,
      entries: [{ key: "history.created", at: Date.now(), snapshot: doc }],
      index: 0,
      selection: [],
      draft: null,
      guides: [],
      previewFurniture: null,
      gesture: null,
      scalePrompt: null,
      walk: false,
    }),
  commit: (doc, key, params) =>
    set((state) => {
      const entries = state.entries.slice(0, state.index + 1);
      entries.push({ key, params, at: Date.now(), snapshot: doc });
      while (entries.length > HISTORY_LIMIT) entries.shift();
      return { doc, entries, index: entries.length - 1, gesture: null };
    }),
  patchCurrent: (doc) =>
    set((state) => {
      const entries = state.entries.slice();
      if (entries[state.index]) entries[state.index] = { ...entries[state.index], snapshot: doc };
      return { doc, entries };
    }),
  startGesture: () => {
    const { doc, gesture } = get();
    if (!doc || gesture) return;
    set({ gesture: structuredClone(doc) });
  },
  preview: (doc) => set({ doc }),
  endGesture: (key, params) => {
    const { gesture, doc } = get();
    if (!gesture || !doc) {
      set({ gesture: null, guides: [] });
      return;
    }
    if (JSON.stringify(gesture) === JSON.stringify(doc)) {
      set({ gesture: null, guides: [] });
      return;
    }
    get().commit(doc, key, params);
    set({ guides: [] });
  },
  cancelGesture: () => {
    const { gesture } = get();
    if (!gesture) return;
    set({ doc: gesture, gesture: null, guides: [], draft: null });
  },
  undo: () =>
    set((state) => {
      if (state.index <= 0) return state;
      const index = state.index - 1;
      return {
        index,
        doc: state.entries[index].snapshot,
        selection: [],
        guides: [],
        draft: null,
        previewFurniture: null,
        gesture: null,
      };
    }),
  redo: () =>
    set((state) => {
      if (state.index >= state.entries.length - 1) return state;
      const index = state.index + 1;
      return {
        index,
        doc: state.entries[index].snapshot,
        guides: [],
        draft: null,
        previewFurniture: null,
        gesture: null,
      };
    }),
  jump: (index) =>
    set((state) => {
      const entry = state.entries[index];
      if (!entry) return state;
      return { index, doc: entry.snapshot, guides: [], draft: null, previewFurniture: null, gesture: null };
    }),
  setSelection: (selection) => set({ selection }),
  setTool: (tool) => set({ tool, draft: null }),
  setViewport: (viewport) => set({ viewport }),
  setViewSize: (viewSize) => set({ viewSize }),
  zoomToFit: () => {
    const { doc, viewSize } = get();
    if (!doc || viewSize.w < 20 || viewSize.h < 20) return;
    set({ viewport: fitViewport(doc.room.width, doc.room.depth, viewSize.w, viewSize.h) });
  },
  setDraft: (draft) => set({ draft }),
  setGuides: (guides) => set({ guides }),
  setView: (view) => set({ view, walk: view === "2d" ? false : get().walk }),
  setWalk: (walk) => set({ walk, view: walk ? "3d" : get().view }),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setSheet: (sheet) => set({ sheet }),
  setPreview: (previewFurniture) => set({ previewFurniture }),
  setScalePrompt: (scalePrompt) => set({ scalePrompt }),
  setBeforeAfter: (beforeAfter) => set({ beforeAfter }),
}));
