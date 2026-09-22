import { describe, expect, it } from "vitest";
import {
  createImagePreviewUrl,
  createMockAndroidUri,
  inspectImageValue,
  readImageValueFromDetailText,
  redactImageDataForDisplay,
  suggestImageFieldPathFromText,
  suggestImageFormatFromText,
  writeImageValueToDetailText,
} from "./imageTools";

describe("imageTools", () => {
  it("会优先命中现有的 base64 图片字段", () => {
    const detailText = JSON.stringify({
      success: true,
      result: { faceImg: "old-value" },
    });

    expect(suggestImageFieldPathFromText(detailText, "base64")).toBe("result.faceImg");
  });

  it("可按点路径写入图片值", () => {
    const result = writeImageValueToDetailText('{"success":true,"result":{}}', "result.faceImg", "abc123");

    expect(result).toEqual({
      ok: true,
      detailText: JSON.stringify(
        {
          success: true,
          result: { faceImg: "abc123" },
        },
        null,
        2,
      ),
    });
  });

  it("会生成稳定的模拟 Android URI", () => {
    expect(createMockAndroidUri("My Photo.JPG")).toBe(
      "mock://selected-image/my-photo.jpg",
    );
  });

  it("没有现有图片字段时默认使用 Base64 和 data 字段", () => {
    const detailText = JSON.stringify({ success: true });

    expect(suggestImageFormatFromText(detailText)).toBe("base64");
    expect(suggestImageFieldPathFromText(detailText, "base64")).toBe("data");
  });

  it("会从已有详情中读取图片字段并生成预览地址", () => {
    const base64 = `/9j/${"A".repeat(124)}`;
    const detailText = JSON.stringify({ result: { image: base64 } });

    expect(readImageValueFromDetailText(detailText, "result.image")).toBe(base64);
    expect(suggestImageFormatFromText(detailText)).toBe("base64");
    expect(createImagePreviewUrl(base64)).toBe(`data:image/jpeg;base64,${base64}`);
    expect(inspectImageValue(base64).kind).toBe("base64");
  });

  it("可识别无损图片的短 Base64 回包", () => {
    const base64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s8MaqcAAAAASUVORK5CYII=";

    expect(inspectImageValue(base64)).toMatchObject({
      kind: "base64",
      previewUrl: `data:image/png;base64,${base64}`,
    });
  });

  it("会在日志展示中隐藏图片原文但保留图片摘要", () => {
    const base64 = `/9j/${"A".repeat(124)}`;
    const display = redactImageDataForDisplay({ image: base64 });

    expect(display).toEqual({ image: "[图片 Base64，约 96 B，原文已隐藏]" });
  });
});
