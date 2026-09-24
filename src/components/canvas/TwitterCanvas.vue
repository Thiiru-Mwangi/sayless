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
      <div class="flex items-center gap-[36px]">
        <div
          class="h-[144px] w-[144px] overflow-hidden rounded-full border-[3px] border-white/10"
        >
          <img :src="store.profileImage" class="h-full w-full object-cover" />
        </div>
        <div>
          <div
            class="flex items-center text-[48px] leading-tight font-semibold text-white capitalize opacity-80"
          >
            {{ store.userName || "Username" }}
            <img
              src="/images/check.png"
              width="48"
              class="ml-[6px]"
              alt="Check mark"
            />
          </div>
          <div class="text-[42px] leading-[60px] text-gray-500 lowercase">
            @{{ store.handle || "handle" }}
          </div>
        </div>
      </div>
      <div
        class="wrap-break-word py-[24px] text-[60px] leading-snug font-normal text-white"
      >
        <p class="whitespace-pre-wrap">
          {{
            store.twitterMessage || "The quick brown fox jumped over the fence."
          }}
        </p>
      </div>
    </div>
  </div>
</template>
