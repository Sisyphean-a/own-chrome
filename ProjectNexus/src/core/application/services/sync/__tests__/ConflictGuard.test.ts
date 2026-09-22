import { describe, expect, it, vi } from "vitest";
import { ConflictGuard } from "../ConflictGuard";

function createRepo() {
  return {
    fetchGist: vi.fn(),
    getGistFilesByNames: vi.fn(),
  };
}

describe("ConflictGuard", () => {
  it("在远端时间更新时抛出同步冲突", async () => {
    const gistRepo = createRepo();
    gistRepo.fetchGist.mockResolvedValue({
      updated_at: "2026-03-01T00:00:00.000Z",
    });
    const guard = new ConflictGuard(gistRepo as any);

    await expect(
      guard.assertCanPush("root-1", "2026-01-01T00:00:00.000Z"),
    ).rejects.toThrow("同步冲突");
  });

  it("在无法确认远端状态时显式失败", async () => {
    const gistRepo = createRepo();
    gistRepo.fetchGist.mockRejectedValue(new Error("network down"));
    const guard = new ConflictGuard(gistRepo as any);

    await expect(
      guard.assertCanPush("root-1", "2026-01-01T00:00:00.000Z"),
    ).rejects.toThrow("无法确认远端最新状态");
  });

  it("远程索引内容变化时中止最终写入", async () => {
    const gistRepo = createRepo();
    gistRepo.getGistFilesByNames.mockResolvedValue({
      "nexus_index_v2.json": {
        content: JSON.stringify({
          version: 2,
          updated_at: "2026-07-01T00:00:02.000Z",
          categories: [{ id: "other-device", name: "Other", items: [] }],
        }),
      },
    });
    const guard = new ConflictGuard(gistRepo as any);

    await expect(
      guard.assertIndexUnchanged("root-1", {
        version: 2,
        updated_at: "2026-07-01T00:00:01.000Z",
        categories: [],
      }),
    ).rejects.toThrow("远程索引已被其他设备更新");
  });
});
