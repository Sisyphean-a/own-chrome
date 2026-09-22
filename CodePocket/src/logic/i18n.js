import { ref, computed } from "vue";

const messages = {
  en: {
    APP_TITLE: "CodePocket_",
    CONFIG: "[CONFIG]",
    ERRORS: "Errors",
    NEW: "+ NEW",
    SEARCH_PLACEHOLDER: "SEARCH_SNIPPETS...",
    UNTITLED: "UNTITLED",
    RUN_BTN: "[RUN]",
    NO_DATA: "[NO_DATA_FOUND]",

    // Editor
    TITLE_PLACEHOLDER: "SNIPPET_TITLE",
    BACK: "BACK",
    RUN: "RUN",
    SAVE: "SAVE",
    TAGS_LABEL: "TAGS:",
    TAGS_PLACEHOLDER: "comma, separated, tags",
    UUID_LABEL: "UUID:",
    DELETE: "[DELETE]",

    // Settings
    SETTINGS_TITLE: "SETTINGS_",
    LANGUAGE_LABEL: "LANGUAGE / 语言",
    GH_TOKEN_LABEL: "GITHUB PERSONAL ACCESS TOKEN",
    GH_TOKEN_HINT: "REQUIRED FOR GIST SYNC",
    SYSTEM_INFO: "[SYSTEM_INFO]",
    SAVE_CONFIG: "SAVE_CONFIG",
    BACK_TO_MAIN: "BACK_TO_MAIN",
    CLOUD_SYNC: "[CLOUD_SYNC]",
    BTN_UPLOAD: "UPLOAD (BACKUP)",
    BTN_DOWNLOAD: "DOWNLOAD (RESTORE)",
    STATUS_LABEL: "STATUS:",
    IDLE: "IDLE",

    // Messages / Logic
    CONFIRM_DELETE_TITLE: "WARNING",
    CONFIRM_DELETE_MSG: "DELETE_THIS_SEQUENCE?",
    CONFIRM_BTN: "CONFIRM",
    CANCEL_BTN: "CANCEL",
    DELETED_MSG: "DELETED",
    SAVED_MSG: "SEQUENCE_SAVED",
    SAVE_FAILED: "SAVE_FAILED",
    EXEC_ERROR: "EXECUTION_ERROR",

    // Settings Logic
    CONFIG_SAVED: "CONFIGURATION_SAVED",
    TOKEN_REQUIRED: "TOKEN_REQUIRED",
    CONNECTING: "CONNECTING_GITHUB...",
    UPDATING: "UPDATING_GIST...",
    CREATING: "CREATING_GIST...",
    BACKUP_DONE: "BACKUP_COMPLETE",
    BACKUP_OK: "BACKUP_SUCCESSFUL",
    BACKUP_FAIL: "BACKUP_FAILED",

    OVERWRITE_WARN: "THIS_WILL_OVERWRITE_LOCAL_DATA. CONTINUE?",
    YES_OVERWRITE: "YES_OVERWRITE",
    NO_BACKUP: "NO_BACKUP_FOUND",
    DOWNLOADING: "DOWNLOADING_DATA...",
    INVALID_FORMAT: "INVALID_BACKUP_FORMAT",
    WRITING_DB: "WRITING_DB...",
    RESTORE_DONE: "RESTORE_COMPLETE",
    RESTORE_OK: "RESTORE_SUCCESSFUL",
    RESTORE_FAIL: "RESTORE_FAILED",

    ERROR_PREFIX: "ERROR: ",

    // Defaults
    DEFAULT_TITLE: "New_Polymorph",
    DEFAULT_CONTENT: "<!-- Wired_Frame -->\n<h1>Hello World</h1>",

    // New Settings
    EDITOR_SETTINGS: "EDITOR CONFIG",
    AUTO_RUN_LABEL: "AUTO RUN AFTER SAVE",
  },
  zh: {
    APP_TITLE: "代码口袋_",
    CONFIG: "[设置]",
    ERRORS: "错误",
    NEW: "+ 新建",
    SEARCH_PLACEHOLDER: "搜索代码片段...",
    UNTITLED: "无标题",
    RUN_BTN: "[运行]",
    NO_DATA: "[暂无数据]",

    // Editor
    TITLE_PLACEHOLDER: "代码片段标题",
    BACK: "返回",
    RUN: "运行",
    SAVE: "保存",
    TAGS_LABEL: "标签:",
    TAGS_PLACEHOLDER: "标签1, 标签2, ...",
    UUID_LABEL: "UUID:",
    DELETE: "[删除]",

    // Settings
    SETTINGS_TITLE: "设置_",
    LANGUAGE_LABEL: "LANGUAGE / 语言",
    GH_TOKEN_LABEL: "GITHUB 个人访问令牌",
    GH_TOKEN_HINT: "用于 GIST 同步功能",
    SYSTEM_INFO: "[系统信息]",
    SAVE_CONFIG: "保存配置",
    BACK_TO_MAIN: "返回主页",
    CLOUD_SYNC: "[云端同步]",
    BTN_UPLOAD: "上传 (备份)",
    BTN_DOWNLOAD: "下载 (恢复)",
    STATUS_LABEL: "状态:",
    IDLE: "空闲",

    // Messages / Logic
    CONFIRM_DELETE_TITLE: "警告",
    CONFIRM_DELETE_MSG: "确定删除此序列吗？",
    CONFIRM_BTN: "确认",
    CANCEL_BTN: "取消",
    DELETED_MSG: "已删除",
    SAVED_MSG: "序列已保存",
    SAVE_FAILED: "保存失败",
    EXEC_ERROR: "执行错误",

    // Settings Logic
    CONFIG_SAVED: "配置已保存",
    TOKEN_REQUIRED: "需要 Token",
    CONNECTING: "正在连接 GitHub...",
    UPDATING: "正在更新 Gist...",
    CREATING: "正在创建 Gist...",
    BACKUP_DONE: "备份完成",
    BACKUP_OK: "备份成功",
    BACKUP_FAIL: "备份失败",

    OVERWRITE_WARN: "此操作将覆盖本地数据，是否继续？",
    YES_OVERWRITE: "确认覆盖",
    NO_BACKUP: "未找到备份",
    DOWNLOADING: "正在下载数据...",
    INVALID_FORMAT: "备份格式无效",
    WRITING_DB: "正在写入数据库...",
    RESTORE_DONE: "恢复完成",
    RESTORE_OK: "恢复成功",
    RESTORE_FAIL: "恢复失败",

    ERROR_PREFIX: "错误: ",

    // Defaults
    DEFAULT_TITLE: "新多态函数",
    DEFAULT_CONTENT: "<!-- 线框图 -->\n<h1>你好，世界</h1>",

    // New Settings
    EDITOR_SETTINGS: "编辑器设置",
    AUTO_RUN_LABEL: "保存后自动运行",
  },
};

const savedLocale = localStorage.getItem("cp_locale") || "en";
export const currentLocale = ref(savedLocale);

export const t = (key) => {
  return messages[currentLocale.value][key] || key;
};

// For reactive templates
export const $t = computed(() => (key) => t(key));

export const setLocale = (lang) => {
  currentLocale.value = lang;
  localStorage.setItem("cp_locale", lang);
};
