"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { allCatalog, CATALOG_CATEGORIES, getCatalogItem, KIND_EMOJI, type CatalogBrand, type CatalogCategory, type CatalogItem } from "@/domain/catalog";
import { addFurniture } from "@/domain/commands";
import { uid } from "@/domain/ids";
import { useEditor } from "@/features/editor/store";

const BRANDS: Array<CatalogBrand | "all"> = ["all", "ikea", "muji", "west-elm", "generic"];

export function Library({ onPlace }: { onPlace?: (item: CatalogItem) => void }) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<CatalogBrand | "all">("all");
  const [category, setCategory] = useState<CatalogCategory | "all">("all");
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allCatalog().filter((item) => {
      if (brand !== "all" && item.brand !== brand) return false;
      if (category !== "all" && item.category !== category) return false;
      if (!needle) return true;
      return item.name.toLowerCase().includes(needle) || item.brand.includes(needle) || item.kind.includes(needle);
    });
  }, [brand, category, query]);
  const groups = CATALOG_CATEGORIES;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-3 py-3">
        <p className="text-xs tracking-[0.18em] text-[#e7d7c1]/70 uppercase">{t("library.title")}</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("library.search")}
          className="mt-2 w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm outline-none"
        />
        <div className="mt-2 flex flex-wrap gap-1">
          <button type="button" onClick={() => setCategory("all")} className={`rounded-full px-2 py-0.5 text-[11px] ${category === "all" ? "bg-[#e7d7c1] text-[#1c1915]" : "text-[#e7d7c1]/70"}`}>
            {t("brands.all")}
          </button>
          {CATALOG_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full px-2 py-0.5 text-[11px] ${category === item ? "bg-[#e7d7c1] text-[#1c1915]" : "text-[#e7d7c1]/70"}`}
            >
              {t(`library.${item}`)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {BRANDS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setBrand(item)}
              className={`rounded-full px-2 py-0.5 text-[11px] ${brand === item ? "bg-[#e7d7c1] text-[#1c1915]" : "text-[#e7d7c1]/70"}`}
            >
              {t(`brands.${item}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {items.length === 0 ? <p className="px-2 text-sm text-[#e7d7c1]/60">{t("library.empty")}</p> : null}
        {groups.map((group) => {
          const list = items.filter((item) => item.category === group);
          if (!list.length) return null;
          return (
            <section key={group} className="mb-3">
              <h3 className="px-2 py-1 text-[11px] tracking-[0.14em] text-[#e7d7c1]/50 uppercase">{t(`library.${group}`)}</h3>
              {list.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  draggable
                  data-testid={`catalog-${item.id}`}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", item.id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onPlace?.(item)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-white/5"
                >
                  <span>{KIND_EMOJI[item.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.name}</span>
                    <span className="block text-[11px] text-[#e7d7c1]/50">
                      {item.width}×{item.depth} cm
                    </span>
                  </span>
                </button>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function placeCatalogItem(item: CatalogItem) {
  const doc = useEditor.getState().doc;
  if (!doc) return;
  const id = uid();
  useEditor.getState().commit(
    addFurniture(doc, item, doc.room.width / 2, doc.room.depth / 2, id),
    "history.added",
    { name: item.name },
  );
  useEditor.getState().setSelection([id]);
}

export function catalogName(id: string) {
  return getCatalogItem(id)?.name ?? "Item";
}
