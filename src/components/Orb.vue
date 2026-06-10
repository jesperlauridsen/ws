<template>
  <div class="background">
    <div class="hud-grid" :class="{ revealed: started }" aria-hidden="true">
      <div class="hud-row" v-for="row in gridRows" :key="`row-${row}`">
        <div
          class="hud-cell"
          v-for="col in gridCols"
          :key="`cell-${row}-${col}`"
          :style="{
            '--line-delay': `${(row + col) * Math.random() * 145 + 45}ms`,
            '--line-opacity': `${Math.random() * 0.2 + 0.1}`,
            '--line-duration-x': `${Math.random() * 420 + 320}ms`,
            '--line-duration-y': `${Math.random() * 420 + 320}ms`,
            '--dots-delay': `${Math.random() * 220 + 40}ms`,
            '--cross-visible': `${Math.random() < 0.4 ? 1 : 0}`,
            '--cross-length': `${Math.random() * 10 + 5}px`,
            '--cross-thickness': `${Math.random() * 2 + 1}px`,
          }"
        >
          <div class="hud-cell-dots"></div>
        </div>
      </div>
    </div>
    <div class="gradientOverlay"></div>
    <canvas ref="canvas2"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import nebURL from '@/assets/fra.png?url';
import diamondURL from '@/assets/diamond2.glb?url';

const canvas2 = ref<HTMLCanvasElement | null>(null);
const gridCols = Array.from({ length: 15 }, (_, i) => i);
const gridRows = Array.from({ length: 8 }, (_, i) => i);
let isInView = true;
const started = ref(false);
let animationFrameId = 0;
let observer: IntersectionObserver | null = null;
let renderer: THREE.WebGLRenderer | null = null;

const executeStartSequence = () => {
  console.log('START SEQUENCE EXECUTED');
};

