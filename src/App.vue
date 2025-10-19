<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="container">
    <header>
      <div class="wrapper">
        <nav>
          <a href="#hero">Home</a>
          <a href="#who">Who Am I</a>
          <span>< / ></span>
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </header>
    <RouterView />
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10;
}

nav {
  width: 100%;
  font-size: 24px;
  text-align: center;
  margin-top: 2rem;
  text-transform: uppercase;
}

nav a {
  color: white;
  text-decoration: none;
  margin: 0 1rem;
}
</style>
