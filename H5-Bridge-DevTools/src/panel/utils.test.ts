import { describe, expect, it } from "vitest";
import { createResponseDraft, isResponseDraftDirty } from "./utils";
import { createResponse } from "../test/factories";

describe("isResponseDraftDirty", () => {
  it("键序不同但内容一致时不算未保存（存储侧会重排键）", () => {
    const response = createResponse("resp-1", {
      name: "拍照成功",
      detail: { data: "typed", success: true, uri: "mock://a" },
    });
    const draft = {
      ...createResponseDraft("sender-1", response),
      detailText: JSON.stringify({ success: true, uri: "mock://a", data: "typed" }, null, 2),
    };

    expect(isResponseDraftDirty(draft, response)).toBe(false);
  });

  it("名称带首尾空格时不算未保存（保存会 trim）", () => {
    const response = createResponse("resp-1", { name: "拍照成功" });
    const draft = { ...createResponseDraft("sender-1", response), name: " 拍照成功 " };

    expect(isResponseDraftDirty(draft, response)).toBe(false);
  });

  it("内容真的变了或是非法 JSON 时算未保存", () => {
    const response = createResponse("resp-1", { detail: { data: "old" } });
    const draft = createResponseDraft("sender-1", response);

    expect(isResponseDraftDirty({ ...draft, detailText: '{"data":"new"}' }, response)).toBe(true);
    expect(isResponseDraftDirty({ ...draft, delayMs: "999" }, response)).toBe(true);
    expect(isResponseDraftDirty({ ...draft, detailText: "{bad" }, response)).toBe(true);
  });
});