onMounted(() => {
  if (!canvas2.value) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({
    canvas: canvas2.value!,
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
  directionalLight.position.set(2, 2, 3);
  scene.add(directionalLight);

  // Load nebula texture for env/bump
  const textureLoader = new THREE.TextureLoader();
  const nebTexture = textureLoader.load(nebURL);

  // Custom ShaderMaterial for diamond-like glass
  const diamondMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uEnv: { value: nebTexture },
      uRefractPower: { value: 0.22 },
      uDispersion: { value: 0.17 },
      uBrightness: { value: 0.7 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uEnv;
      uniform float uTime;
      uniform float uRefractPower;
      uniform float uDispersion;
      uniform float uBrightness;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      vec2 envUvFromDir(vec3 dir) {
        float u = 0.5 + atan(dir.z, dir.x) / (2.0 * 3.1415926);
        float v = 0.5 - asin(clamp(dir.y, -1.0, 1.0)) / 3.1415926;
        float tile = 12.0;
        return fract(vec2(u, v) * tile);
      }

      float envDepth(vec2 uv) {
        vec3 c = texture2D(uEnv, uv).rgb;
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        // Invert luminance so darker regions feel "deeper".
        return 1.0 - l;
      }

      vec3 getEnv(vec3 dir, float chroma) {
        vec2 uv = envUvFromDir(dir);

        // Height/parallax from env map gives pseudo depth inside refraction.
        float depth = envDepth(uv);
        vec2 parallaxOffset = normalize(dir.xy + vec2(0.0001)) * (depth - 0.5) * 0.045;

        vec2 uvNear = fract(uv + parallaxOffset + vec2(chroma, 0.0));
        vec2 uvFar = fract(uv - parallaxOffset * 0.65 + vec2(chroma * 0.6, 0.0));

        vec3 colNear = texture2D(uEnv, uvNear).rgb;
        vec3 colFar = texture2D(uEnv, uvFar).rgb;

        // Blend near/far taps by depth to fake internal volume.
        return mix(colNear, colFar, depth * 0.75);
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 n = normalize(vNormal);

        // Simulate multi-facet refraction
        float facet = abs(sin(dot(n, viewDir) * 12.0 + uTime * 0.7));
        float refractStrength = mix(uRefractPower, uRefractPower * 2.5, facet * 0.7);

        // Chromatic dispersion
        vec3 refractR = refract(viewDir, n, 1.0 / (1.45 + uDispersion * 2.0));
        vec3 refractG = refract(viewDir, n, 1.0 / (1.45 + uDispersion));
        vec3 refractB = refract(viewDir, n, 1.0 / (1.45 - uDispersion));

        vec3 envR = getEnv(refractR + n * refractStrength, 0.01);
        vec3 envG = getEnv(refractG + n * refractStrength, 0.0);
        vec3 envB = getEnv(refractB + n * refractStrength, -0.01);

        // Remap dispersion bands to dark purple, pink, and orange.
        vec3 darkPurple = vec3(0.26, 0.08, 0.40);
        vec3 pink = vec3(1.00, 0.36, 0.70);
        vec3 orange = vec3(1.00, 0.56, 0.20);

        float bandA = dot(envR, vec3(0.299, 0.587, 0.114));
        float bandB = dot(envG, vec3(0.299, 0.587, 0.114));
        float bandC = dot(envB, vec3(0.299, 0.587, 0.114));

        vec3 color = darkPurple * bandA + pink * bandB + orange * bandC;

        // Add some sparkle
        float sparkle = pow(facet, 8.0) * 0.7 + pow(abs(dot(n, viewDir)), 16.0) * 0.5;
        color += sparkle * vec3(1.5, 1.7, 2.0);

        // Simulated main light direction (should match your scene's main light)
        vec3 lightDir = normalize(vec3(0.7, 1.0, 0.5));
        // Simulated specular highlight (fake light bounce)
        float spec = pow(max(dot(reflect(-lightDir, n), viewDir), 0.0), 32.0);
        color += spec * 1.7 * vec3(1.0, 0.97, 0.85);

        // Strong Fresnel for edge reflection
        float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
        color += fresnel * 1.2 * vec3(0.7, 0.85, 1.0);

        // Tint and brightness
        color *= uBrightness;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
  });

  const gltfLoader = new GLTFLoader();
  let diamondRoot: THREE.Object3D | null = null;
  const mouseNdc = new THREE.Vector2(0, 0);
  const currentPos = new THREE.Vector3(0, 0, 0);
  const targetPos = new THREE.Vector3(0, 0, 0);

  const handleMouseMove = (event: MouseEvent) => {
    mouseNdc.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseNdc.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };
  window.addEventListener('mousemove', handleMouseMove);

  gltfLoader.load(diamondURL, (gltf) => {
    diamondRoot = gltf.scene;
    diamondRoot.scale.set(0.6, 0.6, 0.6);

    // Center model pivot so movement/rotation stays visually centered.
    const bounds = new THREE.Box3().setFromObject(diamondRoot);
    const center = bounds.getCenter(new THREE.Vector3());
    diamondRoot.position.sub(center);

    diamondRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = diamondMaterial;
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });

    scene.add(diamondRoot);
  });

  const clock = new THREE.Clock();

  const handleResize = () => {
    if (!renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener('resize', handleResize);

  const animate = () => {
    if (!isInView || !renderer) return;

    const elapsed = clock.getElapsedTime();

    if (diamondRoot) {
      targetPos.set(mouseNdc.x * 0.22, mouseNdc.y * 0.14, 0);
      currentPos.lerp(targetPos, 0.1);

      /*  diamondRoot.position.x = currentPos.x;
      diamondRoot.position.y = currentPos.y;
      diamondRoot.position.z = currentPos.z; */

      /*  diamondRoot.rotation.x = elapsed * 0.12;
      diamondRoot.rotation.y = elapsed * 0.18;
      diamondRoot.rotation.z = elapsed * 0.15; */
    }

    //diamondMaterial.uniforms.uTime.value = elapsed;

    renderer.render(scene, camera);
    animationFrameId = requestAnimationFrame(animate);
  };

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isInView = entry.isIntersecting;

        if (isInView) {
          if (!started.value) {
            executeStartSequence();
            started.value = true;
          }

          if (animationFrameId === 0) {
            animate();
          }
        } else if (animationFrameId !== 0) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = 0;
        }
      });
    },
    { threshold: 0.1 },
  );

  observer.observe(canvas2.value);

  animate();

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', handleMouseMove);

    if (observer && canvas2.value) {
      observer.unobserve(canvas2.value);
      observer.disconnect();
      observer = null;
    }

    if (animationFrameId !== 0) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }

    if (diamondRoot) {
      scene.remove(diamondRoot);
      diamondRoot.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
      diamondRoot = null;
    }
    diamondMaterial.dispose();
    nebTexture.dispose();
    renderer?.dispose();
    renderer = null;
  });
});
</script>

<style scoped>
canvas {
  display: block;
  width: 100% !important; /* fill parent width */
  height: 100% !important; /* fill parent height */
  min-height: 100vh;
  position: relative;
  z-index: 2;
  pointer-events: none;
}

