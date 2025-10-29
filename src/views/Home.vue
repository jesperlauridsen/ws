<template>
  <div class="container">
    <section id="hero" class="hero">
      <backgroundScene />
      <div class="introduction">
        <p class="name">Jesper Lauridsen</p>
        <p class="title">Creative frontend developer</p>
      </div>
      <div class="triangle-divider">
        <div class="first"></div>
        <div class="second"></div>
        <div class="third"></div>
        <div class="fourth"></div>
        <div class="fifth"></div>
      </div>
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
  display: flex;
  flex-direction: column;
  align-items: center;
}

section {
  min-height: 100vh;
  position: relative;
  width: 100%;
}

.introduction {
  position: absolute;
  width: 100%;
  max-width: 1000px;
  margin: auto;
  padding: 10px;
  box-sizing: border-box;
  height: calc(60vh);
  top: 180px;
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.introduction p {
  color: white;
  margin: 0;
  padding: 0;
  width: 100%;
}

.introduction .name {
  font-size: 25px;
  font-weight: 700;
  padding-left: 10px;
}

.introduction .title {
  font-size: 30px;
  font-weight: 700;
  display: flex;
  justify-content: flex-end;
  position: relative;
  margin-left: -10px;
}

.triangle-divider {
  position: relative;
  height: 60px;
  margin-top: -60px;
  width: 100%;
}

.triangle-divider div {
  position: absolute;
  left: 0;
  width: 0;
  height: 0;
  border-left: 50vw solid #1e1e1e;
  border-right: 50vw solid #1e1e1e;
  border-top: 60px solid #ffffff00;
  opacity: 0;
  transform-origin: top;
}

/* Each layer slightly darker and shifted upward */
.triangle-divider .first {
  opacity: 0.2;
  border-top: 60px solid #ffffff00;
}
.triangle-divider .second {
  opacity: 0.4;
  border-top: 50px solid #ffffff00;
  top: 10px;
}
.triangle-divider .third {
  opacity: 0.6;
  border-top: 40px solid #ffffff00;
  top: 20px;
}
.triangle-divider .fourth {
  opacity: 0.8;
  border-top: 30px solid #ffffff00;
  top: 30px;
}
.triangle-divider .fifth {
  opacity: 1;
  border-top: 40px solid #ffffff00;
  top: 40px;
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
