"use client";

import { useEffect } from "react";

export function LocaleAttrs({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
