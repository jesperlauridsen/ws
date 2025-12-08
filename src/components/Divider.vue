<template>
  <div :style="`background:${color}`" :class="left ? 'tri-left' : 'tri-right'"></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Divider',
  props: {
    left: {
      type: Boolean,
      required: false,
      default: false,
    },
    color: {
      type: String,
      required: false,
      default: '#ffffff',
    },
  },
  setup() {},
});
</script>
<style scoped>
.tri-right {
  position: absolute;
  width: 100%;
  height: 60px;
  margin-top: -60px;
  clip-path: polygon(100% 0, 0% 100%, 100% 100%);
  -webkit-clip-path: polygon(100% 0, 0% 100%, 100% 100%);
}

.tri-left {
  position: absolute;
  width: 100%;
  height: 60px;
  clip-path: polygon(0 0, 100% 0, 0 100%); /* right triangle (left half) */
  -webkit-clip-path: polygon(0 0, 100% 0, 0 100%);
}
</style>
