import { formatJson, safeParseJson } from "../shared/json";

export type ImageValueFormat = "androidUri" | "base64";

export type ImageValueKind = "empty" | "base64" | "dataUrl" | "uri" | "text";

export interface ImageValueInspection {
  kind: ImageValueKind;
  previewUrl: string | null;
  sizeBytes: number | null;
}

const imageFieldPattern = /(uri|path|base64|image|img|photo|face|data)/i;
const preferredFieldNames: Record<ImageValueFormat, string[]> = {
  androidUri: ["uri", "path", "imageUri", "filePath"],
  base64: ["data", "base64", "faceImg", "imageBase64", "image", "img", "photo"],
};
const IMAGE_DISPLAY_REDACTION_THRESHOLD = 128;
const fallbackFieldNames = ["uri", "data", "faceImg", "base64", "image"];

export function buildImageFieldSuggestionsFromText(
  detailText: string,
  format: ImageValueFormat,
): string[] {
  const parsed = safeParseJson(detailText);
  const discovered = parsed.ok ? collectImageFieldPaths(parsed.value) : [];
  return Array.from(
    new Set([...discovered, ...preferredFieldNames[format], ...fallbackFieldNames]),
  );
}

export function createMockAndroidUri(fileName: string): string {
  const sanitized = fileName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "_");
  return `mock://selected-image/${sanitized || "image"}`;
}

export function readImageValueFromDetailText(
  detailText: string,
  fieldPath: string,
): string | undefined {
  const parsed = safeParseJson(detailText);
  if (!parsed.ok) {
    return undefined;
  }

  const segments = fieldPath
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
  let current: unknown = parsed.value;
  for (const segment of segments) {
    if (!isPlainObject(current)) {
      return undefined;
    }
    current = current[segment];
  }

  return typeof current === "string" ? current : undefined;
}

export function inspectImageValue(imageValue: string | undefined): ImageValueInspection {
  const value = imageValue?.trim() ?? "";
  if (!value) {
    return { kind: "empty", previewUrl: null, sizeBytes: null };
  }

  const dataUrlMatch = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/is);
  if (dataUrlMatch) {
    const payload = normalizeBase64(dataUrlMatch[2]);
    return {
      kind: "dataUrl",
      previewUrl: value,
      sizeBytes: estimateBase64Bytes(payload),
    };
  }

  if (isUriValue(value)) {
    return { kind: "uri", previewUrl: null, sizeBytes: null };
  }

  const payload = normalizeBase64(value);
  if (!isLikelyBase64(payload)) {
    return { kind: "text", previewUrl: null, sizeBytes: null };
  }

  return {
    kind: "base64",
    previewUrl: `data:${detectImageMimeType(payload)};base64,${payload}`,
    sizeBytes: estimateBase64Bytes(payload),
  };
}

export function createImagePreviewUrl(imageValue: string | undefined): string | null {
  return inspectImageValue(imageValue).previewUrl;
}

export function formatImageByteSize(sizeBytes: number | null): string {
  if (sizeBytes === null) {
    return "未知大小";
  }
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

/**
 * 用于日志和只读摘要：隐藏图片原文，但不改变规则和回放使用的原始值。
 */
export function redactImageDataForDisplay(value: unknown): unknown {
  return redactImageDataNode(value);
}

export async function convertImageFileToValue(
  file: File,
  format: ImageValueFormat,
): Promise<string> {
  if (format === "androidUri") {
    return createMockAndroidUri(file.name);
  }
  return readFileAsBase64(file);
}

export function suggestImageFormatFromText(detailText: string): ImageValueFormat {
  const parsed = safeParseJson(detailText);
  if (!parsed.ok) {
    return "base64";
  }

  const paths = collectImageFieldPaths(parsed.value);
  const base64Path = findPreferredField(paths, preferredFieldNames.base64);
  if (base64Path) {
    const currentValue = readValueAtPath(parsed.value, base64Path);
    return typeof currentValue === "string" && inspectImageValue(currentValue).kind === "uri"
      ? "androidUri"
      : "base64";
  }

  return findPreferredField(paths, preferredFieldNames.androidUri) ? "androidUri" : "base64";
}

export function suggestImageFieldPathFromText(
  detailText: string,
  format: ImageValueFormat,
): string {
  const parsed = safeParseJson(detailText);
  if (!parsed.ok) {
    return preferredFieldNames[format][0];
  }
  return suggestImageFieldPath(parsed.value, format);
}

export function writeImageValueToDetailText(
  detailText: string,
  fieldPath: string,
  imageValue: string,
): { ok: true; detailText: string } | { ok: false; error: string } {
  const parsed = safeParseJson(detailText);
  if (!parsed.ok) {
    return { ok: false, error: `Detail JSON 无效: ${parsed.error}` };
  }

  const next = setImageValueInDetail(parsed.value, fieldPath, imageValue);
  if (next.ok === false) {
    return { ok: false, error: next.error };
  }

  return { ok: true, detailText: formatJson(next.value) };
}

function readValueAtPath(detail: unknown, fieldPath: string): unknown {
  const segments = fieldPath
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
  let current = detail;
  for (const segment of segments) {
    if (!isPlainObject(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function collectImageFieldPaths(detail: unknown, prefix = ""): string[] {
  if (!isPlainObject(detail)) {
    return [];
  }

  const paths: string[] = [];
  for (const [key, value] of Object.entries(detail)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (imageFieldPattern.test(key)) {
      paths.push(path);
    }
    paths.push(...collectImageFieldPaths(value, path));
  }
  return paths;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readFileAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("图片读取失败"));
        return;
      }
      resolve(reader.result.split(",", 2)[1] ?? "");
    };
    reader.readAsDataURL(file);
  });
}

