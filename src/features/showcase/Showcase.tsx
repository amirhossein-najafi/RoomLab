"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { budgetTotal } from "@/domain/catalog";
import { cloneDocument } from "@/domain/commands";
import { allExamples } from "@/domain/examples";
import { formatMoney, roomAreaM2 } from "@/domain/format";
import type { ProjectDocument } from "@/domain/schema";
import { saveLocal } from "@/features/projects/storage";
import { Link, useRouter } from "@/i18n/navigation";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { fetchPublicProjects } from "@/lib/supabase/projects";

const RoomScene = dynamic(() => import("@/features/three-d/RoomScene").then((mod) => mod.RoomScene), { ssr: false });

export function Showcase() {
  const t = useTranslations();
  const remote = useQuery({ queryKey: ["public-projects"], queryFn: fetchPublicProjects });
  const examples = allExamples();
  const extra = (remote.data ?? []).filter((doc) => !examples.some((item) => item.slug === doc.slug));
  const docs = [...examples, ...extra];
  return (
    <div className="paper min-h-dvh bg-[#f3eee6] text-[#1c1915]">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-2xl">RoomLab</Link>
        <LanguageSwitch />
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <h1 className="font-display text-5xl">{t("showcase.title")}</h1>
        <p className="mt-3 max-w-lg text-[#1c1915]/70">{t("showcase.lede")}</p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {docs.map((doc, index) => (
            <DesignCard key={doc.id} doc={doc} live={index < 5} />
          ))}
        </div>
      </main>
    </div>
  );
}

export function DesignCard({ doc, live = true }: { doc: ProjectDocument; live?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  return (
    <article className="overflow-hidden rounded-2xl border border-[#1c1915]/10 bg-white">
      <Link href={`/design/${doc.slug}`} className="block h-56 bg-[#141210]">
        {live ? <RoomScene doc={doc} walk={false} /> : null}
      </Link>
      <div className="space-y-2 p-4">
        <h2 className="font-display text-2xl">{doc.title}</h2>
        <p className="text-sm text-[#1c1915]/60">
          {roomAreaM2(doc.room.width, doc.room.depth).toFixed(1)} m² · {formatMoney(budgetTotal(doc.furniture), locale)}
        </p>
        <button
          type="button"
          className="rounded-full bg-[#1c1915] px-3 py-1.5 text-sm text-[#f3eee6]"
          onClick={() => {
            const copy = cloneDocument(doc);
            saveLocal(copy);
            router.push(`/editor/${copy.id}`);
          }}
        >
          {t("showcase.duplicate")}
        </button>
      </div>
    </article>
  );
}

export function DesignView({ doc }: { doc: ProjectDocument }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  return (
    <div className="paper min-h-dvh bg-[#f3eee6] text-[#1c1915]">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/showcase" className="font-display text-2xl">RoomLab</Link>
        <LanguageSwitch />
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 md:grid-cols-[1.4fr_0.6fr]">
        <div className="h-[70dvh] overflow-hidden rounded-2xl bg-[#141210]">
          <RoomScene doc={doc} walk={false} />
        </div>
        <div>
          <h1 className="font-display text-5xl">{doc.title}</h1>
          <p className="mt-4 text-lg">
            {roomAreaM2(doc.room.width, doc.room.depth).toFixed(1)} m² · {formatMoney(budgetTotal(doc.furniture), locale)}
          </p>
          <button
            type="button"
            className="mt-6 rounded-full bg-[#b85a32] px-4 py-2 text-sm text-white"
            onClick={() => {
              const copy = cloneDocument(doc);
              saveLocal(copy);
              router.push(`/editor/${copy.id}`);
            }}
          >
            {t("design.duplicate")}
          </button>
        </div>
      </main>
    </div>
  );
}
