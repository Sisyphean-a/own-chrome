import { beforeEach, describe, expect, it } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import { STORAGE_KEY } from "../shared/constants";
import { createDefaultOriginState } from "../shared/storage";
import { createSender } from "../test/factories";
import { loadSnapshotForTab, sendPanelCommand } from "./runtimeBridge";
import type { AppViewState, ToastState } from "./types";

const origin = "https://example.com";
let storageBucket: Record<string, unknown>;

beforeEach(() => {
  const originState = createDefaultOriginState();
  originState.profiles.pkg01.senders = [createSender("sender-1", { name: "登录发送" })];
  storageBucket = {
    [STORAGE_KEY]: {
      globalEnabled: true,
      origins: {
        [origin]: originState,
      },
    },
  };
  installChromeMock();
});

describe("loadSnapshotForTab", () => {
  it("会按当前 tab URL 读取对应 origin 的快照", async () => {
    const snapshot = await loadSnapshotForTab(7);

    expect(snapshot?.origin).toBe(origin);
    expect(snapshot?.href).toBe(`${origin}/page-a`);
    expect(snapshot?.senders[0]?.name).toBe("登录发送");
  });

  it("tab 没有 URL 时返回 null", async () => {
    chrome.tabs.get = async () => ({ id: 7 } as chrome.tabs.Tab);

    await expect(loadSnapshotForTab(7)).resolves.toBeNull();
  });
});

describe("sendPanelCommand", () => {
  it("内容脚本回执失败时把真实错误提示出来，并返回失败", async () => {
    const runtimeMessages = installRuntimeMessageMock({
      ok: false,
      message: "存储写入失败",
    });
    const channel = createStateChannel();

    const response = await sendPanelCommand(
      { type: "PANEL_COMMAND", tabId: 7, command: { type: "CLEAR_LOGS" } },
      channel.setState,
    );

    expect(runtimeMessages).toHaveLength(1);
    expect(response).toEqual({ ok: false, message: "存储写入失败" });
    expect(channel.lastToast()).toEqual({ level: "error", message: "存储写入失败" });
  });

  it("命令成功时不弹错误提示，并返回成功", async () => {
    installRuntimeMessageMock({ ok: true });
    const channel = createStateChannel();

    const response = await sendPanelCommand(
      { type: "PANEL_COMMAND", tabId: 7, command: { type: "CLEAR_LOGS" } },
      channel.setState,
    );

    expect(response).toEqual({ ok: true });
    expect(channel.toasts).toEqual([]);
  });
});

function createStateChannel(): {
  setState: Dispatch<SetStateAction<AppViewState>>;
  toasts: Array<ToastState | null>;
  lastToast: () => ToastState | null;
} {
  let state = { toast: null } as AppViewState;
  const toasts: Array<ToastState | null> = [];
  return {
    setState(updater) {
      state = typeof updater === "function" ? updater(state) : updater;
      toasts.push(state.toast);
    },
    toasts,
    lastToast: () => toasts.at(-1) ?? null,
  };
}

function installRuntimeMessageMock(
  response: { ok: true } | { ok: false; message: string },
): unknown[] {
  const messages: unknown[] = [];
  (globalThis as typeof globalThis & { chrome: typeof chrome }).chrome = {
    ...(globalThis.chrome ?? {}),
    runtime: {
      id: "test-extension",
      async sendMessage(message: unknown) {
        messages.push(message);
        return response;
      },
    },
  } as unknown as typeof chrome;
  return messages;
}

function installChromeMock(): void {
  (globalThis as typeof globalThis & { chrome: typeof chrome }).chrome = {
    tabs: {
      async get() {
        return {
          id: 7,
          url: `${origin}/page-a`,
        } as chrome.tabs.Tab;
      },
    },
    storage: {
      local: {
        async get(key: string) {
          return { [key]: cloneValue(storageBucket[key]) };
        },
      },
    },
  } as unknown as typeof chrome;
}

function cloneValue<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}
