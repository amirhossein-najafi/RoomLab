import type Konva from "konva";

let stage: Konva.Stage | null = null;

export function setStage(next: Konva.Stage | null) {
  stage = next;
}

export function getStage() {
  return stage;
}
