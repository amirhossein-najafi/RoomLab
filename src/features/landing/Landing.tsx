"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createProject, setFloorPlan } from "@/domain/commands";
import { ROOM_PRESETS } from "@/domain/rooms";
import type { CatalogCategory } from "@/domain/catalog";
import { saveLocal } from "@/features/projects/storage";
import { useRouter } from "@/i18n/navigation";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Link } from "@/i18n/navigation";
import { measureImage, readFileAsDataUrl } from "@/lib/files";

export function Landing() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState<"create" | "import" | null>(null);
  const [room, setRoom] = useState<CatalogCategory>("bedroom");
  const [name, setName] = useState("Bedroom");
  const [width, setWidth] = useState("4.2");
  const [depth, setDepth] = useState("3.6");
  const [file, setFile] = useState<File | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const doc = createProject({
      name: name.trim() || "Bedroom",
      widthM: Number(width) || 4.2,
      depthM: Number(depth) || 3.6,
    });
    if (file) {
      const data = await readFileAsDataUrl(file);
      const size = await measureImage(data);
      const planWidth = doc.room.width;
      doc.floorPlan = {
        src: data,
        x: 0,
        y: 0,
        width: planWidth,
        height: planWidth * (size.height / Math.max(1, size.width)),
      };
      sessionStorage.setItem("roomlab:intent", "scale");
    }
    const next = file ? setFloorPlan(doc, doc.floorPlan) : doc;
    saveLocal(next);
    router.push(`/editor/${next.id}`);
  }

  return (
    <div className="paper min-h-dvh bg-[#f3eee6] text-[#1c1915]">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="font-display text-2xl">RoomLab</span>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/showcase" className="underline decoration-[#b85a32]/40 underline-offset-4">{t("landing.showcase")}</Link>
          <LanguageSwitch />
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl items-end gap-10 px-6 pt-8 pb-20 md:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-xs tracking-[0.28em] text-[#b85a32] uppercase">{t("landing.kicker")}</p>
          <h1 className="font-display mt-4 max-w-3xl text-5xl leading-[1.02] md:text-7xl">{t("landing.title")}</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#1c1915]/70">{t("landing.lede")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" data-testid="create-room" className="rounded-full bg-[#1c1915] px-5 py-3 text-sm text-[#f3eee6]" onClick={() => setOpen("create")}>
              {t("landing.create")}
            </button>
            <button type="button" data-testid="import-plan" className="rounded-full border border-[#1c1915]/20 px-5 py-3 text-sm" onClick={() => setOpen("import")}>
              {t("landing.import")}
            </button>
          </div>
        </div>
        <PlanSketch />
      </main>
      {open ? (
        <form onSubmit={submit} className="fixed inset-0 z-20 grid place-items-center bg-[#1c1915]/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#f7f3ec] p-5 shadow-2xl">
            <h2 className="font-display text-3xl">{open === "import" ? t("create.importTitle") : t("create.title")}</h2>
            <p className="mt-4 text-sm">{t("create.type")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROOM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`room-type-${preset.id}`}
                  className={`rounded-full px-3 py-1 text-xs ${room === preset.id ? "bg-[#1c1915] text-[#f3eee6]" : "border border-[#1c1915]/15"}`}
                  onClick={() => {
                    setRoom(preset.id);
                    setName(t(`rooms.${preset.id}`));
                    setWidth(preset.width);
                    setDepth(preset.depth);
                  }}
                >
                  {t(`rooms.${preset.id}`)}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm">
              {t("create.name")}
              <input data-testid="room-name" className="mt-1 w-full rounded border border-[#1c1915]/15 bg-white px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">
                {t("create.width")}
                <input data-testid="room-width" className="mt-1 w-full rounded border border-[#1c1915]/15 bg-white px-3 py-2" value={width} onChange={(event) => setWidth(event.target.value)} />
              </label>
              <label className="text-sm">
                {t("create.depth")}
                <input data-testid="room-depth" className="mt-1 w-full rounded border border-[#1c1915]/15 bg-white px-3 py-2" value={depth} onChange={(event) => setDepth(event.target.value)} />
              </label>
            </div>
            {open === "import" ? (
              <label className="mt-3 block text-sm">
                {t("create.file")}
                <input type="file" accept="image/*" className="mt-1 block w-full text-sm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </label>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-full px-4 py-2 text-sm" onClick={() => setOpen(null)}>{t("create.cancel")}</button>
              <button type="submit" data-testid="room-submit" className="rounded-full bg-[#b85a32] px-4 py-2 text-sm text-white">{t("create.submit")}</button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function PlanSketch() {
  return (
    <svg viewBox="0 0 420 320" className="w-full rounded-2xl border border-[#1c1915]/10 bg-[#faf7f2] p-4">
      <rect x="40" y="36" width="280" height="220" fill="none" stroke="#1c1915" strokeWidth="6" />
      <rect x="168" y="36" width="70" height="10" fill="#faf7f2" stroke="#1c1915" />
      <path d="M168 46 A70 70 0 0 1 238 116" fill="none" stroke="#b85a32" strokeDasharray="4 4" />
      <rect x="78" y="70" width="120" height="70" fill="#d8c3a5" stroke="#1c1915" />
      <rect x="230" y="168" width="70" height="60" fill="#6b4b32" stroke="#1c1915" />
      <text x="40" y="286" fill="#1c1915" fontSize="14">4.20 m</text>
      <text x="336" y="150" fill="#1c1915" fontSize="14">3.60 m</text>
    </svg>
  );
}
