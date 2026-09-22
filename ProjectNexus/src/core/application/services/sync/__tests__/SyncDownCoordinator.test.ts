import { describe, expect, it, vi } from "vitest";

import type { NexusConfig, NexusIndex } from "../../../../domain/entities/types";
import {
  NEXUS_INDEX_V2_FILENAME,
  NEXUS_SHARD_STATE_FILENAME,
} from "../SyncConstants";
import { SyncDownCoordinator } from "../SyncDownCoordinator";
import { ShardStateService } from "../ShardStateService";

function createConfig(): NexusConfig {
  return {
    githubToken: "token",
    gistId: "root-gist",
    rootGistId: "root-gist",
    schemaVersion: 3,
    lastRemoteUpdatedAt: "2026-07-01T00:00:00.000Z",
    lastSyncHeadHash: "unchanged-head",
    shardStateDigest: {
      "shard-a": "hash-a",
      "shard-b": "hash-b",
    },
    syncInterval: 30,
    theme: "auto",
  };
}

function createRemoteIndex(): NexusIndex {
  return {
    version: 2,
    updated_at: "2026-07-01T00:00:00.000Z",
    categories: [],
    shards: [
      {
        id: "shard-a",
        gistId: "shard-a",
        part: 1,
        kind: "large",
        fileCount: 1,
        totalBytes: 10,
        updated_at: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "shard-b",
        gistId: "shard-b",
        part: 1,
        kind: "large",
        fileCount: 1,
        totalBytes: 10,
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    ],
  };
}

describe("SyncDownCoordinator full pull", () => {
  it("远程状态缺少分片行时仍选择 index 中的全部分片", async () => {
    const remoteIndex = createRemoteIndex();
    const remoteState = {
      version: 1 as const,
      updated_at: "2026-07-01T00:00:00.000Z",
      shards: [
        {
          shardId: "shard-a",
          gistId: "shard-a",
          manifestHash: "hash-a",
          updated_at: "2026-07-01T00:00:00.000Z",
          fileCount: 1,
          totalBytes: 10,
        },
      ],
    };
    const pullShardChanges = vi.fn();
    const localStore = { saveIndex: vi.fn() };
    const coordinator = new SyncDownCoordinator({
      gistRepo: {
        findNexusGist: vi.fn(),
        getGistFilesByNames: vi.fn().mockResolvedValue({
          [NEXUS_INDEX_V2_FILENAME]: {
            content: JSON.stringify(remoteIndex),
          },
          [NEXUS_SHARD_STATE_FILENAME]: {
            content: JSON.stringify(remoteState),
          },
        }),
      },
      localStore,
      shardStateService: new ShardStateService(),
      pullShardChanges,
      migrateLegacyToV2: vi.fn(),
      resolveAccessibleRootGist: vi.fn().mockResolvedValue({
        rootGistId: "root-gist",
        rootMeta: { updated_at: "2026-07-01T00:00:00.000Z" },
      }),
      ensureV2Index: (index) => index,
      parseShards: (_raw, fallback) => fallback,
      hydrateShardCategoryNames: vi.fn(),
      createRootConfigUpdate: vi.fn(),
    });

    const result = await coordinator.syncDown(createConfig(), null, {
      forceFullShardPull: true,
    });

    expect(result.synced).toBe(true);
    expect(pullShardChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        shards: expect.arrayContaining([
          expect.objectContaining({ gistId: "shard-a" }),
          expect.objectContaining({ gistId: "shard-b" }),
        ]),
      }),
      null,
    );
    expect(localStore.saveIndex).toHaveBeenCalledTimes(1);
  });
});
