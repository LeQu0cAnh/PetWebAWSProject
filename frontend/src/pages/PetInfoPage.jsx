// src/pages/PetInfoPage.jsx
// Trang Pet Info — Beast Repository (CHRONOS SHARD Style - Việt hóa)

import { useRef, useState, Component, Suspense } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sparkles, MeshDistortMaterial } from '@react-three/drei';
import { Info, Zap, Shield, Heart, MessageSquare, Terminal } from 'lucide-react';
import * as THREE from 'three';

// Đăng ký tất cả THREE geometry/material với R3F để tránh namespace error
extend(THREE);

// ── Error Boundary để bắt WebGL crash ────────────────────────────
class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[320px] sm:h-[480px] border-4 border-black bg-surface-container flex flex-col items-center justify-center gap-4 text-center p-6 chasm-shadow-purple font-label-mono">
          <div className="text-5xl">🐉</div>
          <p className="text-on-surface-variant text-sm">
            LỖI KHÔNG KHỞI CHẠY ĐƯỢC 3D CANVAS<br />
            <span className="text-outline text-xs mt-2 block">Vui lòng sử dụng trình duyệt hỗ trợ đồ họa WebGL.</span>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── 3D Pet Model ────────────────────────────
// có thể bỏ phần này
function PetMesh({ hovered }) {
  const meshRef = useRef();
  const outerRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.5;
      meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    }
    if (outerRef.current) {
      outerRef.current.rotation.y = -t * 0.3;
      outerRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
    }
  });

  return (
    <group>
      {/* Outer glow ring */}
      <mesh ref={outerRef} scale={[1.6, 0.08, 1.6]}>
        <torusGeometry args={[1, 0.04, 8, 64]} />
        <meshBasicMaterial color="#17deca" transparent opacity={0.4} />
      </mesh>

      {/* Main pet body */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh ref={meshRef} scale={hovered ? 1.05 : 1}>
          <icosahedronGeometry args={[1, 4]} />
          <MeshDistortMaterial
            color="#602b9d"
            emissive="#2a0053"
            emissiveIntensity={0.6}
            roughness={0.1}
            metalness={0.9}
            distort={0.25}
            speed={2}
          />
        </mesh>

        {/* Inner core */}
        <mesh scale={0.55}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color="#17deca"
            emissive="#17deca"
            emissiveIntensity={1.2}
            transparent
            opacity={0.8}
          />
        </mesh>
      </Float>

      {/* Particle sparkles */}
      <Sparkles
        count={50}
        scale={3.5}
        size={2.5}
        speed={0.5}
        color="#dab9ff"
        opacity={0.7}
      />
    </group>
  );
}

const PET_STATS = [
  { label: 'Trò chuyện AI', value: 95, color: '#17deca', icon: <MessageSquare size={12} /> },
  { label: 'Lệnh hệ thống', value: 88, color: '#dab9ff', icon: <Terminal size={12} /> },
  { label: 'Tốc độ phản hồi', value: 92, color: '#f0bb35', icon: <Zap size={12} /> },
  { label: 'Độ đẹp zai', value: 94.2, color: '#ffb4ab', icon: <Heart size={12} /> },
];

