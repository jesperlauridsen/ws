<template>
  <div class="container">
    <header :class="{ 'blend-mode': hasScrolledPastHero }">
      <div class="wrapper">
        <nav>
          <a href="#hero"><span class="number">01</span>Home</a>
          <a href="#who"><span class="number">02</span>What the !@#? is this?</a>
          <div class="logo-container">
            <span class="logo"><span class="logo-line"></span></span>
          </div>
          <a href="#work"><span class="number">03</span>The Journey so far</a>
          <a href="#contact"><span class="number">04</span>Contact</a>
        </nav>
      </div>
    </header>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import { ref, onMounted, onUnmounted } from 'vue';

const hasScrolledPastHero = ref(false);

onMounted(() => {
  const handleScroll = () => {
    hasScrolledPastHero.value = window.scrollY > window.innerHeight;
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll();

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
  });
});
</script>

<style scoped>
header {
  line-height: 1.5;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10;
  color: white;
  transition:
    mix-blend-mode 0.4s ease,
    color 0.4s ease;
}

/* Only applies the blend effect after scrolling past hero */
header.blend-mode {
  mix-blend-mode: difference;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
  text-transform: uppercase;
  display: flex;
  justify-content: center;
}

.logo-container {
  display: flex;
  width: 80px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-left: 20px;
  margin-right: 20px;
}

.number {
  color: #7c7c7cf3;
  margin-right: 3px;
}

.logo-line {
  width: 2px;
  height: 24px;
  background-color: white;
  display: inline-block;
  position: relative;
  transform: rotate(45deg);
  top: -2.5px;
}

.logo::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-left: 2px solid white;
  border-top: 2px solid white;
  transform: rotate(-45deg);
  margin-left: -22px;
  margin-top: 3px;
}

.logo::before {
  content: '';
  width: 10px;
  height: 10px;
  border-left: 2px solid white;
  border-top: 2px solid white;
  transform: rotate(135deg);
  position: absolute;
  margin-left: 10px;
  margin-top: 3px;
}

nav a {
  color: white;
  text-decoration: none;
  margin: 0 1rem;
}
</style>
