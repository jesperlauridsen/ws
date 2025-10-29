<template>
  <div class="container">
    <div class="content">
      <Headline text="What the !@#? is this?" />
      <p>
        I am Jesper Lauridsen, a creative frontend developer with a passion for crafting engaging
        and user-friendly web experiences. With a strong background in web technologies and design
        principles, I specialize in building responsive and visually appealing websites that
        captivate audiences.
      </p>
      <p>
        My expertise includes HTML, CSS, JavaScript, and modern frameworks like Vue.js and React. I
        thrive on turning complex ideas into intuitive interfaces, ensuring seamless functionality
        across all devices. Collaboration and continuous learning are at the core of my approach,
        allowing me to stay ahead in the ever-evolving world of web development.
      </p>
      <p>
        When I'm not coding, I enjoy exploring new design trends, contributing to open-source
        projects, and enhancing my skills through various online courses and workshops.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import Headline from './FirstHeadline.vue';
onMounted(() => {
  console.log('WhoContent component mounted');
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

@media (max-width: 1040px) {
  .content {
    margin-left: 10px;
    margin-right: 10px;
    width: calc(100% - 20px);
  }
}
</style>
