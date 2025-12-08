<template>
  <Divider :left="true" color="#1e1e1e" />
  <div class="container grid-bg">
    <div class="gradient">
      <div class="content"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { onMounted } from 'vue';
import Divider from './Divider.vue';
export default {
  name: 'Journey',
  components: {
    Divider,
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
