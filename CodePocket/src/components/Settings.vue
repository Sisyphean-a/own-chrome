<template>
  <div class="h-full flex flex-col p-4 bg-white border-2 border-black">
    <div
      class="font-bold text-xl mb-6 tracking-tighter border-b-2 border-black pb-2"
    >
      {{ $t("SETTINGS_TITLE") }}
    </div>

    <div class="space-y-6">
      <!-- GitHub Token -->
      <div class="space-y-2">
        <label class="block font-bold text-xs uppercase tracking-wider">{{
          $t("GH_TOKEN_LABEL")
        }}</label>
        <div class="text-xs text-gray-500 mb-1">{{ $t("GH_TOKEN_HINT") }}</div>
        <input
          v-model="settings.githubToken"
          type="password"
          class="w-full wired-input font-mono text-sm"
          placeholder="ghp_..."
        />
      </div>

      <!-- Editor Settings -->
      <div class="border-2 border-black p-4 bg-gray-50">
        <div class="font-bold mb-2">{{ $t("EDITOR_SETTINGS") }}</div>
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase">{{
            $t("AUTO_RUN_LABEL")
          }}</span>
          <el-switch v-model="settings.autoRunAfterSave" />
        </div>
      </div>

      <!-- Sync Actions -->
      <div class="border-2 border-black p-4 bg-gray-50">
        <div class="font-bold mb-2">{{ $t("CLOUD_SYNC") }}</div>
        <div class="grid grid-cols-2 gap-4">
          <el-button
            type="success"
            plain
            @click="handleBackup"
            :loading="backingUp"
          >
            {{ $t("BTN_UPLOAD") }}
          </el-button>
          <el-button
            type="warning"
            plain
            @click="handleRestore"
            :loading="restoring"
          >
            {{ $t("BTN_DOWNLOAD") }}
          </el-button>
        </div>
        <div class="text-xs text-gray-500 mt-2 font-mono truncate">
          {{ $t("STATUS_LABEL") }} {{ syncStatus || $t("IDLE") }}
        </div>
      </div>

      <!-- Language -->
      <div class="border-2 border-black p-4 bg-gray-50">
        <label class="block font-bold text-xs uppercase tracking-wider mb-2">{{
          $t("LANGUAGE_LABEL")
        }}</label>
        <div class="grid grid-cols-2 gap-4">
          <el-button
            :type="currentLocale === 'en' ? 'primary' : ''"
            plain
            @click="changeLocale('en')"
          >
            ENGLISH
          </el-button>
          <el-button
            :type="currentLocale === 'zh' ? 'primary' : ''"
            plain
            @click="changeLocale('zh')"
          >
            中文
          </el-button>
        </div>
      </div>

      <!-- About -->
      <div class="border-2 border-black p-4 bg-gray-50">
        <div class="font-bold mb-2">{{ $t("SYSTEM_INFO") }}</div>
        <div class="text-xs space-y-1 font-mono">
          <div>VERSION: 1.0.0</div>
          <div>BUILD: DIRECT_CONNECT</div>
          <div>MODE: GEEK_WIRE</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-4">
        <el-button type="primary" class="w-full" @click="saveSettings">
          {{ $t("SAVE_CONFIG") }}
        </el-button>
      </div>

      <div class="text-center">
        <el-button @click="$emit('back')" class="w-full border-0 underline">
          {{ $t("BACK_TO_MAIN") }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { db } from "@/logic/storage";
import { GithubService } from "@/logic/github";
import { currentLocale, setLocale, t, $t } from "@/logic/i18n";

const settings = ref({
  githubToken: "",
  autoRunAfterSave: false,
});

const backingUp = ref(false);
const restoring = ref(false);
const syncStatus = ref("");

const changeLocale = (val) => {
  setLocale(val);
};

onMounted(() => {
  const stored = localStorage.getItem("cp_settings");
  if (stored) {
    try {
      settings.value = JSON.parse(stored);
    } catch (e) {}
  }
});

const saveSettings = () => {
  localStorage.setItem("cp_settings", JSON.stringify(settings.value));
  ElMessage.success(t("CONFIG_SAVED"));
};

const handleBackup = async () => {
  if (!settings.value.githubToken) {
    ElMessage.warning(t("TOKEN_REQUIRED"));
    return;
  }

  backingUp.value = true;
  syncStatus.value = t("CONNECTING");

  try {
    const snippets = await db.snippets.toArray();
    const files = GithubService.prepareGistFiles(snippets);

    const existingGist = await GithubService.getGist(
      settings.value.githubToken
    );

    if (existingGist) {
      syncStatus.value = t("UPDATING");
      await GithubService.updateGist(
        settings.value.githubToken,
        existingGist.id,
        files
      );
    } else {
      syncStatus.value = t("CREATING");
      await GithubService.createGist(settings.value.githubToken, files);
    }

    syncStatus.value = t("BACKUP_DONE");
    ElMessage.success(t("BACKUP_OK"));
  } catch (err) {
    console.error(err);
    syncStatus.value = t("ERROR_PREFIX") + (err.message || "UNKNOWN");
    ElMessage.error(t("BACKUP_FAIL"));
  } finally {
    backingUp.value = false;
  }
};

const handleRestore = async () => {
  if (!settings.value.githubToken) {
    ElMessage.warning(t("TOKEN_REQUIRED"));
    return;
  }

  try {
    await ElMessageBox.confirm(t("OVERWRITE_WARN"), t("CONFIRM_DELETE_TITLE"), {
      confirmButtonText: t("YES_OVERWRITE"),
      cancelButtonText: t("CANCEL_BTN"),
      type: "warning",
    });
  } catch {
    return;
  }

  restoring.value = true;
  syncStatus.value = t("CONNECTING");

  try {
    const existingGist = await GithubService.getGist(
      settings.value.githubToken
    );

    if (!existingGist) {
      throw new Error(t("NO_BACKUP"));
    }

    syncStatus.value = t("DOWNLOADING");
    const gistDetail = await GithubService.getGistDetail(
      settings.value.githubToken,
      existingGist.id
    );

    const indexFile = gistDetail.files["index.json"];
    if (!indexFile) {
      throw new Error(t("INVALID_FORMAT"));
    }

    const indexData = JSON.parse(indexFile.content);
    const newSnippets = [];

    for (const meta of indexData) {
      const fileName = `${meta.uuid}.html`;
      const contentFile = gistDetail.files[fileName];

      newSnippets.push({
        ...meta,
        content: contentFile ? contentFile.content : "",
      });
    }

    syncStatus.value = t("WRITING_DB");

    await db.transaction("rw", db.snippets, async () => {
      await db.snippets.clear();
      await db.snippets.bulkAdd(newSnippets);
    });

    syncStatus.value = t("RESTORE_DONE");
    ElMessage.success(t("RESTORE_OK"));
  } catch (err) {
    console.error(err);
    syncStatus.value = t("ERROR_PREFIX") + (err.message || "UNKNOWN");
    ElMessage.error(t("RESTORE_FAIL"));
  } finally {
    restoring.value = false;
  }
};

defineEmits(["back"]);
</script>
