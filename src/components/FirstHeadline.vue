<template>
  <h2 ref="headlineRef" class="headline" :aria-label="text" :data-visible="isVisible">
    <span v-for="(word, wordIndex) in chars" :key="`word-${wordIndex}`" class="headline-word">
      <span
        v-for="(char, charIndex) in word"
        :key="`char-${wordIndex}-${charIndex}`"
        class="headline-char"
        :data-char="char"
        :style="{
          '--delay': `${(wordIndex * 10 + charIndex) * 20}ms`,
        }"
      >
        {{ char }}
      </span>
    </span>
  </h2>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';

export default defineComponent({
  name: 'Headline',
  props: {
    text: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const chars = computed(() => props.text.split(' ').map((word) => Array.from(word)));
    const headlineRef = ref<HTMLElement | null>(null);
    const isVisible = ref(false);

    let observer: IntersectionObserver | null = null;

    onMounted(() => {
      if (!headlineRef.value) return;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              isVisible.value = true;
              observer?.unobserve(entry.target); // animate once
            }
          });
        },
        { threshold: 0.2 },
      );

      observer.observe(headlineRef.value);
    });

    onUnmounted(() => {
      observer?.disconnect();
    });

    return { chars, headlineRef, isVisible };
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
  font-weight: 700;
  position: relative;
  color: white;
}

.headline-char {
  font-family: 'Poppins';
  position: relative;
  display: inline-block;
  white-space: pre;
  opacity: 0;
  transform: translateX(20px);
  filter: blur(6px);
  transition:
    opacity 0.4s ease var(--delay),
    filter 0.4s ease var(--delay),
    transform 0.4s ease var(--delay);
}

/* pseudo layers for RGB distortion */
.headline-char::before,
.headline-char::after {
  content: attr(data-char);
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0.6;
  mix-blend-mode: screen;
  pointer-events: none;
  filter: blur(2px);
  transition:
    opacity 1.6s ease var(--delay),
    transform 1.6s ease var(--delay);
}

.headline-char::before {
  color: #00ffff;
  transform: translateX(-10px);
}
.headline-char::after {
  color: #ff00ff;
  transform: translateX(10px);
}

/* When visible, main letter appears */
.headline[data-visible='true'] .headline-char {
  opacity: 1;
  transform: translateX(0);
  filter: blur(0px);
}

/* pseudo layers fade/merge with the same stagger */
.headline[data-visible='true'] .headline-char::before,
.headline[data-visible='true'] .headline-char::after {
  opacity: 0;
  transform: translateX(0);
}

/* hover glow effect */
/* .headline-char {
  text-shadow:
    0 0 8px rgba(0, 255, 255, 0.5),
    0 0 8px rgba(255, 0, 255, 0.5);
} */
</style>
