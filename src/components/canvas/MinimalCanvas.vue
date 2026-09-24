<script setup lang="ts">
import { useTemplateStore } from "../../store";

const store = useTemplateStore();
</script>

<template>
  <div
    id="status-canvas"
    class="relative flex h-full w-full flex-col overflow-hidden bg-black p-[72px] font-sans"
  >
    <div class="flex h-full flex-col items-center justify-center text-center">
      <div class="text-start leading-tight text-white">
        <p
          class="overflow-hidden text-[54px] leading-[84px] whitespace-pre-wrap"
        >
          {{
            store.minimalMessage || "The quick brown fox jumped over the fence."
          }}
        </p>
      </div>
    </div>
  </div>
</template>
