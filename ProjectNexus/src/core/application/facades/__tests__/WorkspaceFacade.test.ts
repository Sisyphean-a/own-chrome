import { describe, expect, it, vi } from "vitest";

import type { NexusConfig, NexusIndex } from "../../../domain/entities/types";
import { WorkspaceFacade } from "../WorkspaceFacade";

function createContext() {
  const index: NexusIndex = {
    version: 2,
    updated_at: "2026-07-01T00:00:00.000Z",
    categories: [
      {
        id: "category-1",
        name: "Category 1",
        items: [
          {
            id: "file-1",
            title: "File 1",
            gist_file: "file-1.yaml",
            language: "yaml",
            storage: {
              shardId: "shard-1",
              gistId: "shard-gist-1",
              gist_file: "file-1.yaml",
            },
          },
        ],
      },
    ],
    shards: [],
  };
  const config: NexusConfig = {
    githubToken: "token",
    gistId: "root-gist",
    rootGistId: "root-gist",
    syncInterval: 30,
    theme: "auto",
  };
  return {
    index,
    config,
    lastRemoteUpdatedAt: "2026-07-01T00:00:00.000Z",
  };
}

function createFacade() {
  const localStore = {
    getConfig: vi.fn(),
    getIndex: vi.fn(),
    saveConfig: vi.fn(),
  };
  const fileRepo = {
    get: vi.fn(),
    delete: vi.fn(),
  };
  const historyRepo = {
    deleteFileHistory: vi.fn(),
  };
  const syncService = {
    pushIndex: vi.fn(),
    assertCanPush: vi.fn(),
    assertRemoteIndexUnchanged: vi.fn(),
    deleteRemoteFile: vi.fn(),
  };
  const facade = new WorkspaceFacade(
    localStore as any,
    fileRepo as any,
    historyRepo as any,
    syncService as any,
    {} as any,
  );
  return { facade, fileRepo, historyRepo, syncService };
}

describe("WorkspaceFacade.deleteCategory", () => {
  it("删除最后分类时仍执行冲突检查并串联最新远程时间", async () => {
    const deps = createFacade();
    const ctx = createContext();
    deps.syncService.pushIndex
      .mockResolvedValueOnce("2026-07-01T00:00:01.000Z")
      .mockResolvedValueOnce("2026-07-01T00:00:03.000Z");
    deps.syncService.deleteRemoteFile.mockResolvedValue(
      "2026-07-01T00:00:02.000Z",
    );

    const result = await deps.facade.deleteCategory(ctx, "category-1");

    expect(result).toEqual({
      deletedFiles: 1,
      failedFiles: [],
      newRemoteTime: "2026-07-01T00:00:03.000Z",
    });
    expect(deps.syncService.pushIndex.mock.calls[0]).toEqual([
      "root-gist",
      ctx.index,
      "2026-07-01T00:00:00.000Z",
    ]);
    expect(deps.syncService.pushIndex.mock.calls[1]).toEqual([
      "root-gist",
      ctx.index,
      "2026-07-01T00:00:02.000Z",
    ]);
    expect(
      deps.syncService.pushIndex.mock.calls.every((call) => call[3] !== true),
    ).toBe(true);
    expect(deps.syncService.assertCanPush).toHaveBeenCalledWith(
      "root-gist",
      "2026-07-01T00:00:01.000Z",
    );
    expect(deps.syncService.assertRemoteIndexUnchanged).toHaveBeenCalledWith(
      "root-gist",
      expect.objectContaining({ categories: [] }),
    );
  });

  it("首次远程冲突时恢复内存分类且不清理文件", async () => {
    const deps = createFacade();
    const ctx = createContext();
    const conflict = new Error("检测到同步冲突！远程数据已被其他设备更新。");
    deps.syncService.pushIndex.mockRejectedValue(conflict);

    await expect(
      deps.facade.deleteCategory(ctx, "category-1"),
    ).rejects.toBe(conflict);

    expect(ctx.index.categories.map((category) => category.id)).toEqual([
      "category-1",
    ]);
    expect(deps.fileRepo.delete).not.toHaveBeenCalled();
    expect(deps.syncService.deleteRemoteFile).not.toHaveBeenCalled();
  });

  it("分类清理前发现并发更新时不继续删除或最终覆盖", async () => {
    const deps = createFacade();
    const ctx = createContext();
    const conflict = new Error("检测到同步冲突！远程数据已被其他设备更新。");
    deps.syncService.pushIndex
      .mockResolvedValueOnce("2026-07-01T00:00:01.000Z")
      .mockRejectedValueOnce(conflict);
    deps.syncService.assertCanPush.mockRejectedValue(conflict);

    await expect(
      deps.facade.deleteCategory(ctx, "category-1"),
    ).rejects.toBe(conflict);
    expect(deps.fileRepo.delete).not.toHaveBeenCalled();
    expect(deps.syncService.deleteRemoteFile).not.toHaveBeenCalled();
    expect(deps.syncService.pushIndex).toHaveBeenCalledTimes(2);
  });

  it("清理写入掩盖并发时间时仍通过索引内容阻止最终覆盖", async () => {
    const deps = createFacade();
    const ctx = createContext();
    const conflict = new Error("检测到同步冲突！远程索引已被其他设备更新。");
    deps.syncService.pushIndex.mockResolvedValue(
      "2026-07-01T00:00:01.000Z",
    );
    deps.syncService.deleteRemoteFile.mockResolvedValue(
      "2026-07-01T00:00:03.000Z",
    );
    deps.syncService.assertRemoteIndexUnchanged.mockRejectedValue(conflict);

    await expect(
      deps.facade.deleteCategory(ctx, "category-1"),
    ).rejects.toBe(conflict);

    expect(deps.syncService.assertCanPush).toHaveBeenCalledWith(
      "root-gist",
      "2026-07-01T00:00:01.000Z",
    );
    expect(deps.syncService.deleteRemoteFile).toHaveBeenCalledTimes(1);
    expect(deps.syncService.pushIndex).toHaveBeenCalledTimes(1);
  });
});
