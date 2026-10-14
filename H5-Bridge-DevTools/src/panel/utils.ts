import type { BridgeSender, BridgeResponseOption } from "../shared/senderTypes";
import { formatJson, safeParseJson } from "../shared/json";
import type { ManualEmitDraft, ResponseDraft, SenderDraft } from "./types";

export function createSenderDraft(sender: BridgeSender): SenderDraft {
  return {
    id: sender.id,
    name: sender.name,
    matchEvent: sender.matchEvent,
  };
}

export function createResponseDraft(senderId: string, response: BridgeResponseOption): ResponseDraft {
  return {
    senderId,
    id: response.id,
    name: response.name,
    delayMs: String(response.delayMs),
    mode: response.mode,
    eventName: response.eventName,
    detailText: formatJson(response.detail),
  };
}

export function formatResponseDraftJson(draft: ResponseDraft): ResponseDraft {
  const parsed = safeParseJson(draft.detailText);
  if (!parsed.ok) {
    return draft;
  }

  return {
    ...draft,
    detailText: formatJson(parsed.value),
  };
}

/**
 * Rule：与保存时的归一化一致（名称/事件名 trim、Detail 按格式化后的值比较），
 * 用于提示“草稿未保存”、阻断基于旧值的触发测试，并区分自己的保存与真正的远端更新。
 * Guarantee：草稿已经落盘时返回 false，不会把已保存内容误报成未保存。
 */
export function isResponseDraftDirty(
  draft: ResponseDraft,
  response: BridgeResponseOption,
): boolean {
  if (
    draft.name.trim() !== response.name ||
    draft.eventName.trim() !== response.eventName ||
    draft.mode !== response.mode ||
    draft.delayMs !== String(response.delayMs)
  ) {
    return true;
  }

  const parsedDetail = safeParseJson(draft.detailText);
  return (
    !parsedDetail.ok ||
    stableJson(parsedDetail.value) !== stableJson(response.detail)
  );
}

/**
 * Rule：写入存储时会重排对象键（sanitizeForStorage），比较 JSON 值必须忽略键序，
 * 否则刚保存的内容会被当成“未保存/远端更新”。
 */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item as Record<string, unknown>).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        )
      : item,
  );
}

export function createManualEmitDraft(): ManualEmitDraft {
  return {
    eventName: "",
    detailText: formatJson({}),
  };
}

export function formatManualEmit(draft: ManualEmitDraft): ManualEmitDraft {
  const parsed = safeParseJson(draft.detailText);
  if (!parsed.ok) {
    return draft;
  }

  return {
    ...draft,
    detailText: formatJson(parsed.value),
  };
}
