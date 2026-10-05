import { setRequestLocale } from "next-intl/server";
import { Showcase } from "@/features/showcase/Showcase";

export default async function ShowcasePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Showcase />;
}
