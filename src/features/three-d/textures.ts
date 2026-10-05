import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

const cache = new Map<string, CanvasTexture>();

function canvas() {
  const element = document.createElement("canvas");
  element.width = 128;
  element.height = 128;
  const context = element.getContext("2d");
  if (!context) throw new Error("canvas");
  return { element, context };
}

function paint(kind: string) {
  const { element, context } = canvas();
  if (kind === "brick") {
    context.fillStyle = "#8d4b3a";
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = "#a85b46";
    for (let row = 0; row < 8; row += 1) {
      const offset = row % 2 ? 16 : 0;
      for (let col = -1; col < 5; col += 1) {
        context.fillRect(col * 32 + offset, row * 16 + 1, 30, 14);
      }
    }
  } else if (kind === "wood" || kind === "floor-wood") {
    context.fillStyle = kind === "floor-wood" ? "#8a6242" : "#a67c52";
    context.fillRect(0, 0, 128, 128);
    context.strokeStyle = "rgba(70,40,20,0.35)";
    for (let i = 0; i < 8; i += 1) {
      context.beginPath();
      context.moveTo(0, i * 16);
      context.lineTo(128, i * 16 + 4);
      context.stroke();
    }
  } else if (kind === "concrete" || kind === "floor-concrete") {
    context.fillStyle = "#9a9c9b";
    context.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 400; i += 1) {
      const shade = 120 + Math.random() * 50;
      context.fillStyle = `rgba(${shade},${shade},${shade},0.35)`;
      context.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
  } else if (kind === "floor-tile") {
    context.fillStyle = "#d5dbdd";
    context.fillRect(0, 0, 128, 128);
    context.strokeStyle = "#8e989c";
    context.lineWidth = 2;
    for (let i = 0; i <= 4; i += 1) {
      context.strokeRect(i * 32, 0, 32, 128);
      context.beginPath();
      context.moveTo(0, i * 32);
      context.lineTo(128, i * 32);
      context.stroke();
    }
  } else if (kind === "floor-carpet") {
    context.fillStyle = "#7a4450";
    context.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i += 1) {
      context.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
      context.fillRect(Math.random() * 128, Math.random() * 128, 1, 2);
    }
  }
  const texture = new CanvasTexture(element);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.repeat.set(kind.startsWith("floor") ? 4 : 2, kind.startsWith("floor") ? 4 : 2);
  return texture;
}

export function textureFor(kind: string) {
  const existing = cache.get(kind);
  if (existing) return existing;
  const texture = paint(kind);
  cache.set(kind, texture);
  return texture;
}
