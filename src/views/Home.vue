<template>
  <div class="container">
    <section id="hero" class="hero" title="Welcome">
      <backgroundScene />
      <div class="triangle-divider"></div>
    </section>
    <section id="who" title="Who am I"></section>
    <section id="work" title="Work"></section>
    <section id="contact" title="Contact"></section>
  </div>
</template>

<script setup lang="ts">
import backgroundScene from '@/components/backgroundScene.vue';
</script>

<style scoped>
.hero {
  min-height: 80vh;
  overflow: hidden;
  height: 100vh;
}

section {
  min-height: 100vh;
  position: relative;
  width: 100%;
}

.triangle-divider {
  width: 0;
  height: 0;
  border-left: 50vw solid #f5f5f5;
  border-right: 50vw solid #f5f5f5;
  border-top: 60px solid transparent; /* color & height */
  margin-top: -60px;
  position: relative;
  margin-bottom: 20px;
}

section:nth-of-type(1) {
  background-color: #1e1e1e;
}
section:nth-of-type(2) {
  background-color: #f5f5f5;
}
section:nth-of-type(3) {
  background-color: #1e1e1e;
}
section:nth-of-type(4) {
  background-color: #f5f5f5;
}
</style>
