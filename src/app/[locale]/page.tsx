import { setRequestLocale } from "next-intl/server";
import { Landing } from "@/features/landing/Landing";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Landing />;
}
