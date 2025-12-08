<template>
  <Divider :left="false" color="#1e1e1e" />
  <div class="container">
    <div class="gradient">
      <div class="content"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { onMounted } from 'vue';
import Divider from './Divider.vue';
export default {
  name: 'Contact',
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

@media (max-width: 1040px) {
  .content {
    margin-left: 10px;
    margin-right: 10px;
    width: calc(100% - 20px);
  }
}
</style>
