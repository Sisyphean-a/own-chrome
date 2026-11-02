import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApplyStateCommandRequest,
  BackgroundToContentMessage,
  PanelCommandRequest,
  PanelCommandResponse,
} from "../shared/messageTypes";
import type { StateCommand } from "../shared/stateCommands";
import { GLOBAL_LIBRARY_KEY, MIGRATION_SOURCE_ORIGIN, STORAGE_KEY } from "../shared/constants";
import { createDefaultOriginState } from "../shared/storage";
import type { BridgeStorageState } from "../shared/bridgeTypes";
import { createResponse } from "../test/factories";

type RuntimeMessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: PanelCommandResponse) => void,
) => boolean | void;

describe("serviceWorker command routing", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("会通过 tabs.sendMessage 将面板命令转发给当前 tab", async () => {
    const harness = await loadServiceWorkerHarness();

    const response = await harness.dispatch({
      type: "PANEL_COMMAND",
      tabId: 7,
      command: { type: "CLEAR_LOGS" },
    });

    expect(harness.sendMessage).toHaveBeenCalledWith(7, {
      type: "BACKGROUND_COMMAND",
      command: { type: "CLEAR_LOGS" },
    } satisfies BackgroundToContentMessage);
    expect(response).toEqual({ ok: true });
    expect(harness.executeScript).not.toHaveBeenCalled();
  });

  it("收件端缺失时会重注入脚本后重试命令", async () => {
    const harness = await loadServiceWorkerHarness();
    harness.sendMessage.mockRejectedValueOnce(
      new Error("Could not establish connection. Receiving end does not exist."),
    );

    const response = await harness.dispatch({
      type: "PANEL_COMMAND",
      tabId: 7,
      command: { type: "REQUEST_SNAPSHOT" },
    });

    expect(harness.executeScript).toHaveBeenNthCalledWith(1, {
      target: { tabId: 7 },
      files: ["injected/injectMain.js"],
      world: "MAIN",
    });
    expect(harness.executeScript).toHaveBeenNthCalledWith(2, {
      target: { tabId: 7 },
      files: ["content/contentScript.js"],
    });
    expect(harness.sendMessage).toHaveBeenCalledTimes(2);
    expect(response).toEqual({ ok: true });
  });

  it("内容脚本回执失败时必须原样透传，不得当成成功", async () => {
    const harness = await loadServiceWorkerHarness();
    harness.sendMessage.mockResolvedValueOnce({
      ok: false,
      message: "存储写入失败",
    });

    const response = await harness.dispatch({
      type: "PANEL_COMMAND",
      tabId: 7,
      command: { type: "UPSERT_RESPONSE", senderId: "sender-1", response: createResponse("r-1") },
    });

    expect(response).toEqual({ ok: false, message: "存储写入失败" });
  });

  it("内容脚本没有回执时按失败回执", async () => {
    const harness = await loadServiceWorkerHarness();
    harness.sendMessage.mockResolvedValueOnce(undefined);

    const response = await harness.dispatch({
      type: "PANEL_COMMAND",
      tabId: 7,
      command: { type: "TRIGGER_RESPONSE", senderId: "sender-1", responseId: "r-1" },
    });

    expect(response).toEqual({ ok: false, message: "内容脚本未返回命令结果" });
  });

  it("注入失败时会把错误透传给面板", async () => {
    const harness = await loadServiceWorkerHarness();
    harness.sendMessage.mockRejectedValueOnce(
      new Error("Could not establish connection. Receiving end does not exist."),
    );
    harness.executeScript.mockRejectedValueOnce(new Error("Cannot access this page"));

    const response = await harness.dispatch({
      type: "PANEL_COMMAND",
      tabId: 7,
      command: { type: "MANUAL_EMIT", eventName: "toLogin", detail: { ok: true } },
    });

    expect(response).toEqual({
      ok: false,
      message: "Cannot access this page",
    });
  });

  it("APPLY_STATE_COMMAND 会把状态增量应用到存储并回执成功", async () => {
    const harness = await loadServiceWorkerHarness();

    const response = await harness.dispatchStateCommand({
      type: "APPLY_STATE_COMMAND",
      origin: "https://example.com",
      command: appendLogCommand("log-1", "openCamera"),
    });

    expect(response).toEqual({ ok: true });
    const stored = harness.storageBucket[STORAGE_KEY] as BridgeStorageState;
    expect(stored.origins[GLOBAL_LIBRARY_KEY].profiles.pkg01.logs[0]?.event).toBe(
      "openCamera",
    );
  });

  it("并发初始化只创建一次全局方案库", async () => {
    const harness = await loadServiceWorkerHarness();
    const results = await Promise.all([harness.ensureLibrary(), harness.ensureLibrary()]);
    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(harness.storageSet).toHaveBeenCalledTimes(1);
    expect((harness.storageBucket[STORAGE_KEY] as BridgeStorageState).origins[GLOBAL_LIBRARY_KEY]).toBeDefined();
  });

  it("缺少迁移来源时返回错误且不写入旧数据", async () => {
    const harness = await loadServiceWorkerHarness();
    const old = { globalEnabled: true, origins: { "https://other.example.com": createDefaultOriginState() } };
    harness.storageBucket[STORAGE_KEY] = old;
    const result = await harness.ensureLibrary();
    expect(result).toEqual({ ok: false, message: expect.stringContaining("未找到迁移来源") });
    expect(harness.storageSet).not.toHaveBeenCalled();
    expect(harness.storageBucket[STORAGE_KEY]).toEqual(old);
  });

  it("迁移本地方案后串行合并不同站点的命令，保留原始数据", async () => {
    const harness = await loadServiceWorkerHarness();
    const source = createDefaultOriginState();
    source.profiles.pkg01.settings.preserveLogs = true;
    const other = createDefaultOriginState();
    harness.storageBucket[STORAGE_KEY] = { globalEnabled: true, origins: { [MIGRATION_SOURCE_ORIGIN]: source, "https://other.example.com": other } };
    await Promise.all([
      harness.dispatchStateCommand({ type: "APPLY_STATE_COMMAND", origin: MIGRATION_SOURCE_ORIGIN, command: appendLogCommand("local", "first") }),
      harness.dispatchStateCommand({ type: "APPLY_STATE_COMMAND", origin: "https://other.example.com", command: appendLogCommand("test", "second") }),
    ]);
    const stored = harness.storageBucket[STORAGE_KEY] as BridgeStorageState;
    expect(stored.origins[GLOBAL_LIBRARY_KEY].profiles.pkg01.logs.map((log) => log.id)).toEqual(["test", "local"]);
    expect(stored.origins[MIGRATION_SOURCE_ORIGIN]).toEqual(source);
    expect(stored.origins["https://other.example.com"]).toEqual(other);
  });

  it("其他页面切换方案后拒绝旧方案的写入，避免写到错误方案", async () => {
    const harness = await loadServiceWorkerHarness();
    const switched = await harness.dispatchStateCommand({ type: "APPLY_STATE_COMMAND", origin: "https://a.example", command: { type: "SET_ACTIVE_PROFILE", profileId: "pkg03" } });
    expect(switched).toEqual({ ok: true });
    const stale = await harness.dispatchStateCommand({ type: "APPLY_STATE_COMMAND", origin: "https://b.example", profileId: "pkg01", command: appendLogCommand("stale", "event") });
    expect(stale).toEqual({ ok: false, message: expect.stringContaining("其他页面切换") });
    const stored = harness.storageBucket[STORAGE_KEY] as BridgeStorageState;
    expect(stored.origins[GLOBAL_LIBRARY_KEY].profiles.pkg03.logs).toEqual([]);
  });

  it("状态命令按到达顺序串行应用，不会互相覆盖", async () => {
    const harness = await loadServiceWorkerHarness();

    await Promise.all([
      harness.dispatchStateCommand({
        type: "APPLY_STATE_COMMAND",
        origin: "https://example.com",
        command: appendLogCommand("log-1", "first"),
      }),
      harness.dispatchStateCommand({
        type: "APPLY_STATE_COMMAND",
        origin: "https://example.com",
        command: appendLogCommand("log-2", "second"),
      }),
    ]);

    const stored = harness.storageBucket[STORAGE_KEY] as BridgeStorageState;
    expect(stored.origins[GLOBAL_LIBRARY_KEY].profiles.pkg01.logs.map((log) => log.id)).toEqual([
      "log-2",
      "log-1",
    ]);
  });

  it("状态写入失败时回执失败，且队列继续可用", async () => {
    const harness = await loadServiceWorkerHarness();
    harness.storageSet.mockRejectedValueOnce(new Error("Quota exceeded"));

    const failed = await harness.dispatchStateCommand({
      type: "APPLY_STATE_COMMAND",
      origin: "https://example.com",
      command: appendLogCommand("log-1", "first"),
    });

    expect(failed).toEqual({ ok: false, message: "Quota exceeded" });

    const recovered = await harness.dispatchStateCommand({
      type: "APPLY_STATE_COMMAND",
      origin: "https://example.com",
      command: appendLogCommand("log-2", "second"),
    });

    expect(recovered).toEqual({ ok: true });
    const stored = harness.storageBucket[STORAGE_KEY] as BridgeStorageState;
    expect(stored.origins[GLOBAL_LIBRARY_KEY].profiles.pkg01.logs.map((log) => log.id)).toEqual([
      "log-2",
    ]);
  });
});

