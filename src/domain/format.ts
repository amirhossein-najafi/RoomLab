export function formatLength(cm: number, unit: "m" | "cm" = "m") {
  const rounded = Math.round(cm);
  if (unit === "cm" || Math.abs(rounded) < 100) return `${rounded} cm`;
  return `${(rounded / 100).toFixed(2)} m`;
}

export function formatClock(totalMinutes: number) {
  const minutes = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function roomAreaM2(widthCm: number, depthCm: number) {
  return (widthCm * depthCm) / 10_000;
}
