import { jsPDF } from "jspdf";
import { budgetTotal, getCatalogItem } from "@/domain/catalog";
import { formatLength, formatMoney, roomAreaM2 } from "@/domain/format";
import type { ProjectDocument } from "@/domain/schema";
import { distance } from "@/geometry/distance";
import { downloadBlob, downloadUrl } from "@/lib/files";
import { getStage } from "@/features/export/stage";

export function exportPng() {
  const stage = getStage();
  if (!stage) return false;
  const url = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
  downloadUrl("roomlab-plan.png", url);
  return true;
}

export function exportJson(doc: ProjectDocument) {
  downloadBlob(
    `${doc.slug}.json`,
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
  );
}

export function exportPdf(doc: ProjectDocument, locale: string) {
  const stage = getStage();
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  pdf.setFont("times", "bold");
  pdf.setFontSize(22);
  pdf.text(doc.title, 36, 42);
  pdf.setFont("times", "normal");
  pdf.setFontSize(11);
  pdf.text(
    `${doc.room.name}  ·  ${formatLength(doc.room.width, doc.unit)} × ${formatLength(doc.room.depth, doc.unit)}  ·  ${roomAreaM2(doc.room.width, doc.room.depth).toFixed(1)} m²`,
    36,
    62,
  );
  if (stage) {
    const url = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    pdf.addImage(url, "PNG", 36, 80, 420, 280);
  }
  pdf.setFont("times", "bold");
  pdf.text("Furniture", 480, 96);
  pdf.setFont("times", "normal");
  let y = 116;
  for (const item of doc.furniture.slice(0, 18)) {
    const catalog = getCatalogItem(item.catalogItemId);
    const name = catalog?.name ?? "Item";
    const price = formatMoney(catalog?.price ?? 0, locale);
    pdf.text(`${name}   ${Math.round(item.width)}×${Math.round(item.depth)} cm   ${price}`, 480, y);
    y += 16;
  }
  pdf.setFont("times", "bold");
  pdf.text(`Total ${formatMoney(budgetTotal(doc.furniture), locale)}`, 480, y + 8);
  y += 36;
  pdf.text("Walls", 480, y);
  pdf.setFont("times", "normal");
  doc.walls.slice(0, 8).forEach((wall, index) => {
    pdf.text(`${index + 1}. ${formatLength(distance(wall.start, wall.end), doc.unit)}`, 480, y + 18 + index * 14);
  });
  pdf.save(`${doc.slug}.pdf`);
}
