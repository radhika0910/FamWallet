'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedShapes() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create multiple spheres
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#6c5ce7" />
      <directionalLight position={[-10, -10, -5]} intensity={1} color="#00cec9" />
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Sphere args={[1, 64, 64]} position={[-2, 1, -2]}>
          <MeshDistortMaterial
            color="#6c5ce7"
            envMapIntensity={1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            metalness={0.2}
            roughness={0.2}
            distort={0.4}
            speed={2}
          />
        </Sphere>
      </Float>

      <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.5}>
        <Sphere args={[0.8, 64, 64]} position={[2, -1, -1]}>
          <MeshDistortMaterial
            color="#00cec9"
            envMapIntensity={1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            metalness={0.4}
            roughness={0.2}
            distort={0.3}
            speed={1.5}
          />
        </Sphere>
      </Float>

      <Float speed={2.5} rotationIntensity={1} floatIntensity={0.8}>
        <Sphere args={[0.5, 64, 64]} position={[0, 2, -3]}>
          <MeshDistortMaterial
            color="#ff6b6b"
            envMapIntensity={1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            metalness={0.1}
            roughness={0.1}
            distort={0.5}
            speed={3}
          />
        </Sphere>
      </Float>
    </>
  );
}

export default function ThreeBackground() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <AnimatedShapes />
      </Canvas>
    </div>
  );
}
