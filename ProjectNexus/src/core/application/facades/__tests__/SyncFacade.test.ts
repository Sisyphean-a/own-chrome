import { describe, expect, it, vi } from "vitest";

import type { NexusConfig } from "../../../domain/entities/types";
import { SyncFacade } from "../SyncFacade";

function createConfig(): NexusConfig {
  return {
    githubToken: "token",
    gistId: "root-gist",
    rootGistId: "root-gist",
    lastRemoteUpdatedAt: "2026-07-01T00:00:00.000Z",
    lastSyncHeadHash: "head-hash",
    shardStateDigest: { "shard-gist": "manifest-hash" },
    syncInterval: 30,
    theme: "auto",
  };
}

function createFacade() {
  const restoreFile = vi.fn();
  const restoreHistory = vi.fn();
  const restoreStore = vi.fn();
  const gistRepository = {
    rateLimit: { limit: 5000, remaining: 5000, resetAt: 0 },
    fetchGist: vi.fn().mockResolvedValue({
      updated_at: "2026-07-01T00:00:00.000Z",
    }),
    findNexusGist: vi.fn(),
  };
  const localStoreRepository = {
    saveConfig: vi.fn(),
    getConfig: vi.fn(),
    clearIndexAndCaches: vi.fn(),
    createRestorePoint: vi.fn().mockResolvedValue({ restore: restoreStore }),
  };
  const fileRepository = {
    clearAll: vi.fn(),
    createRestorePoint: vi.fn().mockResolvedValue({ restore: restoreFile }),
  };
  const historyRepository = {
    clearAll: vi.fn(),
    createRestorePoint: vi.fn().mockResolvedValue({ restore: restoreHistory }),
  };
  const syncService = {
    syncDown: vi.fn(),
  };
  const facade = new SyncFacade(
    gistRepository,
    localStoreRepository,
    fileRepository,
    historyRepository,
    syncService as any,
  );
  return {
    facade,
    gistRepository,
    localStoreRepository,
    fileRepository,
    historyRepository,
    syncService,
    restoreFile,
    restoreHistory,
    restoreStore,
  };
}

describe("SyncFacade.forcePullWorkspace", () => {
  it("使用显式选项执行完整远程拉取", async () => {
    const deps = createFacade();
    const result = { synced: true, index: null };
    deps.syncService.syncDown.mockResolvedValue(result);

    await expect(
      deps.facade.forcePullWorkspace(createConfig()),
    ).resolves.toBe(result);

    expect(deps.syncService.syncDown).toHaveBeenCalledWith(
      expect.objectContaining({ rootGistId: "root-gist" }),
      null,
      { forceFullShardPull: true },
    );
    expect(deps.fileRepository.clearAll).toHaveBeenCalledTimes(1);
    expect(deps.historyRepository.clearAll).toHaveBeenCalledTimes(1);
    expect(deps.localStoreRepository.clearIndexAndCaches).toHaveBeenCalledTimes(1);
    expect(deps.restoreFile).not.toHaveBeenCalled();
  });

  it("远程拉取失败时恢复全部本地存储", async () => {
    const deps = createFacade();
    const syncError = new Error("remote unavailable");
    deps.syncService.syncDown.mockRejectedValue(syncError);

    await expect(
      deps.facade.forcePullWorkspace(createConfig()),
    ).rejects.toBe(syncError);

    expect(deps.restoreFile).toHaveBeenCalledTimes(1);
    expect(deps.restoreHistory).toHaveBeenCalledTimes(1);
    expect(deps.restoreStore).toHaveBeenCalledTimes(1);
  });

  it("本地恢复失败时显式报告同步错误和恢复错误", async () => {
    const deps = createFacade();
    deps.syncService.syncDown.mockRejectedValue(new Error("sync failed"));
    deps.restoreStore.mockRejectedValue(new Error("restore failed"));

    const operation = deps.facade.forcePullWorkspace(createConfig());

    await expect(operation).rejects.toMatchObject({
      name: "AggregateError",
      message: "强制拉取失败，且本地数据恢复不完整",
    });
  });

  it("等待全部清空任务结束后才开始恢复", async () => {
    const deps = createFacade();
    const clearError = new Error("file clear failed");
    let finishHistoryClear!: () => void;
    deps.fileRepository.clearAll.mockRejectedValue(clearError);
    deps.historyRepository.clearAll.mockReturnValue(
      new Promise<void>((resolve) => {
        finishHistoryClear = resolve;
      }),
    );

    const operation = deps.facade.forcePullWorkspace(createConfig());
    await vi.waitFor(() => {
      expect(deps.fileRepository.clearAll).toHaveBeenCalledTimes(1);
      expect(deps.historyRepository.clearAll).toHaveBeenCalledTimes(1);
    });
    expect(deps.restoreHistory).not.toHaveBeenCalled();

    finishHistoryClear();

    await expect(operation).rejects.toMatchObject({
      name: "AggregateError",
      message: "强制拉取前清空本地数据失败",
    });
    expect(deps.restoreFile).toHaveBeenCalledTimes(1);
    expect(deps.restoreHistory).toHaveBeenCalledTimes(1);
    expect(deps.restoreStore).toHaveBeenCalledTimes(1);
    expect(deps.syncService.syncDown).not.toHaveBeenCalled();
  });
});
