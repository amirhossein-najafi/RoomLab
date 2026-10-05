"use client";

function Box({
  args,
  position,
  color,
  opacity = 1,
}: {
  args: [number, number, number];
  position: [number, number, number];
  color: string;
  opacity?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.78} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function Cabinet({ width, depth, height, color }: { width: number; depth: number; height: number; color: string }) {
  return (
    <group>
      <Box args={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
      <Box args={[0.02, height * 0.86, 0.015]} position={[0, height / 2, depth / 2 + 0.004]} color="#1c1915" />
    </group>
  );
}

function Seat({ width, depth, height, color, back = true }: { width: number; depth: number; height: number; color: string; back?: boolean }) {
  return (
    <group>
      <Box args={[width * 0.8, 0.08, depth * 0.8]} position={[0, Math.min(0.46, height * 0.45), 0]} color={color} />
      <Box args={[0.08, Math.min(0.42, height * 0.4), 0.08]} position={[0, 0.2, 0]} color="#2c2824" />
      {back ? <Box args={[width * 0.72, height * 0.42, 0.06]} position={[0, height * 0.62, -depth * 0.28]} color={color} /> : null}
    </group>
  );
}

function Table({ width, depth, top, color }: { width: number; depth: number; top: number; color: string }) {
  return (
    <group>
      <Box args={[width, 0.06, depth]} position={[0, top, 0]} color={color} />
      <Box args={[0.06, top - 0.04, 0.06]} position={[-width / 2 + 0.08, top / 2, -depth / 2 + 0.08]} color="#3a2a20" />
      <Box args={[0.06, top - 0.04, 0.06]} position={[width / 2 - 0.08, top / 2, depth / 2 - 0.08]} color="#3a2a20" />
      <Box args={[0.06, top - 0.04, 0.06]} position={[-width / 2 + 0.08, top / 2, depth / 2 - 0.08]} color="#3a2a20" />
      <Box args={[0.06, top - 0.04, 0.06]} position={[width / 2 - 0.08, top / 2, -depth / 2 + 0.08]} color="#3a2a20" />
    </group>
  );
}

export function Piece({
  kind,
  width,
  depth,
  height,
  color,
}: {
  kind: string;
  width: number;
  depth: number;
  height: number;
  color: string;
}) {
  if (kind === "bed") {
    return (
      <group>
        <Box args={[width, 0.18, depth]} position={[0, 0.12, 0]} color="#4a382c" />
        <Box args={[width * 0.94, 0.18, depth * 0.86]} position={[0, 0.28, 0.04]} color={color} />
        <Box args={[width * 0.7, 0.08, 0.28]} position={[0, 0.4, -depth * 0.32]} color="#f4f1ea" />
      </group>
    );
  }
  if (kind === "sofa" || kind === "armchair") {
    return (
      <group>
        <Box args={[width, 0.32, depth * 0.72]} position={[0, 0.22, depth * 0.08]} color={color} />
        <Box args={[width, 0.42, 0.12]} position={[0, 0.48, -depth * 0.38]} color={color} />
        <Box args={[0.1, 0.28, depth * 0.7]} position={[-width / 2 + 0.06, 0.36, 0.04]} color={color} />
        <Box args={[0.1, 0.28, depth * 0.7]} position={[width / 2 - 0.06, 0.36, 0.04]} color={color} />
      </group>
    );
  }
  if (kind === "bench") return <Seat width={width} depth={depth} height={height} color={color} back={false} />;
  if (kind === "stool") return <Seat width={width} depth={depth} height={height} color={color} back={false} />;
  if (kind === "rug") return <Box args={[width, 0.02, depth]} position={[0, 0.01, 0]} color={color} />;
  if (kind === "plant") {
    return (
      <group>
        <mesh position={[0, 0.16, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.28, 12]} />
          <meshStandardMaterial color="#6b4b32" />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <sphereGeometry args={[Math.min(width, depth) * 0.42, 16, 12]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      </group>
    );
  }
  if (kind === "lamp") {
    return (
      <group>
        <mesh position={[0, height * 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, height * 0.8, 8]} />
          <meshStandardMaterial color="#3a342c" />
        </mesh>
        <mesh position={[0, height * 0.86, 0]}>
          <coneGeometry args={[Math.max(0.1, width * 0.35), 0.18, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      </group>
    );
  }
  if (kind === "bookshelf") {
    return (
      <group>
        <Cabinet width={width} depth={depth} height={height} color={color} />
        <Box args={[width * 0.86, 0.03, depth * 0.8]} position={[0, height * 0.35, 0]} color="#efe8dc" />
        <Box args={[width * 0.86, 0.03, depth * 0.8]} position={[0, height * 0.62, 0]} color="#efe8dc" />
      </group>
    );
  }
  if (kind === "fridge") {
    return (
      <group>
        <Box args={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
        <Box args={[width * 0.92, 0.03, 0.02]} position={[0, height * 0.68, depth / 2]} color="#9aa0a6" />
      </group>
    );
  }
  if (kind === "washer" || kind === "dryer") {
    return (
      <group>
        <Box args={[width, height, depth]} position={[0, height / 2, 0]} color={color} />
        <mesh position={[0, height * 0.58, depth / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 20]} />
          <meshStandardMaterial color={kind === "dryer" ? "#c5d0d8" : "#dfe7ee"} />
        </mesh>
      </group>
    );
  }
  if (kind === "cooker") {
    return (
      <group>
        <Cabinet width={width} depth={depth} height={height} color="#2a2c2e" />
        <Box args={[width * 0.92, 0.04, depth * 0.92]} position={[0, height + 0.02, 0]} color="#1b1d20" />
        {[-0.12, 0.12].flatMap((x) =>
          [-0.1, 0.1].map((z) => <Box key={`${x}${z}`} args={[0.12, 0.02, 0.12]} position={[x, height + 0.05, z]} color="#4a4038" />),
        )}
      </group>
    );
  }
  if (kind === "toilet") {
    return (
      <group>
        <Box args={[width * 0.7, 0.32, 0.16]} position={[0, 0.48, -depth * 0.32]} color={color} />
        <Box args={[width * 0.85, 0.4, depth * 0.55]} position={[0, 0.28, depth * 0.08]} color={color} />
      </group>
    );
  }
  if (kind === "bathtub") {
    return (
      <group>
        <Box args={[width, height * 0.7, depth]} position={[0, height * 0.28, 0]} color={color} />
        <Box args={[width * 0.86, height * 0.28, depth * 0.72]} position={[0, height * 0.5, 0]} color="#d5e3ea" />
      </group>
    );
  }
  if (kind === "shower") {
    return (
      <group>
        <Box args={[width, 0.08, depth]} position={[0, 0.04, 0]} color="#cfd6dc" />
        <Box args={[width, height, 0.02]} position={[0, height / 2, -depth / 2]} color="#d5dde3" opacity={0.35} />
        <Box args={[0.02, height, depth]} position={[-width / 2, height / 2, 0]} color="#d5dde3" opacity={0.35} />
        <Box args={[0.02, height, depth]} position={[width / 2, height / 2, 0]} color="#d5dde3" opacity={0.28} />
      </group>
    );
  }
  if (kind === "vanity" || kind === "sink") {
    return (
      <group>
        <Cabinet width={width} depth={depth} height={height * 0.9} color={color} />
        <Box args={[width * 0.72, 0.08, depth * 0.55]} position={[0, height * 0.92, 0]} color="#e7eef2" />
      </group>
    );
  }
  if (kind === "mirror") {
    return <Box args={[width, height, Math.max(depth, 0.04)]} position={[0, height / 2, 0]} color="#d5dde6" />;
  }
  if (kind === "coat-rack") {
    return (
      <group>
        <mesh position={[0, height * 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, height * 0.9, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <Box args={[width * 0.7, 0.04, 0.04]} position={[0, height * 0.82, 0]} color={color} />
      </group>
    );
  }
  if (kind === "island" || kind === "sideboard" || kind === "nightstand" || kind === "filing") {
    return <Cabinet width={width} depth={depth} height={height} color={color} />;
  }
  if (
    kind === "wardrobe" ||
    kind === "dresser" ||
    kind === "cabinet" ||
    kind === "shoe-cabinet" ||
    kind === "dishwasher"
  ) {
    return <Cabinet width={width} depth={depth} height={height} color={color} />;
  }
  if (kind === "tv") {
    return (
      <group>
        <Table width={width} depth={depth} top={0.5} color={color} />
        <Box args={[width * 0.7, 0.4, 0.04]} position={[0, 0.95, -depth / 2]} color="#1b1d20" />
      </group>
    );
  }
  if (kind === "desk" || kind === "coffee-table" || kind === "dining-table" || kind === "side-table" || kind === "console") {
    const top = kind === "coffee-table" || kind === "side-table" ? 0.4 : 0.74;
    return <Table width={width} depth={depth} top={top} color={color} />;
  }
  return <Seat width={width} depth={depth} height={height} color={color} />;
}
