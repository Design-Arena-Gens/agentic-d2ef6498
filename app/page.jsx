"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function HomePage() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const animationIdRef = useRef(null);
  const characterRef = useRef(null);
  const partsRef = useRef(null);
  const carsRef = useRef([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b0e13");
    scene.fog = new THREE.Fog("#0b0e13", 25, 140);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
    camera.position.set(0, 3.2, -7);
    camera.lookAt(0, 1.8, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#bfc7d5", 0.65);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight("#dbe3ff", 1.1);
    dir.position.set(5, 10, -5);
    dir.castShadow = false;
    scene.add(dir);

    addStreet(scene);
    addBuildings(scene);
    addCars(scene, carsRef);
    addCharacter(scene, characterRef, partsRef);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let t = 0;
    const animate = () => {
      t += 0.016;
      updateCars(carsRef, t);
      updateCharacter(partsRef, t);
      // Move the world backwards to simulate walking forward
      scene.children.forEach((obj) => {
        if (obj.userData.isParallax) {
          obj.position.z += 0.12;
          if (obj.position.z > 30) obj.position.z -= 60;
        }
      });
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener("resize", onResize);
      if (renderer) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, []);

  const generateVideo = async () => {
    if (!rendererRef.current) return;
    setIsGenerating(true);
    setStatus("Recording video...");
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    const canvas = rendererRef.current.domElement;
    const stream = canvas.captureStream(30);
    const chunks = [];
    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm;codecs=vp8";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }
    }
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus("Done");
      setIsGenerating(false);
    };
    recorder.start();

    // Orchestrate a short cinematic: 7 seconds
    const DURATION_MS = 7000;

    // Add some dynamic camera motion for parallax
    let start = performance.now();
    const cam = cameraRef.current;
    const basePos = new THREE.Vector3(0, 3.2, -7);
    const baseLook = new THREE.Vector3(0, 1.8, 0);

    const cameraKeyframe = () => {
      const now = performance.now();
      const p = Math.min(1, (now - start) / DURATION_MS);
      const ease = (x) => 1 - Math.pow(1 - x, 3);
      const e = ease(p);
      cam.position.x = Math.sin(e * Math.PI * 2) * 0.7;
      cam.position.y = basePos.y + Math.sin(e * Math.PI) * 0.3;
      cam.position.z = basePos.z + Math.cos(e * Math.PI * 2) * 0.5;
      cam.lookAt(baseLook.x + Math.sin(e * Math.PI * 2) * 0.3, baseLook.y, baseLook.z + 0.5);
      if (p < 1) requestAnimationFrame(cameraKeyframe);
    };
    requestAnimationFrame(cameraKeyframe);

    await new Promise((res) => setTimeout(res, DURATION_MS));
    recorder.stop();
    setStatus("Finalizing...");
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1c2230" }}>
        <div style={{ fontWeight: 700, letterSpacing: 0.3 }}>Ary City Walk - Video Generator</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{status}</div>
      </header>

      <section style={{ display: "flex", gap: 16, padding: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={generateVideo}
          disabled={isGenerating}
          style={{
            background: isGenerating ? "#3b4456" : "#4f8cff",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {isGenerating ? "Generating..." : "Generate 7s Video"}
        </button>
        {videoUrl && (
          <>
            <a
              href={videoUrl}
              download="ary_city_walk.webm"
              style={{
                background: "#1d2330",
                color: "white",
                padding: "10px 16px",
                borderRadius: 8,
                textDecoration: "none",
                border: "1px solid #2a3344",
              }}
            >
              Download
            </a>
            <video
              src={videoUrl}
              controls
              style={{ width: 280, height: 158, objectFit: "cover", borderRadius: 8, border: "1px solid #2a3344" }}
            />
          </>
        )}
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Tip: Chrome/Edge recommended for best recording quality.
        </div>
      </section>

      <div
        ref={containerRef}
        style={{
          width: "100%",
          flex: 1,
          height: "calc(100vh - 120px)",
          position: "relative",
          overflow: "hidden",
          borderTop: "1px solid #1c2230",
        }}
      />
    </main>
  );
}

function addStreet(scene) {
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 120, 1, 1),
    new THREE.MeshStandardMaterial({ color: "#222831", roughness: 1 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = 0;
  road.userData.isParallax = true;
  scene.add(road);

  // Lane lines
  const lines = new THREE.Group();
  for (let i = -30; i <= 30; i += 3) {
    const geo = new THREE.PlaneGeometry(0.1, 1.2);
    const mat = new THREE.MeshBasicMaterial({ color: "#e6e9ef", side: THREE.DoubleSide });
    const left = new THREE.Mesh(geo, mat);
    left.rotation.x = -Math.PI / 2;
    left.position.set(-1.5, 0.01, i * 2);
    const right = left.clone();
    right.position.x = 1.5;
    lines.add(left);
    lines.add(right);
  }
  lines.userData.isParallax = true;
  scene.add(lines);
}

function addBuildings(scene) {
  const group = new THREE.Group();
  const buildingColors = ["#1b2430", "#202a38", "#1a2130", "#222a3a", "#1f2735"];
  for (let side of [-1, 1]) {
    for (let i = 0; i < 20; i++) {
      const w = 2 + Math.random() * 2;
      const h = 3 + Math.random() * 10;
      const d = 2 + Math.random() * 2;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({
        color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
        roughness: 0.9,
        metalness: 0.05,
      });
      const b = new THREE.Mesh(geo, mat);
      b.position.set(side * (5 + Math.random() * 2), h / 2, -30 + i * 3 + Math.random() * 2);
      b.userData.isParallax = true;
      group.add(b);
    }
  }
  group.userData.isParallax = true;
  scene.add(group);

  // Street lights
  for (let i = -30; i <= 30; i += 6) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: "#3a465a" })
    );
    pole.position.set(-3.5, 1.6, i * 2);
    pole.userData.isParallax = true;
    scene.add(pole);
    const head = new THREE.PointLight("#ffdca8", 0.7, 8, 1.5);
    head.position.set(-3.5, 3.1, i * 2);
    head.userData.isParallax = true;
    scene.add(head);

    const pole2 = pole.clone();
    pole2.position.x = 3.5;
    scene.add(pole2);
    const head2 = head.clone();
    head2.position.x = 3.5;
    scene.add(head2);
  }
}

function addCars(scene, carsRef) {
  const group = new THREE.Group();
  const colors = ["#ff5c5c", "#5cff95", "#5ca7ff", "#ffd25c", "#c55cff"];
  for (let i = 0; i < 12; i++) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.4, 2.2),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.6 })
    );
    body.position.y = 0.3;
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.35, 1.2),
      new THREE.MeshStandardMaterial({ color: "#12161d" })
    );
    top.position.y = 0.7;
    car.add(body);
    car.add(top);
    const lane = i % 2 === 0 ? -2.3 : 2.3;
    car.position.set(lane, 0, -30 + i * 5);
    car.userData.speed = (i % 2 === 0 ? 1 : -1) * (0.12 + Math.random() * 0.08);
    group.add(car);
  }
  group.userData.isParallax = false;
  scene.add(group);
  carsRef.current = group.children;
}

