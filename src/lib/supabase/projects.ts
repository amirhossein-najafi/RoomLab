import { budgetTotal } from "@/domain/catalog";
import { roomAreaM2 } from "@/domain/format";
import { projectSchema, type ProjectDocument } from "@/domain/schema";
import { createBrowserSupabase, createPublicSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

async function ensureUserId() {
  const supabase = createBrowserSupabase();
  const existing = await supabase.auth.getSession();
  if (existing.data.session?.user.id) return existing.data.session.user.id;
  const signed = await supabase.auth.signInAnonymously();
  if (signed.error || !signed.data.user) throw new Error(signed.error?.message ?? "auth");
  return signed.data.user.id;
}

export async function saveRemote(doc: ProjectDocument) {
  if (!isSupabaseConfigured()) return { ok: false as const, reason: "missing" as const };
  try {
    const ownerId = await ensureUserId();
    const supabase = createBrowserSupabase();
    const next = { ...doc, ownerId };
    const { error } = await supabase.from("projects").upsert({
      id: next.id,
      title: next.title,
      owner_id: ownerId,
      unit: next.unit,
      slug: next.slug,
      is_public: next.isPublic,
      area: roomAreaM2(next.room.width, next.room.depth),
      budget_total: budgetTotal(next.furniture),
      budget_limit: next.budgetLimit,
      orientation: next.orientation,
      document: next,
    });
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const, doc: next };
  } catch (error) {
    return { ok: false as const, reason: error instanceof Error ? error.message : "save" };
  }
}

export async function fetchPublicProjects() {
  const supabase = createPublicSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("document")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(24);
  if (error || !data) return [];
  return data.flatMap((row) => {
    const parsed = projectSchema.safeParse(row.document);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function fetchPublicProject(slug: string) {
  const supabase = createPublicSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("projects")
    .select("document")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error || !data) return null;
  const parsed = projectSchema.safeParse(data.document);
  return parsed.success ? parsed.data : null;
}

export async function storeAsset(projectId: string, file: File, fallback: string) {
  if (!isSupabaseConfigured()) return fallback;
  try {
    const ownerId = await ensureUserId();
    const supabase = createBrowserSupabase();
    const path = `${ownerId}/${projectId}/${crypto.randomUUID()}-${file.name}`;
    const uploaded = await supabase.storage.from("room-assets").upload(path, file, { upsert: false });
    if (uploaded.error) return fallback;
    const url = supabase.storage.from("room-assets").getPublicUrl(path);
    return url.data.publicUrl || fallback;
  } catch {
    return fallback;
  }
}
