<template>
  <div class="flex-1 flex flex-col min-h-0 bg-white border-2 border-black">
    <!-- Toolbar -->
    <div
      class="p-4 border-b-2 border-black flex justify-between items-center bg-gray-100"
    >
      <div class="font-bold text-xl tracking-tighter bg-black text-white px-2">
        {{ $t("APP_TITLE") }}
      </div>
      <el-button type="primary" @click="$emit('create')">
        {{ $t("NEW") }}
      </el-button>
    </div>

    <!-- Search/Filter -->
    <div class="p-4 border-b-2 border-black bg-white">
      <el-input
        v-model="searchQuery"
        :placeholder="$t('SEARCH_PLACEHOLDER')"
        prefix-icon="Search"
      />
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
      <div
        v-for="snippet in filteredSnippets"
        :key="snippet.id"
        class="group relative border-2 border-black bg-white p-4 hover:bg-gray-100 cursor-pointer transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        @click="$emit('open', snippet)"
      >
        <div class="flex justify-between items-center">
          <span
            class="font-bold text-lg truncate border-b-2 border-transparent group-hover:border-black flex-1 mr-4"
          >
            {{ snippet.title || $t("UNTITLED") }}
          </span>
          <button
            class="text-xs border-2 border-black px-2 py-0.5 font-bold hover:bg-black hover:text-white transition-none bg-white text-black shrink-0"
            @click.stop="$emit('run', snippet)"
          >
            {{ $t("RUN_BTN") }}
          </button>
        </div>

        <!-- Tags -->
        <div
          v-if="snippet.tags && snippet.tags.length > 0"
          class="flex gap-2 flex-wrap mt-2"
        >
          <span
            v-for="tag in snippet.tags"
            :key="tag"
            class="text-xs bg-black text-white px-2 py-0.5 font-bold"
          >
            #{{ tag }}
          </span>
        </div>
      </div>

      <div
        v-if="filteredSnippets.length === 0"
        class="text-center text-gray-400 py-10 border-2 border-dashed border-gray-300 m-4"
      >
        {{ $t("NO_DATA") }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { $t } from "@/logic/i18n";

const props = defineProps({
  snippets: {
    type: Array,
    default: () => [],
  },
});

const searchQuery = ref("");

const filteredSnippets = computed(() => {
  if (!searchQuery.value) return props.snippets;
  const lower = searchQuery.value.toLowerCase();
  return props.snippets.filter(
    (s) =>
      (s.title && s.title.toLowerCase().includes(lower)) ||
      (s.uuid && s.uuid.toLowerCase().includes(lower))
  );
});

defineEmits(["create", "open", "run"]);
</script>
