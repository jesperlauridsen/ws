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
import gsap from 'gsap';
import Stats from 'stats.js';
import noiseURL from '@/assets/noise.png';

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
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const controls = new OrbitControls(camera, renderer.domElement);

  window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast and check which sphere is hovered
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, false);

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

  //sphere
  const geometry = new THREE.SphereGeometry(0.3, 32, 32);
  const loader = new THREE.TextureLoader();
  const noiseTexture = loader.load(noiseURL, (texture: THREE.Texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4); // Adjust the repeat value as needed
  });
  noiseTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
  noiseTexture.repeat.set(4, 4); // Adjust the repeat value as needed
  const cloudMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      noiseTexture: { value: noiseTexture },
      opacity: { value: 1.0 },
    },
    vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
    vUv = uv;

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    fragmentShader: `
    uniform float time;
    uniform sampler2D noiseTexture;
    uniform float opacity;
    varying vec2 vUv;

    void main() {
    vec2 uv = vUv;

    // Scroll noise upwards
    vec4 noise = texture2D(noiseTexture, uv * 3.0 + vec2(0.0, time * 0.5));
    float noiseStrength = noise.r;

    // Define vertical zones
    float top = smoothstep(0.6, 1.0, uv.y);      // Top = full white
    float mid = smoothstep(0.3, 0.8, uv.y);      // Middle = noise
    float bottom = 1.0 - smoothstep(0.0, 0.3, uv.y); // Bottom = fade out

    // Calculate alpha:
    float alpha = mix(noiseStrength, 1.0, top);  // mix noise and full white
    alpha *= mid;                                // clamp noise zone
    alpha *= opacity;

    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    }`,
    transparent: true,
    depthWrite: true,
    blending: THREE.AdditiveBlending,
  });

  timeUpdatedMaterisls.push(cloudMaterial);
  const sphere = new THREE.Mesh(geometry, cloudMaterial);
  sphere.position.set(0, 0, 0);
  scene.add(sphere);
  sphere.layers.set(0); // visible in normal render

  // create a sphere more to be under  the shadow of the main sphere
  // crate a a Phong material with a color of 0x000000 and opacity of 0.5
  const baseMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    opacity: 1,
    transparent: true,
  });
  const geometry2 = new THREE.SphereGeometry(0.29999, 32, 32);
  const sphere2 = new THREE.Mesh(geometry2, baseMaterial);
  sphere2.position.set(0, 0, 0);
  scene.add(sphere2);
  sphere2.layers.set(0); // visible in normal render

  sphere2.renderOrder = 0; // base
  sphere.renderOrder = 1; // cloud

  // Layer management
  const BLOOM_SCENE = 1;
  const bloomLayer = new THREE.Layers();
  bloomLayer.set(BLOOM_SCENE);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 60);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);

  const spheres: THREE.Mesh[] = [];

  for (let i = 0; i < 20; i++) {
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    );

    const baseMaterial = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      opacity: 1,
      transparent: true,
    });

    const bloomMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0, // Every second one is visible in bloom
      transparent: true,
      depthWrite: false,
    });

    const geometry = new THREE.SphereGeometry(0.3, 32, 32);
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

  const materials = new Map<THREE.Object3D, THREE.Material>();

  function nonBloomed(obj: THREE.Object3D) {
    if ((obj as THREE.Mesh).isMesh && bloomLayer.test(obj.layers) === false) {
      const mesh = obj as THREE.Mesh;

      // Only replace material if not already replaced
      if (!Array.isArray(mesh.material)) {
        if (!materials.has(mesh)) {
          materials.set(mesh, mesh.material);
        }

        const original = mesh.material as THREE.MeshPhongMaterial;
        const t = 1 - original.opacity;
        const color = new THREE.Color(0x000000).lerp(new THREE.Color(0xffff00), t);

        mesh.material = new THREE.MeshBasicMaterial({ color });
      }
    }
  }

  function restoreMaterial(obj: THREE.Object3D) {
    const mesh = obj as THREE.Mesh;
    if (materials.has(mesh)) {
      mesh.material = materials.get(mesh)!;
      materials.delete(mesh);
    }
  }

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

  // Animation loop
  const clock = new THREE.Clock();
  const animate = () => {
    timeUpdatedMaterisls.forEach((material) => {
      (material as THREE.ShaderMaterial).uniforms.time.value = clock.getElapsedTime();
    });
    stats.begin();
    requestAnimationFrame(animate);
    scene.traverse(nonBloomed); // swap in non-bloom materials
    bloomComposer.render();
    scene.traverse(restoreMaterial); // restore real materials
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
