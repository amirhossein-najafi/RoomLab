"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "en" ? "fa" : "en";
  return (
    <button
      type="button"
      className="editor-button"
      onClick={() => router.replace(pathname, { locale: next })}
    >
      {next === "fa" ? "فارسی" : "EN"}
    </button>
  );
}
