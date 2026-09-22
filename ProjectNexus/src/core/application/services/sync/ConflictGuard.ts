import type { IGistRepository } from "../../ports/IGistRepository";
import type { NexusIndex } from "../../../domain/entities/types";
import {
  NEXUS_INDEX_FILENAME,
  NEXUS_INDEX_V2_FILENAME,
} from "./SyncConstants";

export class ConflictGuard {
  constructor(
    private readonly gistRepo: Pick<
      IGistRepository,
      "fetchGist" | "getGistFilesByNames"
    >,
  ) {}

  async assertCanPush(
    gistId: string,
    lastKnownRemoteTime: string | null,
  ): Promise<void> {
    try {
      const meta = await this.gistRepo.fetchGist(gistId);
      const remoteTime = new Date(meta.updated_at).getTime();
      const localTime = lastKnownRemoteTime
        ? new Date(lastKnownRemoteTime).getTime()
        : 0;

      if (remoteTime > localTime) {
        throw new Error("检测到同步冲突！远程数据已被其他设备更新。");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("同步冲突")) {
        throw error;
      }

      throw new Error("无法确认远端最新状态，已中止写入。", {
        cause: error,
      });
    }
  }

  async assertIndexUnchanged(
    gistId: string,
    expectedIndex: NexusIndex,
  ): Promise<void> {
    const filename = (expectedIndex.version || 1) >= 2
      ? NEXUS_INDEX_V2_FILENAME
      : NEXUS_INDEX_FILENAME;
    try {
      const files = await this.gistRepo.getGistFilesByNames(gistId, [filename]);
      const content = files[filename]?.content;
      const remoteIndex = content ? JSON.parse(content) : null;
      if (JSON.stringify(remoteIndex) !== JSON.stringify(expectedIndex)) {
        throw new Error("检测到同步冲突！远程索引已被其他设备更新。");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("同步冲突")) {
        throw error;
      }
      throw new Error("无法确认远端索引状态，已中止写入。", {
        cause: error,
      });
    }
  }
}
