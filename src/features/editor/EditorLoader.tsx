"use client";

import dynamic from "next/dynamic";

const EditorApp = dynamic(() => import("@/features/editor/EditorApp").then((mod) => mod.EditorApp), {
  ssr: false,
  loading: () => <div className="h-dvh bg-[#16181a]" />,
});

export function EditorLoader({ projectId }: { projectId: string }) {
  return <EditorApp projectId={projectId} />;
}
