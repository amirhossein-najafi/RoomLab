"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MathUtils, Vector3, type DirectionalLight } from "three";
import { getCatalogItem } from "@/domain/catalog";
import { resolveColor, type Furniture, type ProjectDocument } from "@/domain/schema";
import { circleBlocked } from "@/geometry/collision";
import { add, dot, mul, normalize, sub } from "@/geometry/distance";
import { sunColorHex, sunElevationDeg, sunVector } from "@/geometry/sun";
import { inwardNormal, wallPieces } from "@/geometry/walls";
import { useEditor } from "@/features/editor/store";
import { Piece } from "@/features/three-d/pieces";
import { textureFor } from "@/features/three-d/textures";

export function RoomScene({ doc, walk }: { doc: ProjectDocument; walk: boolean }) {
  const width = doc.room.width / 100;
  const depth = doc.room.depth / 100;
  return (
    <Canvas
      shadows="soft"
      camera={{ position: [width * 0.2, 2.7, depth + 2.4], fov: 42, near: 0.05, far: 80 }}
      dpr={[1, 1.6]}
    >
      <color attach="background" args={["#141210"]} />
      <ambientLight intensity={doc.lighting.lamps ? 0.42 : 0.16} />
      <SunLight doc={doc} />
      <Floor doc={doc} />
      {doc.walls.map((wall) => (
        <WallMesh key={wall.id} doc={doc} wallId={wall.id} />
      ))}
      <FurnitureGroup doc={doc} />
      {walk ? <WalkController doc={doc} /> : <OrbitControls makeDefault target={[width / 2, 0.8, depth / 2]} maxPolarAngle={Math.PI / 2.05} />}
    </Canvas>
  );
}

function SunLight({ doc }: { doc: ProjectDocument }) {
  const light = useRef<DirectionalLight>(null);
  const width = doc.room.width / 100;
  const depth = doc.room.depth / 100;
  const elevation = (sunElevationDeg(doc.lighting.minutes) * Math.PI) / 180;
  const sun = sunVector(doc.lighting.minutes, doc.orientation);
  const horizontal = Math.cos(elevation) * 14;
  const position: [number, number, number] = [
    width / 2 + sun.x * horizontal,
    0.5 + Math.sin(elevation) * 14,
    depth / 2 + sun.y * horizontal,
  ];
  useLayoutEffect(() => {
    const current = light.current;
    if (!current) return;
    current.target.position.set(width / 2, 0.5, depth / 2);
    current.parent?.add(current.target);
    const span = Math.max(width, depth) / 2 + 3;
    current.shadow.camera.left = -span;
    current.shadow.camera.right = span;
    current.shadow.camera.top = span;
    current.shadow.camera.bottom = -span;
    current.shadow.camera.near = 0.2;
    current.shadow.camera.far = 40;
    current.shadow.camera.updateProjectionMatrix();
  }, [depth, position, width]);
  return (
    <directionalLight
      ref={light}
      position={position}
      intensity={doc.lighting.sunlight ? 0.35 + Math.max(0, Math.sin(elevation)) * 2.5 : 0.05}
      color={sunColorHex(doc.lighting.minutes)}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-bias={-0.0008}
    />
  );
}

function Floor({ doc }: { doc: ProjectDocument }) {
  const map = textureFor(`floor-${doc.floor.material}`);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[doc.room.width / 200, 0, doc.room.depth / 200]} receiveShadow>
      <planeGeometry args={[doc.room.width / 100, doc.room.depth / 100]} />
      <meshStandardMaterial map={map} roughness={doc.floor.material === "carpet" ? 1 : 0.75} />
    </mesh>
  );
}

function WallMesh({ doc, wallId }: { doc: ProjectDocument; wallId: string }) {
  const wall = doc.walls.find((item) => item.id === wallId);
  const pieces = useMemo(() => (wall ? wallPieces(wall, doc.openings) : []), [doc.openings, wall]);
  if (!wall) return null;
  const center = { x: doc.room.width / 2, y: doc.room.depth / 2 };
  const dir = normalize(sub(wall.end, wall.start));
  const outward = mul(inwardNormal(wall, center), -1);
  const rotation = -Math.atan2(dir.y, dir.x);
  const map = wall.finish.material === "paint" ? null : textureFor(wall.finish.material);
  const color = wall.finish.material === "paint" ? resolveColor(wall.finish.paint) : "#ffffff";
  const sun = sunVector(doc.lighting.minutes, doc.orientation);
  const elevation = sunElevationDeg(doc.lighting.minutes);
  const facing = dot(sun, outward) > 0.7 && elevation > 5 && doc.lighting.sunlight;
  return (
    <group>
      {pieces.map((piece) => {
        const mid = add(wall.start, mul(dir, (piece.t0 + piece.t1) / 2));
        const placed = add(mid, mul(outward, wall.thickness / 2));
        const length = (piece.t1 - piece.t0) / 100;
        const height = (piece.h1 - piece.h0) / 100;
        return (
          <mesh
            key={`${piece.t0}-${piece.h0}`}
            position={[placed.x / 100, ((piece.h0 + piece.h1) / 2) / 100, placed.y / 100]}
            rotation={[0, rotation, 0]}
            castShadow
            receiveShadow
            onClick={(event) => {
              event.stopPropagation();
              useEditor.getState().setSelection([wall.id]);
            }}
          >
            <boxGeometry args={[Math.max(length, 0.02), Math.max(height, 0.02), wall.thickness / 100]} />
            <meshStandardMaterial color={color} map={map} roughness={0.86} />
          </mesh>
        );
      })}
      {doc.openings
        .filter((opening) => opening.wallId === wall.id)
        .map((opening) => {
          const mid = add(wall.start, mul(dir, opening.offset + opening.width / 2));
          const inside = add(mid, mul(inwardNormal(wall, center), 18));
          const y = (opening.type === "door" ? opening.height / 2 : opening.sill + opening.height / 2) / 100;
          return (
            <group key={opening.id}>
              {opening.type === "window" ? (
                <mesh position={[mid.x / 100, y, mid.y / 100]} rotation={[0, rotation, 0]}>
                  <planeGeometry args={[opening.width / 100, opening.height / 100]} />
                  <meshStandardMaterial
                    color={facing ? sunColorHex(doc.lighting.minutes) : "#c9d7e2"}
                    transparent
                    opacity={0.28}
                    roughness={0.05}
                  />
                </mesh>
              ) : (
                <mesh position={[inside.x / 100, opening.height / 200, inside.y / 100]} rotation={[0, rotation, 0]} castShadow>
                  <boxGeometry args={[opening.width / 100, opening.height / 100, 0.04]} />
                  <meshStandardMaterial color="#6b4b32" />
                </mesh>
              )}
              {facing ? (
                <pointLight
                  position={[inside.x / 100, 1.15, inside.y / 100]}
                  color={sunColorHex(doc.lighting.minutes)}
                  intensity={3.2}
                  distance={6}
                  decay={2}
                />
              ) : null}
            </group>
          );
        })}
    </group>
  );
}