function updateCars(carsRef, t) {
  for (const car of carsRef.current) {
    car.position.z += car.userData.speed;
    if (car.userData.speed > 0 && car.position.z > 35) car.position.z = -35;
    if (car.userData.speed < 0 && car.position.z < -35) car.position.z = 35;
  }
}

function addCharacter(scene, characterRef, partsRef) {
  const group = new THREE.Group();

  // Legs
  const legGeo = new THREE.BoxGeometry(0.35, 1.4, 0.35);
  const legMat = new THREE.MeshStandardMaterial({ color: "#1f2937" });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.3, 0.7, 0.2);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.3, 0.7, -0.2);

  // Torso with white t-shirt and "Ary"
  const torsoGeo = new THREE.BoxGeometry(1.2, 1.5, 0.6);
  const shirtTexture = createShirtTexture();
  const torsoMat = new THREE.MeshStandardMaterial({ color: "#ffffff", map: shirtTexture, roughness: 0.75, metalness: 0.0 });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.8;

  // Arms
  const armGeo = new THREE.BoxGeometry(0.28, 1.3, 0.28);
  const armMat = new THREE.MeshStandardMaterial({ color: "#e1b597" });
  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.8, 2.0, 0.0);
  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.8, 2.0, 0.0);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 24, 24),
    new THREE.MeshStandardMaterial({ color: "#d8a47f" })
  );
  head.position.y = 2.8;
  // Hair (taper-style silhouette)
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: "#0e121a", roughness: 0.8 })
  );
  hair.position.y = 3.0;

  // Sneakers
  const shoeGeo = new THREE.BoxGeometry(0.45, 0.18, 0.8);
  const shoeMat = new THREE.MeshStandardMaterial({ color: "#e6e9ef" });
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(-0.3, 0.09, 0.5);
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0.3, 0.09, -0.5);

  group.add(leftLeg, rightLeg, torso, leftArm, rightArm, head, hair, leftShoe, rightShoe);
  group.position.set(0, 0, 0);
  scene.add(group);

  characterRef.current = group;
  partsRef.current = { leftLeg, rightLeg, leftArm, rightArm, torso };
}

function createShirtTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  // White shirt
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  // Collar shadow
  const grad = ctx.createLinearGradient(0, 0, 0, 80);
  grad.addColorStop(0, "rgba(0,0,0,0.15)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, 80);
  // "Ary" text
  ctx.fillStyle = "#0e121a";
  ctx.font = "bold 96px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Ary", size / 2, size / 2 + 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function updateCharacter(partsRef, t) {
  if (!partsRef.current) return;
  const speed = 3.2;
  const swing = Math.sin(t * speed) * 0.6;
  const counter = Math.sin(t * speed + Math.PI) * 0.6;

  partsRef.current.leftLeg.rotation.x = swing;
  partsRef.current.rightLeg.rotation.x = counter;
  partsRef.current.leftArm.rotation.x = counter * 0.7;
  partsRef.current.rightArm.rotation.x = swing * 0.7;
  partsRef.current.torso.position.y = 1.8 + Math.sin(t * speed * 2) * 0.05;
}
