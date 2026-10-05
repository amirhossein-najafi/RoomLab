import { projectSchema, type ProjectDocument } from "@/domain/schema";

const keyFor = (id: string) => `roomlab:project:${id}`;

export function saveLocal(doc: ProjectDocument) {
  localStorage.setItem(keyFor(doc.id), JSON.stringify(doc));
}

export function loadLocal(id: string): ProjectDocument | null {
  const raw = localStorage.getItem(keyFor(id));
  if (!raw) return null;
  try {
    const parsed = projectSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
