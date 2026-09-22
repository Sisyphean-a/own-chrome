<template>
  <div
    class="h-full flex flex-col bg-white overflow-hidden font-mono shadow-[4px_4px_1px_1px_rgba(0,0,0,1)]"
  >
    <!-- View: List -->
    <SnippetList
      v-if="currentView === 'list'"
      :snippets="snippets"
      @create="createNew"
      @open="openSnippet"
      @run="runSnippetDirectly"
    />

    <!-- View: Editor -->
    <SnippetEditor
      v-else-if="currentView === 'editor'"
      :snippet="currentSnippet"
      @update:snippet="updateCurrentSnippet"
      @back="goBack"
      @save="saveSnippet"
      @run="runCode"
      @delete="deleteSnippet"
    />

    <!-- View: Settings -->
    <Settings v-else-if="currentView === 'settings'" @back="goBack" />

    <!-- Global Footer / Navigation -->
    <div
      v-if="currentView === 'list'"
      class="border-t-2 border-l-2 border-b-2 border-black p-2 bg-gray-50 flex justify-between items-center text-xs"
    >
      <div>{{ $t("ERRORS") }}: 0</div>
      <el-button size="small" @click="currentView = 'settings'">
        {{ $t("CONFIG") }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { db } from "@/logic/storage";
import { runSnippet as executeSnippet } from "@/logic/runner";
import SnippetList from "@/components/SnippetList.vue";
import SnippetEditor from "@/components/SnippetEditor.vue";
import Settings from "@/components/Settings.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { t, $t } from "@/logic/i18n";

const snippets = ref([]);
const currentView = ref("list"); // list, editor, settings
const currentSnippet = ref({});

const loadSnippets = async () => {
  snippets.value = await db.snippets.toArray();
};

const createNew = () => {
  currentSnippet.value = {
    uuid: crypto.randomUUID(),
    title: t("DEFAULT_TITLE"),
    content: t("DEFAULT_CONTENT"),
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  currentView.value = "editor";
};

const openSnippet = (snippet) => {
  currentSnippet.value = { ...snippet }; // clone
  currentView.value = "editor";
};

const updateCurrentSnippet = (val) => {
  currentSnippet.value = val;
};

const goBack = () => {
  currentView.value = "list";
  loadSnippets(); // Refresh list on back
};

const saveSnippet = async (snippetData) => {
  try {
    const plainSnippet = JSON.parse(JSON.stringify(snippetData));
    plainSnippet.updatedAt = Date.now();

    if (plainSnippet.id) {
      await db.snippets.update(plainSnippet.id, plainSnippet);
    } else {
      delete plainSnippet.id;
      await db.snippets.add(plainSnippet);
      // After add, reload to get ID if needed, but we usually go back or keep editing
    }
    await loadSnippets();
    ElMessage.success({
      message: t("SAVED_MSG"),
      offset: 40,
      plain: true,
    });

    // Auto Run Check
    try {
      const storedSettings = localStorage.getItem("cp_settings");
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed.autoRunAfterSave) {
          await runCode(plainSnippet.content);
        }
      }
    } catch (e) {
      console.error("Auto run failed", e);
    }
  } catch (err) {
    console.error(err);
    ElMessage.error(t("SAVE_FAILED"));
  }
};

const deleteSnippet = async (snippetData) => {
  try {
    await ElMessageBox.confirm(
      t("CONFIRM_DELETE_MSG"),
      t("CONFIRM_DELETE_TITLE"),
      {
        confirmButtonText: t("CONFIRM_BTN"),
        cancelButtonText: t("CANCEL_BTN"),
        type: "warning",
        roundButton: false,
      }
    );

    if (snippetData.id) {
      await db.snippets.delete(snippetData.id);
      await loadSnippets();
      currentView.value = "list";
      ElMessage.success(t("DELETED_MSG"));
    }
  } catch (e) {
    // Cancelled
  }
};

const runCode = async (code) => {
  try {
    await executeSnippet(code);
  } catch (err) {
    console.error(err);
    ElMessage.error(t("EXEC_ERROR"));
  }
};

const runSnippetDirectly = async (snippet) => {
  await runCode(snippet.content);
};

onMounted(loadSnippets);
</script>

<style>
/* Global overrides if needed, but index.css handles most */
</style>
