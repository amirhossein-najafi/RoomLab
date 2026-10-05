import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { exampleBySlug } from "@/domain/examples";
import { DesignView } from "@/features/showcase/Showcase";
import { fetchPublicProject } from "@/lib/supabase/projects";

export default async function DesignPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const doc = exampleBySlug(slug) ?? (await fetchPublicProject(slug));
  if (!doc) notFound();
  return <DesignView doc={doc} />;
}
