import { describe, expect, it } from "vitest";
import {
  buildImageFieldSuggestionsFromText,
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

  it("父级字段是对象时会落到内部的图片字段，而不是覆盖对象", () => {
    const base64 = `/9j/${"A".repeat(5000)}`;
    const detailText = JSON.stringify({
      action: "openCamera",
      data: {
        data: base64,
        success: true,
        uri: "mock://camera/photo-001.jpg",
      },
    });

    expect(suggestImageFormatFromText(detailText)).toBe("base64");
    expect(suggestImageFieldPathFromText(detailText, "base64")).toBe("data.data");
    expect(suggestImageFieldPathFromText(detailText, "androidUri")).toBe("data.uri");
  });

  it("字段本身是字符串 data 时仍然推荐 data", () => {
    const detailText = JSON.stringify({
      success: true,
      data: `/9j/${"A".repeat(124)}`,
    });

    expect(suggestImageFieldPathFromText(detailText, "base64")).toBe("data");
  });

  it("字段建议会列出所有字段并标注类型和推荐项", () => {
    const base64 = `/9j/${"A".repeat(124)}`;
    const detailText = JSON.stringify({
      action: "openCamera",
      data: { data: base64, success: true, uri: "mock://camera/photo-001.jpg" },
    });
    const suggestions = buildImageFieldSuggestionsFromText(detailText, "base64");
    const byPath = new Map(suggestions.map((item) => [item.path, item]));

    expect(byPath.get("data")?.label).toBe("对象 · 3 个字段");
    expect(byPath.get("data.data")?.label).toContain("Base64");
    expect(byPath.get("data.data")?.recommended).toBe(true);
    expect(byPath.get("data.success")?.label).toBe("布尔");
    expect(byPath.get("data.uri")?.label).toBe("URI");
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

  it("写入对象字段时显式报错，且不覆盖原 JSON", () => {
    const detailText = JSON.stringify({
      action: "openCamera",
      data: { data: "old", success: true },
    });
    const result = writeImageValueToDetailText(detailText, "data", "new-image");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("对象");
    }
  });

  it("中间字段不是对象时报错，不会把字符串改写成对象", () => {
    const result = writeImageValueToDetailText(
      '{"data":"abc","success":true}',
      "data.data",
      "new-image",
    );

    expect(result.ok).toBe(false);
  });

  it("写入子字段时保留同级字段", () => {
    const detailText = JSON.stringify({
      data: { data: "old", success: true, uri: "mock://camera/photo-001.jpg" },
    });
    const result = writeImageValueToDetailText(detailText, "data.data", "new-image");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.detailText)).toEqual({
        data: { data: "new-image", success: true, uri: "mock://camera/photo-001.jpg" },
      });
    }
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