function FurnitureGroup({ doc }: { doc: ProjectDocument }) {
  const lampIds = new Set(
    doc.furniture
      .filter((item) => getCatalogItem(item.catalogItemId)?.kind === "lamp")
      .slice(0, 6)
      .map((item) => item.id),
  );
  return (
    <group>
      {doc.furniture.map((item) => (
        <FurnitureMesh key={item.id} item={item} glow={doc.lighting.lamps && lampIds.has(item.id)} />
      ))}
    </group>
  );
}

function FurnitureMesh({ item, glow }: { item: Furniture; glow: boolean }) {
  const kind = getCatalogItem(item.catalogItemId)?.kind ?? "chair";
  const w = item.width / 100;
  const d = item.depth / 100;
  const h = item.height / 100;
  return (
    <group
      position={[item.x / 100, 0, item.y / 100]}
      rotation={[0, -MathUtils.degToRad(item.rotation), 0]}
      onClick={(event) => {
        event.stopPropagation();
        useEditor.getState().setSelection([item.id]);
      }}
    >
      <Piece kind={kind} width={w} depth={d} height={h} color={item.color} />
      {glow ? <pointLight position={[0, h, 0]} intensity={1.4} distance={3.4} color="#ffd2a8" /> : null}
    </group>
  );
}

function WalkController({ doc }: { doc: ProjectDocument }) {
  const { camera, gl } = useThree();
  const yaw = useRef(Math.PI);
  const pitch = useRef(-0.08);
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  useLayoutEffect(() => {
    camera.position.set(doc.room.width / 200, 1.6, doc.room.depth / 200);
    const onKey = (event: KeyboardEvent, down: boolean) => {
      const key = event.key.toLowerCase();
      if (key === "w" || key === "a" || key === "s" || key === "d") {
        keys.current[key] = down;
        event.preventDefault();
      }
    };
    const down = (event: KeyboardEvent) => onKey(event, true);
    const up = (event: KeyboardEvent) => onKey(event, false);
    const look = (event: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      yaw.current -= event.movementX * 0.0022;
      pitch.current = Math.max(-1.05, Math.min(1.05, pitch.current - event.movementY * 0.0022));
    };
    const click = () => void gl.domElement.requestPointerLock();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", look);
    gl.domElement.addEventListener("click", click);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", look);
      gl.domElement.removeEventListener("click", click);
      if (document.pointerLockElement === gl.domElement) document.exitPointerLock();
    };
  }, [camera, doc.room.depth, doc.room.width, gl.domElement]);

  useFrame((_, delta) => {
    const step = 2.1 * Math.min(delta, 0.05);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    camera.updateMatrixWorld();
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();
    let x = 0;
    let z = 0;
    if (keys.current.w) {
      x += forward.current.x;
      z += forward.current.z;
    }
    if (keys.current.s) {
      x -= forward.current.x;
      z -= forward.current.z;
    }
    if (keys.current.d) {
      x += right.current.x;
      z += right.current.z;
    }
    if (keys.current.a) {
      x -= right.current.x;
      z -= right.current.z;
    }
    const length = Math.hypot(x, z);
    if (!length) return;
    const dx = (x / length) * step;
    const dz = (z / length) * step;
    const nextX = camera.position.x + dx;
    const nextZ = camera.position.z + dz;
    const point = { x: nextX * 100, y: nextZ * 100 };
    const slideX = { x: nextX * 100, y: camera.position.z * 100 };
    const slideZ = { x: camera.position.x * 100, y: nextZ * 100 };
    if (!circleBlocked(doc, point)) {
      camera.position.x = nextX;
      camera.position.z = nextZ;
    } else if (!circleBlocked(doc, slideX)) camera.position.x = nextX;
    else if (!circleBlocked(doc, slideZ)) camera.position.z = nextZ;
    camera.position.y = 1.6;
  });
  return null;
}
