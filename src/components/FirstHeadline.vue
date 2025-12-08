<template>
  <h2 ref="headlineRef" class="headline" :aria-label="text">
    <span v-for="(word, wordIndex) in chars" :key="`word-${wordIndex}`" class="headline-word">
      <span
        v-for="(char, charIndex) in word"
        :key="`char-${wordIndex}-${charIndex}`"
        class="headline-char"
        :data-char="char"
      >
        {{ char }}
      </span>
    </span>
  </h2>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';

export default defineComponent({
  name: 'Headline',
  props: {
    text: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const headlineRef = ref<HTMLElement | null>(null);
    const chars = computed(() => props.text.split(' ').map((word) => Array.from(word)));
    let observer: IntersectionObserver | null = null;

    onMounted(() => {
      if (!headlineRef.value) return;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateHeadline();
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 },
      );

      observer.observe(headlineRef.value);
    });

    const animateHeadline = () => {
      if (!headlineRef.value) return;
    };

    onUnmounted(() => {
      observer?.disconnect();
    });

    return { headlineRef, chars };
  },
});
</script>

<style scoped>
.headline {
  display: inline-block;
  line-height: 1;
  margin: 0;
  padding: 0;
  font-size: 3rem;
  font-weight: 100;
  color: white;
  position: relative;
}

.headline-word {
  display: inline-block;
  margin-right: 0.5rem;
  white-space: pre;
}

.headline-char {
  display: inline-block;
  white-space: pre;
  font-family: 'Poppins';
  position: relative;
  opacity: 1;
}
</style>
