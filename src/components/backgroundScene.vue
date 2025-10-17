<template>
  <canvas ref="canvas"></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import Stats from 'stats.js';
import noiseURL from '@/assets/noise.png';
import nebularURL from '@/assets/test2.png';
import fraURL from '@/assets/fra.png';
import { nonBloomed, restoreMaterial } from '@/utils/render-utils';
import logoURL from '@/assets/codelogo.glb?url';
import celllogoURL from '@/assets/celllogo3.glb?url';

type Orb = {
  base: THREE.Mesh;
  bloom: THREE.Mesh;
};
const orbs: Orb[] = [];
const timeUpdatedMaterisls: THREE.Material[] = [];
const hovered: Orb[] = [];
const canvas = ref<HTMLCanvasElement | null>(null);
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb
document.body.appendChild(stats.dom);

onMounted(() => {
  if (!canvas.value) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 15;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const controls = new OrbitControls(camera, renderer.domElement);
  const materials = new Map<THREE.Mesh, THREE.Material>();

  //sphere
  const loader = new THREE.TextureLoader();
  const gltfloader = new GLTFLoader();
  // Layer management
  const BLOOM_SCENE = 1;
  const bloomLayer = new THREE.Layers();
  bloomLayer.set(BLOOM_SCENE);

  // Lightspheres
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);

  let logo: THREE.Object3D<THREE.Object3DEventMap>;
  let baseRotation: THREE.Euler;
  let targetRotation = { x: 0, z: 0 };
  let idleRotation = { x: 0, z: 0 };

  const updateLogoRotation = () => {
    if (!logo) return;

    const targetX = baseRotation.x + targetRotation.x + idleRotation.x;
    const targetZ = baseRotation.z + targetRotation.z + idleRotation.z;

    gsap.to(logo.rotation, {
      x: targetX,
      z: targetZ,
      duration: 1.2,
      ease: 'power2.out',
      overwrite: true,
    });
  };

  loader.load(fraURL, function (fractureTexture) {
    console.log(fractureTexture, 'fracture');

    fractureTexture.wrapS = THREE.RepeatWrapping;
    fractureTexture.wrapT = THREE.RepeatWrapping;
    fractureTexture.repeat.set(1, 1);

    const material = new THREE.MeshPhongMaterial({
      color: 0xfff,
      map: fractureTexture,
      transparent: true,
      refractionRatio: 0.1,
      blending: THREE.AdditiveBlending,
      opacity: 150,
      bumpMap: fractureTexture, // bump map from same texture
      bumpScale: 0.1, // tweak for depth intensity
      depthWrite: false,
      side: THREE.DoubleSide,
      depthTest: true,
    });

    // Create the geometry and apply the materials
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeR = new THREE.Mesh(geometry, material);
    const fragments: THREE.Mesh[] = [];

    cubeR.position.set(0, 0, -5);
    //scene.add(cubeR);
    // load in model from assets/codelogo.glb
    gltfloader.load(celllogoURL, (gltf: { scene: any }) => {
      const testMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
      logo = gltf.scene;
      scene.add(logo);
      logo.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = material;
        }
      });
      logo.position.set(0, 0, -5);
      logo.scale.set(0.4, 0.4, 0.4);
      logo.rotation.x = Math.PI / 2;
      console.log('Loaded logo model:', logo);
      baseRotation = logo.rotation.clone();

      // --- LOGO IDLE + MOUSE INTERACTION ANIMATION ---
      idleRotation = { x: 0, z: 0 };
      targetRotation = { x: 0, z: 0 };
      let lastMouseMove = Date.now();
      let isIdle = true;

      // Subtle idle “breathing” wobble
      const idleTimeline = gsap.timeline({ repeat: -1, yoyo: true });
      idleTimeline.to(idleRotation, {
        x: 0.15,
        z: 0.12,
        duration: 4,
        ease: 'sine.inOut',
      });

      // Mousemove → rotate on X and Z
      window.addEventListener('mousemove', (event) => {
        lastMouseMove = Date.now();
        isIdle = false;

        const normalizedX = (event.clientX / window.innerWidth - 0.5) * 2;
        const normalizedY = (event.clientY / window.innerHeight - 0.5) * 2;

        // Map mouse to tilt (note the signs — feels more natural)
        targetRotation.x = normalizedY * 0.4; // up/down tilt
        targetRotation.z = -normalizedX * 0.4; // side tilt

        updateLogoRotation();
      });

      // If mouse idle for a while → return to idle-only
      setInterval(() => {
        if (Date.now() - lastMouseMove > 2500 && !isIdle) {
          isIdle = true;
          targetRotation.x = 0;
          targetRotation.z = 0;
          updateLogoRotation();
        }
      }, 500);
    });
  });

  for (let i = 0; i < 20; i++) {
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    );

    const randomColor = new THREE.Color(Math.random(), Math.random(), Math.random());
    const baseMaterial = new THREE.MeshPhongMaterial({
      color: randomColor,
      opacity: 1,
      transparent: true,
    });

    const bloomMaterial = new THREE.MeshBasicMaterial({
      color: randomColor,
      opacity: 0, // Every second one is visible in bloom
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const geometry = new THREE.SphereGeometry(0.05, 32, 32);
    const base = new THREE.Mesh(geometry, baseMaterial);
    const bloom = new THREE.Mesh(geometry, bloomMaterial);
    base.userData.glowing = false; // Every second one is glowing
    bloom.userData.glowing = false; // Every second one is glowing
    base.userData.id = 'sphere' + i;
    bloom.userData.id = 'sphere' + i;
    base.position.copy(position);
    bloom.position.copy(position);

    // Layer setup: render base in normal, bloom in bloom layer
    base.layers.set(0); // visible in normal render
    bloom.layers.set(0); // default
    bloom.layers.enable(BLOOM_SCENE); // also render in bloom pass

    scene.add(base);
    scene.add(bloom);

    orbs.push({ base, bloom });
  }

  /* SMOKE */
  const cloudParticles: THREE.Mesh[] = [];

  //  PointLight to Scene
  let blueLight = new THREE.PointLight(0x3677ac, 50, 450, 1.7);
  blueLight.position.set(0, 0, 0);
  scene.add(blueLight);

  const smokeColors = [
    new THREE.Color(0x6699ff), // nice blue
    new THREE.Color(0x663399), // dark purple
    new THREE.Color(0xcc5500), // nice orange
  ];

  // Smoke Loaders
  loader.load(nebularURL, function (texture) {
    let number = Math.floor(Math.random() * smokeColors.length);
    let cloudGeo = new THREE.PlaneGeometry(250, 250);
    console.log(texture, 'nebula');
    let cloudMaterial = new THREE.MeshPhongMaterial({
      map: texture,
      //transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      color: new THREE.Color(smokeColors[number]),
      emissive: new THREE.Color(smokeColors[number]),
      opacity: 0.5,
      emissiveIntensity: 0.2,
      depthTest: true,
    });

    for (let p = 0; p < 10; p++) {
      let material = cloudMaterial.clone();
      let colorIndex = Math.floor(Math.random() * smokeColors.length);
      material.color = smokeColors[colorIndex].clone();
      material.emissive = smokeColors[colorIndex].clone();
      let cloud = new THREE.Mesh(cloudGeo, material);
      cloud.position.set(Math.random() * 300 - 150, Math.random() * 400 - 200, -200);

      cloud.userData = {
        colorIndex,
        runtime: Math.random() * 2000 + 5000, // 2–7 seconds
        startTime: Date.now(),
        rotationSpeed: (Math.random() - 0.5) * 0.004, // -0.002 to +0.002
        id: 'cloud-' + p,
        fromColor: smokeColors[colorIndex].clone(),
        toColor: smokeColors[(colorIndex + 1) % smokeColors.length].clone(),
        transitionStart: Date.now(),
        transitionDuration: Math.random() * 5000 + 2000,
      };

      cloud.rotation.z = Math.random() * 2 * Math.PI;
      cloud.userData.ignoreRaycast = true;
      cloud.userData.fromColor = smokeColors[colorIndex];
      cloud.material.opacity = 1;
      cloudParticles.push(cloud);
      scene.add(cloud);
      cloud.layers.set(0); // Already default
      cloud.renderOrder = 1; // base
    }
  });

  // Create a render target for the bloom pass
  const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

  // Postprocessing: bloom-only composer
  const bloomComposer = new EffectComposer(renderer, renderTarget);
  const renderScene = new RenderPass(scene, camera);
  bloomComposer.addPass(renderScene);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    2.5, // strength – brighter, more intense glow
    0.6, // radius – softer spread around edges
    0.001, // threshold – lower to allow more to glow
  );
  bloomComposer.addPass(bloomPass);

  /*  bloomPass.threshold = 0.0;
  bloomPass.strength = 5.0;
  bloomPass.radius = 0; */

  bloomComposer.renderToScreen = false;

  // Final composer for the full scene (including bloom effect)
  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(renderScene);

  const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
      fragmentShader: `
      uniform sampler2D baseTexture;
      uniform sampler2D bloomTexture;
      varying vec2 vUv;

      void main() {
        vec4 base = texture2D(baseTexture, vUv);
        vec4 bloom = texture2D(bloomTexture, vUv);

        // Soft additive blend with some weight
        gl_FragColor = base + vec4(bloom.rgb, 0.0);
      }
    `,
    }),
    'baseTexture',
  );

  finalComposer.addPass(mixPass);

  // Handle resizing
  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    bloomComposer.setSize(width, height);
    finalComposer.setSize(width, height);

    bloomPass.resolution.set(width, height);
    mixPass.uniforms['bloomTexture'].value = bloomComposer.renderTarget2.texture;
  });

  window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast and check which sphere is hovered
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster
      .intersectObjects(scene.children, true)
      .filter((i) => !i.object.userData.ignoreRaycast);

    intersects.forEach((intersect) => {
      const intersected = orbs.find((orb) => orb.base === intersect.object) || null;
      if (intersected !== null) hovered.push(intersected);
      if (intersected) {
        gsap.to(intersected.bloom.material, { opacity: 1, duration: 0.5 });
        gsap.to(intersected.base.material, { opacity: 0, duration: 0.5 });
        intersected.base.userData.glowing = true;
      }
    });
    if (intersects.length === 0) {
      hovered.forEach((hovered) => {
        if (hovered.base.userData.glowing) {
          gsap.to(hovered.bloom.material, { opacity: 0, duration: 2.5 });
          gsap.to(hovered.base.material, { opacity: 1, duration: 2.5 });
          hovered.base.userData.glowing = false;
        }
      });
      hovered.length = 0;
    }
  });

  // Animation loop
  // Animation loop
  const clock = new THREE.Clock();
  const animate = () => {
    updateLogoRotation();
    const currentTime = Date.now();
    timeUpdatedMaterisls.forEach((material) => {
      (material as THREE.ShaderMaterial).uniforms.time.value = clock.getElapsedTime();
    });
    stats.begin();

    cloudParticles.forEach((cloud) => {
      cloud.rotation.z += cloud.userData.rotationSpeed;

      // If no transition or transition finished → pick a new target color
      if (
        !cloud.userData.transitionStart ||
        currentTime > cloud.userData.transitionStart + cloud.userData.transitionDuration
      ) {
        cloud.userData.transitionStart = currentTime;
        cloud.userData.transitionDuration = Math.random() * 5000 + 2000; // 2–7 seconds

        // Cycle to the next smoke color
        cloud.userData.colorIndex = (cloud.userData.colorIndex + 1) % smokeColors.length;

        const newColor = new THREE.Color(smokeColors[cloud.userData.colorIndex]);
        cloud.userData.fromColor = (cloud.userData.toColor || new THREE.Color()).clone();
        cloud.userData.toColor = newColor;
      }

      // --- Always update color each frame ---
      const elapsed = currentTime - cloud.userData.transitionStart;
      const alpha = THREE.MathUtils.clamp(elapsed / cloud.userData.transitionDuration, 0, 1);

      const currentColor = cloud.userData.fromColor.clone().lerp(cloud.userData.toColor, alpha);

      (cloud.material as THREE.MeshPhongMaterial).color.copy(currentColor);
      (cloud.material as THREE.MeshPhongMaterial).emissive.copy(currentColor);
    });

    requestAnimationFrame(animate);
    scene.traverse((obj) => nonBloomed(obj, bloomLayer, materials));
    bloomComposer.render();
    scene.traverse((obj) => restoreMaterial(obj, materials)); // restore real materials
    finalComposer.render();
    stats.end();
  };

  animate();
});
</script>

<style scoped>
canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: block;
  z-index: 0;
}
</style>
