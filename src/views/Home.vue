<template>
  <div class="container">
    <section id="hero" class="hero">
      <backgroundScene />
      <div class="introduction">
        <span class="name">Jesper Lauridsen</span>
        <span class="title">Creative frontend developer</span>
      </div>
      <div class="triangle-divider"></div>
    </section>
    <section id="who">
      <WhoContent />
    </section>
    <section id="work"></section>
    <section id="contact"></section>
  </div>
</template>

<script setup lang="ts">
import backgroundScene from '@/components/BackgroundScene.vue';
import WhoContent from '@/components/WhoContent.vue';
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
  border-left: 50vw solid #1e1e1e;
  border-right: 50vw solid #1e1e1e;
  border-top: 60px solid transparent; /* color & height */
  margin-top: -84px;
  position: relative;
}

section:nth-of-type(1) {
  background-color: #f5f5f5;
}
section:nth-of-type(2) {
  background-color: #1e1e1e;
}
section:nth-of-type(3) {
  background-color: #f5f5f5;
}
section:nth-of-type(4) {
  background-color: #1e1e1e;
}
</style>
