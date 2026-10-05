import { setRequestLocale } from "next-intl/server";
import { EditorLoader } from "@/features/editor/EditorLoader";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);
  return <EditorLoader projectId={projectId} />;
}
