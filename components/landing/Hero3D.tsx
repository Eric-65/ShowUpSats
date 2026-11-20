"use client";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Edges, AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";

const LIME = new THREE.Color("#80FF28");

/** 0..1 progress through the hero (first ~1.6 viewports of scroll). */
function heroProgress() {
  if (typeof window === "undefined") return 0;
  return Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 1.6)));
}
const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

function Padlock({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const shackle = useRef<THREE.Mesh>(null);
  const burst = useRef<THREE.Points>(null);
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null);

  const particles = useMemo(() => {
    const n = 160, pos = new Float32Array(n * 3), dir = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.6 + Math.random() * 1.6);
      dir.set([v.x, v.y + 0.6, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { g, dir, n };
  }, []);

  useFrame((state, dt) => {
    const p = heroProgress();
    const g = group.current!;
    // turn, tilt with pointer (subtle)
    const targetY = p * Math.PI * 1.2 + pointer.current.x * 0.25;
    g.rotation.y += (targetY - g.rotation.y) * Math.min(1, dt * 4);
    g.rotation.x += (pointer.current.y * 0.15 - g.rotation.x) * Math.min(1, dt * 4);
    // shackle: starts open (raised), locks between 0.15–0.35, opens again 0.6–0.75 ("accepted → sent")
    const lockAmt = seg(p, 0.15, 0.35) - seg(p, 0.6, 0.75);
    shackle.current!.position.y = 0.95 + (1 - lockAmt) * 0.45;
    shackle.current!.rotation.y = (1 - lockAmt) * (p > 0.5 ? 0.9 : 0);
    bodyMat.current!.emissiveIntensity = 0.02 + lockAmt * 0.12;
    // particle burst after unlock
    const b = seg(p, 0.62, 0.95);
    const arr = particles.g.attributes.position.array as Float32Array;
    for (let i = 0; i < particles.n * 3; i++) arr[i] = particles.dir[i] * b * 2.2;
    particles.g.attributes.position.needsUpdate = true;
    (burst.current!.material as THREE.PointsMaterial).opacity = b > 0 ? 1 - b * 0.7 : 0;
  });

  return (
    <group ref={group} position={[0, -0.3, 0]}>
      <mesh ref={shackle} position={[0, 1.4, 0]}>
        <torusGeometry args={[0.62, 0.13, 24, 64, Math.PI]} />
        <meshStandardMaterial color="#1b1b1e" metalness={0.9} roughness={0.25} emissive={LIME} emissiveIntensity={0.35} />
        {[-0.62, 0.62].map((x) => (
          <mesh key={x} position={[x, -0.3, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.6, 20]} />
            <meshStandardMaterial color="#1b1b1e" metalness={0.9} roughness={0.25} emissive={LIME} emissiveIntensity={0.35} />
          </mesh>
        ))}
      </mesh>
      <RoundedBox args={[1.9, 1.6, 0.7]} radius={0.16} smoothness={4}>
        <meshStandardMaterial ref={bodyMat} color="#141416" metalness={0.8} roughness={0.3} emissive={LIME} emissiveIntensity={0.03} />
        <Edges color="#80FF28" threshold={20} />
      </RoundedBox>
      <mesh position={[0, 0.05, 0.36]}><circleGeometry args={[0.14, 32]} /><meshBasicMaterial color={LIME} /></mesh>
      <mesh position={[0, -0.22, 0.36]}><planeGeometry args={[0.1, 0.4]} /><meshBasicMaterial color={LIME} /></mesh>
      <points ref={burst} geometry={particles.g}>
        <pointsMaterial color={LIME} size={0.06} transparent opacity={0} depthWrite={false} />
      </points>
    </group>
  );
}

function NetworkField() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, -4 - Math.random() * 10], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); return g;
  }, []);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z += dt * 0.012; });
  return <points ref={ref} geometry={geo}><pointsMaterial color="#8D8B8C" size={0.025} transparent opacity={0.55} /></points>;
}

export default function Hero3D() {
  const pointer = useRef({ x: 0, y: 0 });
  return (
    <div className="hero3d" aria-hidden
      onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); pointer.current = { x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 }; }}>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.3, 6], fov: 40 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
        <color attach="background" args={["#0A0A0B"]} />
        <PerformanceMonitor />
        <AdaptiveDpr pixelated />
        <ambientLight intensity={0.25} />
        <directionalLight position={[-4, 3, -3]} intensity={3} color="#80FF28" /> {/* rim light */}
        <directionalLight position={[3, 4, 5]} intensity={1.1} color="#ffffff" />
        <NetworkField />
        <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.5}><Padlock pointer={pointer} /></Float>
      </Canvas>
    </div>
  );
}
