<script setup lang="ts">
import { useTemplateStore } from "../../store";

const store = useTemplateStore();
</script>

<template>
  <div
    id="status-canvas"
    class="relative flex h-full w-full flex-col overflow-hidden bg-black p-[96px] font-sans"
  >
    <div class="flex h-full flex-col justify-center space-y-[12px]">
      <div class="py-[24px] text-[48px] leading-snug text-white">
        <p class="whitespace-pre-wrap">
          {{
            store.posterMessage || "The quick brown fox jumped over the fence."
          }}
        </p>
      </div>
      <div class="flex items-center justify-center">
        <div class="max-w-[864px] overflow-hidden">
          <img :src="store.posterImage" class="h-full w-full object-cover" />
        </div>
      </div>
    </div>
  </div>
</template>