.background {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background-color: rgb(16, 16, 16);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.hud-grid {
  --cell-size: 150px;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: calc(var(--cell-size) * 15);
  height: calc(var(--cell-size) * 8);
  z-index: 1;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  background: radial-gradient(
    circle at center,
    rgba(0, 160, 255, 0.16) 0%,
    rgba(0, 68, 128, 0.11) 25%,
    rgb(16, 16, 16) 30%,
    rgb(16, 16, 16) 100%
  );
}

.hud-row {
  display: flex;
  height: var(--cell-size);
  flex-shrink: 0;
}

.hud-cell {
  position: relative;
  width: var(--cell-size);
  height: var(--cell-size);
  flex-shrink: 0;
  box-sizing: border-box;
}

.hud-cell-dots {
  position: absolute;
  inset: 0;
  background: url('@/assets/dots.png') center / 58% 58% no-repeat;
  opacity: 0;
  background-size: auto;
}

.hud-cell::before,
.hud-cell::after {
  content: '';
  position: absolute;
  opacity: 0;
  background: rgba(78, 222, 255, var(--line-opacity));
  will-change: transform, opacity;
}

.hud-cell::before {
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  transform: scaleX(0);
  transform-origin: left center;
}

.hud-cell::after {
  top: 0;
  bottom: 0;
  right: 0;
  width: 1px;
  transform: scaleY(0);
  transform-origin: center top;
}

/* Pseudo-random direction variety per row/column */
.hud-row:nth-child(2n) .hud-cell:nth-child(3n)::before,
.hud-row:nth-child(2n + 1) .hud-cell:nth-child(4n)::before {
  transform-origin: right center;
}

.hud-row:nth-child(3n) .hud-cell:nth-child(2n)::after,
.hud-row:nth-child(2n + 1) .hud-cell:nth-child(5n)::after {
  transform-origin: center bottom;
}

.hud-grid.revealed .hud-cell::before {
  animation: cell-line-x var(--line-duration-x) ease-out forwards;
  animation-delay: var(--line-delay);
}

.hud-grid.revealed .hud-cell::after {
  animation: cell-line-y var(--line-duration-y) ease-out forwards;
  animation-delay: calc(var(--line-delay) + 40ms);
}

.gradientOverlay {
  position: absolute;
  z-index: 5;
  left: 0;
  top: 0;
  width: 100%;
  pointer-events: none;
  height: 100%;
  background-color: rgb(16, 16, 16);
  background:
    linear-gradient(
      to bottom,
      rgb(16, 16, 16) 0%,
      rgba(16, 16, 16, 0.65) 14%,
      rgba(16, 16, 16, 0) 32%,
      rgba(16, 16, 16, 0) 68%,
      rgba(16, 16, 16, 0.65) 86%,
      rgb(16, 16, 16) 100%
    ),
    radial-gradient(
      circle at center,
      rgba(0, 160, 255, 0.12) 0%,
      rgba(0, 68, 128, 0.08) 25%,
      rgb(16, 16, 16) 75%,
      rgb(16, 16, 16) 100%
    );
}

.hud-cell-dots::before,
.hud-cell-dots::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  transform: translate(50%, 50%) scale(0.72);
  background: rgba(120, 235, 255, 0.85);
  box-shadow: 0 0 6px rgba(120, 235, 255, 0.45);
  opacity: 0;
}

.hud-cell-dots::before {
  width: var(--cross-length, 7px);
  height: var(--cross-thickness, 2px);
}

.hud-cell-dots::after {
  width: var(--cross-thickness, 2px);
  height: var(--cross-length, 7px);
}

.hud-grid.revealed .hud-cell-dots::before,
.hud-grid.revealed .hud-cell-dots::after {
  animation: cross-fade 260ms ease-out forwards;
  animation-delay: calc(
    var(--line-delay) + max(var(--line-duration-x), calc(var(--line-duration-y) + 40ms))
  );
}

.hud-grid.revealed .hud-cell-dots {
  animation: dot-image-fade 360ms ease-out forwards;
  animation-delay: calc(
    var(--line-delay) + max(var(--line-duration-x), calc(var(--line-duration-y) + 40ms)) +
      var(--dots-delay)
  );
}

@keyframes cell-line-x {
  0% {
    opacity: 0;
    transform: scaleX(0);
  }
  100% {
    opacity: 1;
    transform: scaleX(1);
  }
}

@keyframes cell-line-y {
  0% {
    opacity: 0;
    transform: scaleY(0);
  }
  100% {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes dot-image-fade {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes cross-fade {
  0% {
    opacity: 0;
    transform: translate(50%, 50%) scale(0.72);
  }
  100% {
    opacity: var(--cross-visible, 0);
    transform: translate(50%, 50%) scale(1);
  }
}
</style>