function setImageValueInDetail(
  detail: unknown,
  fieldPath: string,
  imageValue: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  const segments = fieldPath
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return { ok: false, error: "图片字段不能为空" };
  }
  if (!isPlainObject(detail)) {
    return { ok: false, error: "Detail JSON 必须是对象，图片工具才能写入字段" };
  }
  return { ok: true, value: updateFieldPath(detail, segments, imageValue) };
}

function suggestImageFieldPath(detail: unknown, format: ImageValueFormat): string {
  const paths = collectImageFieldPaths(detail);
  const matched = findPreferredField(paths, preferredFieldNames[format]);
  if (matched) {
    return matched;
  }
  return paths[0] ?? preferredFieldNames[format][0];
}

function updateFieldPath(
  source: Record<string, unknown>,
  segments: string[],
  imageValue: string,
): Record<string, unknown> {
  const [head, ...rest] = segments;
  if (!head) {
    return source;
  }
  if (rest.length === 0) {
    return { ...source, [head]: imageValue };
  }

  const current = source[head];
  const nested = isPlainObject(current) ? current : {};
  return {
    ...source,
    [head]: updateFieldPath(nested, rest, imageValue),
  };
}

function findPreferredField(paths: string[], names: string[]): string | undefined {
  return paths.find((path) => names.some((name) => path === name || path.endsWith(`.${name}`)));
}

function redactImageDataNode(value: unknown, keyHint?: string): unknown {
  if (typeof value === "string") {
    const inspection = inspectImageValue(value);
    if (
      value.length >= IMAGE_DISPLAY_REDACTION_THRESHOLD &&
      (Boolean(keyHint && imageFieldPattern.test(keyHint)) ||
        inspection.kind === "base64" ||
        inspection.kind === "dataUrl") &&
      (inspection.kind === "base64" || inspection.kind === "dataUrl")
    ) {
      return `[图片 ${inspection.kind === "dataUrl" ? "Data URL" : "Base64"}，约 ${formatImageByteSize(inspection.sizeBytes)}，原文已隐藏]`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactImageDataNode(item, keyHint));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactImageDataNode(item, key)]),
  );
}

function isUriValue(value: string): boolean {
  return /^(?:mock|https?|file|content|blob):\/\//i.test(value);
}

function normalizeBase64(value: string): string {
  return value.replace(/\s+/g, "");
}

function isLikelyBase64(value: string): boolean {
  return (
    value.length >= 16 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(value) &&
    value.length % 4 === 0
  );
}

function estimateBase64Bytes(value: string): number {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((value.length * 3) / 4) - padding);
}

function detectImageMimeType(value: string): string {
  if (value.startsWith("/9j/")) {
    return "image/jpeg";
  }
  if (value.startsWith("iVBORw0KGgo")) {
    return "image/png";
  }
  if (value.startsWith("R0lGOD")) {
    return "image/gif";
  }
  if (value.startsWith("UklGR")) {
    return "image/webp";
  }
  if (value.startsWith("Qk")) {
    return "image/bmp";
  }
  if (value.startsWith("PHN2Zy") || value.startsWith("PD94bWwg")) {
    return "image/svg+xml";
  }
  return "image/jpeg";
}
