<template>
  <div class="background">
    <canvas ref="canvas3"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
/* import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
 */ import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { nonBloomed, restoreMaterial } from '@/utils/render-utils';
import orbURL from '@/assets/lanscape7.glb?url';
import gsap from 'gsap';

const canvas3 = ref<HTMLCanvasElement | null>(null);
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let isInView = true;
const started = ref(false);

onMounted(() => {
  if (!canvas3.value) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 15;
  camera.position.y = 5;
  scene.fog = new THREE.Fog(0xa3a3a3, 10, 20);
  const fog = scene.fog as THREE.Fog;
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas3.value!,
    antialias: true,
    alpha: true, // allow transparency
  });
  renderer.setClearColor(0xa3a3a3); // color, alpha = 0 → fully transparent

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  const materials = new Map<THREE.Mesh, THREE.Material>();
  //const controls = new OrbitControls(camera, renderer.domElement);

  const simpleFogMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0xff0000) },
      time: { value: 0 },
      fogColor: { value: scene.fog.color },
      fogNear: { value: (scene.fog as THREE.Fog).near },
      fogFar: { value: (scene.fog as THREE.Fog).far },
    },
    fog: true, // important!
    vertexShader: `
    precision mediump float;
    varying vec2 vTextureCoord;
    varying float vFogDepth;
    uniform float fogNear;
    uniform float fogFar;

    void main() {
    vTextureCoord = uv;
      // position and matrices are already provided by Three.js
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // distance for fog calculation
      vFogDepth = length(mvPosition.xyz);
    }
  `,
    fragmentShader: `
    precision mediump float;
    uniform float time;
    varying vec2 vTextureCoord;
    uniform vec3 color;
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;
    varying float vFogDepth;

    const float MAX_ITERATIONS = 50.0; // This must be a fixed value


    void main() {
    vec2 uv = (3.0 * vTextureCoord.xy) * 1.3;
    for (float i = 1.0; i < MAX_ITERATIONS; i++) {
        uv.x += 1.1 * 0.6 / i * sin(i * 2.5 * uv.y + ((time * 1.0) / 10.0));
        uv.y += 1.1 * 0.6 / i * cos(i * 1.5 * uv.x + ((time * 1.0) / 10.0));
    }

    vec3 baseColor = vec3(0.05 / abs(sin((time * 1.0) / 10.0 - uv.y + uv.x)),
        0.1 / abs(sin((time * 1.0) - uv.y - uv.x)),
        0.2 / abs(sin((time * 1.0) - uv.y - uv.x)));

    float fogFactor = (vFogDepth - fogNear) / (fogFar - fogNear);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    vec3 finalColor = mix(baseColor, fogColor, fogFactor);

    gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
  });
  const gltfloader = new GLTFLoader();
  const markers: THREE.Mesh[] = [];
  const mtl = new THREE.MeshPhongMaterial({
    color: 0xffff00,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.5,
  });
  gltfloader.load(orbURL, (gltf) => {
    const root = gltf.scene;
    root.scale.set(0.3, 0.3, 0.3);

    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        console.log(child.name);
        if (child.name.includes('Landscape')) {
          child.material = simpleFogMaterial;
          child.castShadow = true;
          child.receiveShadow = true;
        } else {
          markers.push(child);
          child.material = mtl;
        }
      }
    });

    scene.add(root);
  });

  // Layer management
  const BLOOM_SCENE = 1;
  const bloomLayer = new THREE.Layers();
  bloomLayer.set(BLOOM_SCENE);

  // Lightspheres
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 1000);
  pointLight.position.set(0, 25, 0);
  scene.add(pointLight);

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
          gl_FragColor = base + vec4(base.rgb, 0.0);
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
    if (isInView === false) return; // Skip if not visible
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    // Raycast and check which sphere is hovered
    raycaster.setFromCamera(mouse, camera);
    /* const intersects = raycaster
      .intersectObjects(scene.children, true)
      .filter((i) => !i.object.userData.ignoreRaycast); */
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

  observer.observe(canvas3.value);

  const createCameraPath = (origin: THREE.Vector3, destination: THREE.Vector3) => {
    const mid = new THREE.Vector3().addVectors(origin, destination).multiplyScalar(0.5);
    const center = new THREE.Vector3(0, 0, 0);

    const dir = new THREE.Vector3().subVectors(mid, center).normalize();
    const control = new THREE.Vector3().copy(center).add(dir.multiplyScalar(mid.length() * 2));

    // Destination marker
    //scene.add(new THREE.ArrowHelper(destination.clone().normalize(), destination, 1, 0xff0000));

    const endPosition = destination
      .clone()
      .normalize() // direction from center through destination
      .multiplyScalar(destination.length() + 2); // 1 unit beyond

    //console.log('here!', origin, destination, control);
    const curve = new THREE.QuadraticBezierCurve3(
      origin.clone(),
      control.clone(),
      endPosition.clone(),
    );

    const points = curve.getPoints(100);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
    });

    const line = new THREE.Line(geometry, material);

    scene.add(line);
    return curve;
  };

  const moveCameraAlongPath = (
    curve: THREE.QuadraticBezierCurve3,
    duration: number,
    camera: THREE.Camera,
  ) => {
    const obj = { t: 0 };
    console.log(gsap, 'helo');
    gsap.to(obj, {
      t: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const position = curve.getPoint(obj.t);

        camera.position.copy(position);
        // Optional: look slightly ahead on the curve
        camera.lookAt(0, 0, 0);
      },
    });
  };

  const onClick = () => {
    console.log(markers);
    const curve = createCameraPath(
      camera.position.clone(),
      markers[1].getWorldPosition(new THREE.Vector3()),
    );
    moveCameraAlongPath(curve, 3, camera);
  };

  document.addEventListener('click', onClick);

  // Animation loop
  const clock = new THREE.Clock();
  const animate = () => {
    if (!isInView) return; // Skip frame if not visible

    //stats.begin();

    const time = clock.getElapsedTime();

    if (scene.fog !== null) {
      simpleFogMaterial.uniforms.fogColor.value.copy(fog.color);
      simpleFogMaterial.uniforms.fogNear.value = fog.near;
      simpleFogMaterial.uniforms.fogFar.value = fog.far;
      simpleFogMaterial.uniforms.time.value = time * 0.5;
    }
    /* controls.update(); */
    //rotate the camera around 0,0,0
    /* camera.position.x = Math.sin(time * 0.1) * 15;
    camera.position.z = Math.cos(time * 0.1) * 15;
    camera.lookAt(0, 0, 0); */

    requestAnimationFrame(animate);
    scene.traverse((obj) => nonBloomed(obj, bloomLayer, materials));
    bloomComposer.render();
    scene.traverse((obj) => restoreMaterial(obj, materials)); // restore real materials
    finalComposer.render();
    //stats.end();
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