function appendLogCommand(id: string, event: string): StateCommand {
  return {
    type: "APPEND_LOG",
    log: { id, timestamp: 1, type: "SEND", event, payload: {} },
  };
}

async function loadServiceWorkerHarness(): Promise<{
  dispatch: (message: PanelCommandRequest) => Promise<PanelCommandResponse>;
  dispatchStateCommand: (message: Omit<ApplyStateCommandRequest, "profileId"> & { profileId?: string }) => Promise<PanelCommandResponse>;
  ensureLibrary: () => Promise<PanelCommandResponse>;
  executeScript: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  storageSet: ReturnType<typeof vi.fn>;
  storageBucket: Record<string, unknown>;
}> {
  let runtimeMessageListener: RuntimeMessageListener | null = null;
  const sendMessage = vi.fn(() => Promise.resolve({ ok: true }));
  const executeScript = vi.fn(() => Promise.resolve([]));
  const storageBucket: Record<string, unknown> = {};
  const storageSet = vi.fn(async (items: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(items)) {
      storageBucket[key] = JSON.parse(JSON.stringify(value)) as unknown;
    }
  });

  (globalThis as typeof globalThis & { chrome: typeof chrome }).chrome = {
    runtime: {
      onMessage: {
        addListener(listener: RuntimeMessageListener) {
          runtimeMessageListener = listener;
        },
      },
    },
    scripting: {
      executeScript,
    },
    tabs: {
      sendMessage,
    },
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({
          [key]: JSON.parse(JSON.stringify(storageBucket[key] ?? null)) as unknown,
        })),
        set: storageSet,
        remove: vi.fn(async () => undefined),
      },
    },
  } as unknown as typeof chrome;

  await import("./serviceWorker");

  if (!runtimeMessageListener) {
    throw new Error("serviceWorker did not register runtime.onMessage listener");
  }

  const dispatchRaw = (
    message: unknown,
  ): Promise<PanelCommandResponse> =>
    new Promise((resolve) => {
      runtimeMessageListener?.(message, {} as chrome.runtime.MessageSender, resolve);
    });

  return {
    dispatch(message) {
      return dispatchRaw(message);
    },
    dispatchStateCommand(message) {
      return dispatchRaw({ profileId: "pkg01", ...message });
    },
    ensureLibrary() {
      return dispatchRaw({ type: "ENSURE_GLOBAL_LIBRARY" });
    },
    executeScript,
    sendMessage,
    storageSet,
    storageBucket,
  };
}
