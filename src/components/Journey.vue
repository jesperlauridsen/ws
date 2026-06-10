<template>
  <Divider :left="true" color="#101010" />
  <div class="container grid-bg">
    <div class="radial-blur"></div>
    <div class="gradient">
      <Landscape />
      <div class="content"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { onMounted } from 'vue';
import Divider from './Divider.vue';
import Landscape from './Landscape.vue';
export default {
  name: 'Journey',
  components: {
    Divider,
    Landscape,
  },
};
onMounted(() => {
  console.log('Journey component mounted');
});
</script>
<style scoped>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  color: white;
}

.content {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  box-sizing: border-box;
  position: absolute;
  height: 60vh;
  top: 180px;
  align-items: center;
}

.gradient {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%),
    radial-gradient(circle at 75% 80%, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%);
  background-blend-mode: difference;
}

.radial-blur {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 1;
  /* The actual glass blur */
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);

  /* Important: needs some background for backdrop-filter to trigger */
  background: rgba(255, 255, 255, 0.06);

  /* Radial mask: center transparent (no blur), edges opaque (full blur) */
  mask-image: radial-gradient(
    circle at center,
    transparent 0%,
    transparent 25%,
    rgba(0, 0, 0, 0.4) 45%,
    rgba(0, 0, 0, 0.8) 65%,
    black 80%
  );

  -webkit-mask-image: radial-gradient(
    circle at center,
    transparent 0%,
    transparent 25%,
    rgba(0, 0, 0, 0.4) 45%,
    rgba(0, 0, 0, 0.8) 65%,
    black 80%
  );

  pointer-events: none; /* lets clicks pass through */
}

.grid-bg {
  width: 100%;
  height: 100vh;
  background-image:
    repeating-linear-gradient(
      0deg,
      var(--color) 0,
      var(--color) calc(var(--thin)),
      transparent calc(var(--thin)),
      transparent var(--size)
    ),
    repeating-linear-gradient(
      90deg,
      var(--color) 0,
      var(--color) calc(var(--thin)),
      transparent calc(var(--thin)),
      transparent var(--size)
    );
  background-size: auto;
  /* optional: highlight every Nth line by adding another gradient */
  /* background-image: ... , repeating-linear-gradient(90deg, var(--thick-color) 0, var(--thick-color) 1px, transparent 1px, transparent calc(var(--size) * 5)); */
}

@media (max-width: 1040px) {
  .content {
    margin-left: 10px;
    margin-right: 10px;
    width: calc(100% - 20px);
  }
}
</style>
