import { formatJson, safeParseJson } from "../shared/json";

export type ImageValueFormat = "androidUri" | "base64";

export type ImageValueKind = "empty" | "base64" | "dataUrl" | "uri" | "text";

export interface ImageValueInspection {
  kind: ImageValueKind;
  previewUrl: string | null;
  sizeBytes: number | null;
}

export interface ImageFieldSuggestion {
  path: string;
  label: string;
  recommended: boolean;
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
): ImageFieldSuggestion[] {
  const parsed = safeParseJson(detailText);
  const entries = parsed.ok ? collectFieldEntries(parsed.value) : [];
  const recommendedPath =
    (parsed.ok ? pickBestImageField(parsed.value, format) : undefined) ??
    preferredFieldNames[format][0];
  const existingPaths = new Set(entries.map((entry) => entry.path));
  const ordered = entries
    .map((entry, index) => ({
      entry,
      index,
      score: scoreImageField(entry.path, entry.value, format),
    }))
    .sort((left, right) => {
      const recommendedDiff =
        Number(right.entry.path === recommendedPath) -
        Number(left.entry.path === recommendedPath);
      if (recommendedDiff !== 0) {
        return recommendedDiff;
      }
      const leftScore = left.score ?? Number.NEGATIVE_INFINITY;
      const rightScore = right.score ?? Number.NEGATIVE_INFINITY;
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
      return left.index - right.index;
    });

  const suggestions: ImageFieldSuggestion[] = ordered.map(({ entry }) => ({
    path: entry.path,
    label: describeFieldValue(entry.value),
    recommended: entry.path === recommendedPath,
  }));

  if (!existingPaths.has(recommendedPath)) {
    suggestions.unshift({ path: recommendedPath, label: "新建字段", recommended: true });
    existingPaths.add(recommendedPath);
  }
  for (const path of [...preferredFieldNames[format], ...fallbackFieldNames]) {
    if (existingPaths.has(path)) {
      continue;
    }
    existingPaths.add(path);
    suggestions.push({ path, label: "新建字段", recommended: false });
  }
  return suggestions;
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

  const segments = parseFieldPath(fieldPath);
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

  const base64Path = pickBestImageField(parsed.value, "base64");
  if (base64Path) {
    const currentValue = readValueAtPath(parsed.value, base64Path);
    return typeof currentValue === "string" && inspectImageValue(currentValue).kind === "uri"
      ? "androidUri"
      : "base64";
  }

  return pickBestImageField(parsed.value, "androidUri") ? "androidUri" : "base64";
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

  const segments = parseFieldPath(fieldPath);
  if (segments.length === 0) {
    return { ok: false, error: "图片字段不能为空" };
  }
  if (!isPlainObject(parsed.value)) {
    return { ok: false, error: "Detail JSON 必须是对象，图片工具才能写入字段" };
  }

  const conflict = findWriteConflict(parsed.value, segments);
  if (conflict) {
    return { ok: false, error: conflict };
  }

  return {
    ok: true,
    detailText: formatJson(updateFieldPath(parsed.value, segments, imageValue)),
  };
}

function parseFieldPath(fieldPath: string): string[] {
  return fieldPath
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function readValueAtPath(detail: unknown, fieldPath: string): unknown {
  let current = detail;
  for (const segment of parseFieldPath(fieldPath)) {
    if (!isPlainObject(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

interface FieldEntry {
  path: string;
  value: unknown;
}

/**
 * 收集对象内全部字段路径；数组只记录自身，字段路径协议不进入数组下标。
 */
function collectFieldEntries(detail: unknown, prefix = ""): FieldEntry[] {
  if (!isPlainObject(detail)) {
    return [];
  }

  const entries: FieldEntry[] = [];
  for (const [key, value] of Object.entries(detail)) {
    const path = prefix ? `${prefix}.${key}` : key;
    entries.push({ path, value });
    if (isPlainObject(value)) {
      entries.push(...collectFieldEntries(value, path));
    }
  }
  return entries;
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

/**
 * 值不是字符串的路径仍会出现在字段建议里，但写入前必须显式拒绝，避免覆盖对象内部字段。
 */
function findWriteConflict(detail: unknown, segments: string[]): string | undefined {
  let current: unknown = detail;
  for (const [index, segment] of segments.entries()) {
    if (!isPlainObject(current)) {
      return `字段「${segments.slice(0, index).join(".")}」不是对象，无法写入「${segments.join(".")}」`;
    }

    const value = current[segment];
    if (index < segments.length - 1) {
      if (value === undefined) {
        return undefined;
      }
      current = value;
      continue;
    }

    if (isPlainObject(value)) {
      return `字段「${segments.join(".")}」当前是对象，直接写入会覆盖内部字段；请选择具体子字段`;
    }
    if (Array.isArray(value)) {
      return `字段「${segments.join(".")}」当前是数组，直接写入会覆盖内部数据；请选择具体子字段`;
    }
    return undefined;
  }
  return undefined;
}

function suggestImageFieldPath(detail: unknown, format: ImageValueFormat): string {
  return pickBestImageField(detail, format) ?? preferredFieldNames[format][0];
}

/**
 * Rule: 先按字段名匹配当前格式的优先名，再按值是否为图片判断；父级对象不参与候选。
 */
function scoreImageField(
  path: string,
  value: unknown,
  format: ImageValueFormat,
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const fieldName = path.split(".").pop() ?? path;
  const preferred = preferredFieldNames[format].includes(fieldName);
  const named = preferred || imageFieldPattern.test(fieldName);
  const inspection = inspectImageValue(value);
  const imageValue =
    inspection.kind === "base64" ||
    inspection.kind === "dataUrl" ||
    inspection.kind === "uri";
  if (!named && !imageValue) {
    return null;
  }

  let score = (preferred ? 100 : 0) + (named ? 30 : 0);
  if (inspection.kind === "base64" || inspection.kind === "dataUrl") {
    score += 60;
  } else if (inspection.kind === "uri") {
    score += 40;
  } else if (inspection.kind === "text") {
    score += 10;
  }
  return score - path.split(".").length;
}

function pickBestImageField(detail: unknown, format: ImageValueFormat): string | undefined {
  let best: { path: string; score: number } | undefined;
  for (const entry of collectFieldEntries(detail)) {
    const score = scoreImageField(entry.path, entry.value, format);
    if (score === null) {
      continue;
    }
    if (!best || score > best.score) {
      best = { path: entry.path, score };
    }
  }
  return best?.path;
}

function describeFieldValue(value: unknown): string {
  if (typeof value === "string") {
    if (isRedactedImagePlaceholder(value)) {
      return "图片原文已隐藏";
    }
    const inspection = inspectImageValue(value);
    switch (inspection.kind) {
      case "base64":
        return `Base64 · 约 ${formatImageByteSize(inspection.sizeBytes)}`;
      case "dataUrl":
        return `Data URL · 约 ${formatImageByteSize(inspection.sizeBytes)}`;
      case "uri":
        return "URI";
      case "empty":
        return "空字符串";
      default:
        return "文本";
    }
  }
  if (Array.isArray(value)) {
    return "数组";
  }
  if (isPlainObject(value)) {
    const count = Object.keys(value).length;
    return count > 0 ? `对象 · ${count} 个字段` : "空对象";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "number") {
    return "数字";
  }
  if (typeof value === "boolean") {
    return "布尔";
  }
  return "值";
}

function isRedactedImagePlaceholder(value: string): boolean {
  return /^\[图片 (?:Base64|Data URL)，约 [^，]+，原文已隐藏\]$/.test(value);
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