export default function PetInfoPage() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="page-content pt-20 pb-24 font-label-mono">
      {/* Header */}
      <div className="h-5 pointer-events-none"></div>
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 border border-secondary bg-secondary/10 px-4 py-1 text-xs text-secondary mb-4">
          <span>THÔNG TIN THÚ CƯNG</span>
        </div>
        <h1 className="font-display-xl text-3xl sm:text-5xl font-bold uppercase tracking-tighter text-on-surface mb-2">
          Locle1010
        </h1>
        <p className="font-body-md text-on-surface-variant text-sm sm:text-base italic">
          "Trợ lý Pet thông minh"
        </p>
      </div>
      <div className="h-5 pointer-events-none"></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: 3D Construct Box */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <CanvasErrorBoundary>
            <div
              className={`relative h-[320px] sm:h-[480px] border-4 border-black bg-black flex items-center justify-center overflow-hidden transition-all duration-300 ${hovered ? 'chasm-shadow-teal' : 'shadow-[8px_8px_0px_0px_#000]'
                }`}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{ cursor: hovered ? 'grab' : 'default' }}
            >
              {/* Overlay HUD indicators */}
              <div className="absolute top-4 left-4 z-10 text-[9px] text-tertiary">
                TRẠNG THÁI: HOẠT ĐỘNG
              </div>
              <div className="absolute top-4 right-4 z-10 text-[9px] text-outline text-right">
                FOV: 50.0<br />
                ĐỘ ĐẸP TRAI: 94.2%
              </div>

              {/* ThreeJS R3F Canvas */}
              <Canvas
                className="w-full h-full bg-black"
                camera={{ position: [0, 0, 4.2], fov: 50 }}
                gl={{ antialias: true, alpha: false }}
                style={{ background: '#000000' }}
                onCreated={({ gl }) => {
                  gl.setClearColor('#000000', 1);
                }}
              >
                <color attach="background" args={['#000000']} />
                <ambientLight intensity={0.4} />
                <pointLight position={[5, 5, 5]} intensity={1.8} color="#17deca" />
                <pointLight position={[-5, -5, -5]} intensity={1} color="#602b9d" />
                <pointLight position={[0, 5, -5]} intensity={0.5} color="#dab9ff" />

                <PetMesh hovered={hovered} />

                <Suspense fallback={null}>
                  <Environment preset="night" />
                </Suspense>
                <OrbitControls
                  enablePan={false}
                  minDistance={2.2}
                  maxDistance={6}
                  autoRotate={!hovered}
                  autoRotateSpeed={1}
                />
              </Canvas>

              {/* Progress bar footer overlay */}
              <div className="absolute bottom-4 left-4 right-4 z-10 bg-black/80 p-3 border border-outline-variant">
                <div className="flex justify-between items-center text-[10px] mb-1.5">
                  <span className="text-secondary font-bold">CHỈ SỐ ĐẸP TRAI</span>
                  <span className="text-tertiary">94.2% Đẹp trai</span>
                </div>
                <div className="flex gap-1 h-2">
                  <div className="flex-1 bg-tertiary shadow-[0_0_5px_#17deca]"></div>
                  <div className="flex-1 bg-tertiary shadow-[0_0_5px_#17deca]"></div>
                  <div className="flex-1 bg-tertiary shadow-[0_0_5px_#17deca]"></div>
                  <div className="flex-1 bg-tertiary shadow-[0_0_5px_#17deca]"></div>
                  <div className="flex-1 bg-tertiary shadow-[0_0_5px_#17deca]"></div>
                  <div className="flex-1 bg-surface-container-highest"></div>
                </div>
              </div>
            </div>
          </CanvasErrorBoundary>
        </div>

        {/* Right Side: Details and stats */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Identity file */}
          <div className="card p-6 border-4 border-black hard-shadow-secondary rotate-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 border-2 border-secondary bg-secondary/10 flex items-center justify-center text-2xl">
                🐉
              </div>
              <div>
                <h2 className="font-display-xl text-lg font-bold text-secondary uppercase">
                  Em Lộc
                </h2>
                <span className="text-[10px] text-outline">PHÂN LOẠI: Đẹp Trai Vô Địch // PHÂN BẢN: TP. HCM</span>
              </div>
            </div>
            <p className="font-body-md text-on-surface-variant text-sm sm:text-base leading-relaxed italic border-l-4 border-secondary pl-4">
              "Em Lộc là trợ lý thực thể ảo tích hợp công nghệ AI xử lý ngôn ngữ tự nhiên. Đồng hành trên desktop của bạn để hỗ trợ dịch thuật, tự động hóa tác vụ hệ thống và quản lý sức khỏe học tập, làm việc."
            </p>
          </div>

          {/* Stats details */}
          <div className="card p-6 border-2 border-black">
            <h3 className="font-display-xl text-xs font-bold text-outline uppercase tracking-wider mb-6 flex items-center gap-2">
              <Shield size={14} className="text-tertiary" /> THÔNG SỐ KỸ THUẬT LÕI
            </h3>
            <div className="flex flex-col gap-5">
              {PET_STATS.map(s => (
                <div key={s.label}>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-on-surface-variant flex items-center gap-2">
                      <span style={{ color: s.color }}>{s.icon}</span>
                      {s.label.toUpperCase()}
                    </span>
                    <span style={{ color: s.color }} className="font-bold">{s.value}%</span>
                  </div>
                  <div className="h-4 bg-black border border-black p-0.5 flex">
                    <div
                      className="h-full transition-all duration-1000"
                      style={{ width: `${s.value}%`, backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert logs */}
          <div className="border border-outline-variant bg-surface-container-low p-4 flex gap-3 text-xs">
            <Info size={14} className="text-tertiary flex-shrink-0 mt-0.5" />
            <p className="text-outline leading-normal">
              LƯU Ý: Đây là bản mô phỏng 3D trên nền tảng web. Trải nghiệm tương tác 3D đầy đủ sẽ được kích hoạt sau khi cài đặt ứng dụng Desktop Client của bạn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
