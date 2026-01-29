<template>
  <div class="background">
    <canvas ref="canvas2"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
//import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import Stats from 'stats.js';
import { nonBloomed, restoreMaterial } from '@/utils/render-utils';
import orbURL from '@/assets/orb.glb?url';
import diaURL from '@/assets/diamond-texture2.png?url';

type Orb = {
  base: THREE.Mesh;
  bloom: THREE.Mesh;
};
const orbs: Orb[] = [];
const hovered: Orb[] = [];
const canvas2 = ref<HTMLCanvasElement | null>(null);
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let isInView = true;
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb
document.body.appendChild(stats.dom);
const started = ref(false);

onMounted(() => {
  if (!canvas2.value) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 4;
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas2.value!,
    antialias: true,
    alpha: true, // allow transparency
  });
  renderer.setClearColor(0x000000, 0); // color, alpha = 0 → fully transparent

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const materials = new Map<THREE.Mesh, THREE.Material>();
  const gltfloader = new GLTFLoader();
  const loader = new THREE.TextureLoader();

  // Layer management
  const BLOOM_SCENE = 1;
  const bloomLayer = new THREE.Layers();
  bloomLayer.set(BLOOM_SCENE);

  // Lightspheres
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xf0ffff, 10);
  pointLight.position.set(0, 0, 5);
  scene.add(pointLight);

  let orb: THREE.Object3D;
  let leftSideOrb: THREE.Object3D;
  let rightSideOrb: THREE.Object3D;
  const rigns: THREE.Object3D[] = [];

  loader.load(diaURL, function (fractureTexture) {
    fractureTexture.wrapS = THREE.RepeatWrapping;
    fractureTexture.wrapT = THREE.RepeatWrapping;
    fractureTexture.repeat.set(1, 1);

    const stdMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: fractureTexture,
      transparent: true,
      opacity: 1,
      roughness: 0.5,
      metalness: 0.95,
      side: THREE.DoubleSide,
      bumpMap: fractureTexture, // bump map from same texture
      bumpScale: 2.5, // tweak for depth intensity
    });

    const material = new THREE.MeshPhongMaterial({
      color: 0xfff,
      map: fractureTexture,
      transparent: true,
      refractionRatio: 25,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      bumpMap: fractureTexture, // bump map from same texture
      bumpScale: 0.5, // tweak for depth intensity
      depthWrite: true,
      side: THREE.DoubleSide,
      depthTest: true,
    });

    const circles: THREE.Object3D[] = [];
    const circleSpins: gsap.core.Tween[] = [];

    gltfloader.load(orbURL, (gltf: { scene: THREE.Object3D }) => {
      const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
      orb = gltf.scene;
      orb.children.forEach((child, index) => {
        console.log('name of child:', child.name);
        let mesh = child as THREE.Mesh;
        mesh.material = stdMaterial;
        mesh.layers.enable(BLOOM_SCENE);
        if (child.name === 'inner-ball') {
          const innerMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          });
          mesh.material = innerMaterial;
          console.log('here!');
        }
        if (child.name.includes('circle')) {
          circles.push(child);
          const glassMaterial = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
              uTime: { value: 0 },
              uColor: { value: new THREE.Color(colors[index % colors.length]) },
              uOpacity: { value: 0.8 },
              uGlowStrength: { value: 1.5 },
            },
            vertexShader: `
              varying vec2 vUv;
              varying vec3 vPos;

              void main() {
                vUv = uv;
                vPos = position;

                gl_Position = projectionMatrix *
                              modelViewMatrix *
                              vec4(position, 1.0);
              }
            `,
            fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor;
            uniform float uOpacity;
            uniform float uGlowStrength;

            varying vec2 vUv;
            varying vec3 vPos;

            float noise(vec2 p) {
              return sin(p.x) * sin(p.y);
            }

            void main() {
              // Move UVs over time
              vec2 uv = vUv * 6.0;
              uv.x += uTime * 0.4;
              uv.y += sin(uTime * 0.2);

              // Procedural noise
              float n = noise(uv + uTime);

              // Opacity mask (transparent in places)
              float alphaMask = smoothstep(0.1, 0.6, n);

              // Glow mask
              float glow = smoothstep(0.3, 1.0, n) * uGlowStrength;

              vec3 color = uColor * glow;

              gl_FragColor = vec4(color, alphaMask * uOpacity);

              // Kill very transparent fragments
              if (gl_FragColor.a < 0.02) discard;
            }
          `,
          });

          mesh.material = glassMaterial;
          rigns.push(child);
          // different speed per circle
          const duration = gsap.utils.random(8, 16); // seconds per rotation
          console.log(`Circle ${index} duration:`, duration);
          const spin = gsap.to(child.rotation, {
            y: '+=6.28318530718', // 2π
            x: '+=6.28318530718', // 2π
            z: '+=6.28318530718', // 2π
            duration,
            repeat: -1,
            ease: 'none',
          });

          circleSpins.push(spin);
        }
        if (index === 1 || index === 2) {
          child.visible = false; // Hide the core sphere
        }
        if (index === 0) {
          leftSideOrb = child;
        }
        if (index === 3) {
          rightSideOrb = child;
        }
      });
      scene.add(orb);
    });
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

  const executeStartSequence = () => {
    console.log('START SEQUENCE EXECUTED');
    // Add any startup animations or effects here
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isInView = entry.isIntersecting;
        if (isInView) {
          console.log('IN VIEW - RESUME ANIMATION');
          if (started.value === false) {
            executeStartSequence();
            started.value = true;
          }
          // Restart animation when visible again
          requestAnimationFrame(animate);
        } else {
          console.log('OUT OF VIEW - PAUSE ANIMATION');
        }
      });
    },
    { threshold: 0.1 }, // how much needs to be visible before triggering
  );

  observer.observe(canvas2.value);

  // Animation loop
  const clock = new THREE.Clock();
  const animate = () => {
    if (!isInView) return; // Skip frame if not visible

    stats.begin();

    rigns.forEach((ring) => {
      if (ring instanceof THREE.Mesh && ring.material instanceof THREE.ShaderMaterial) {
        const material = ring.material;
        material.uniforms.uTime.value = clock.getElapsedTime();
      }
    });

    //make the leftSideOrb and the rightsideOrb move away from eachother and back again.
    const time = clock.getElapsedTime();
    if (leftSideOrb && rightSideOrb) {
      leftSideOrb.position.x = Math.sin(time) * 0.5 - 1;
      rightSideOrb.position.x = -Math.sin(time) * 0.5 + 1;
    }

    //rotate the camera around 0,0,0
    camera.position.x = Math.sin(time * 0.1) * 8;
    camera.position.z = Math.cos(time * 0.1) * 8;
    camera.lookAt(0, 0, 0);

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
  display: block;
  width: 100% !important; /* fill parent width */
  height: 100% !important; /* fill parent height */
  min-height: 100vh;
}

.background {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
