import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  buildImageFieldSuggestionsFromText,
  convertImageFileToValue,
  inspectImageValue,
  readImageValueFromDetailText,
  suggestImageFormatFromText,
  suggestImageFieldPathFromText,
  type ImageValueFormat,
  writeImageValueToDetailText,
} from "../../imageTools";
import type { PanelController } from "../../usePanelController";
import { Badge, Field } from "./RulesShared";

const formatLabels: Record<ImageValueFormat, string> = {
  androidUri: "模拟 Android URI",
  base64: "Base64",
};

export function ResponseImageTools({ controller }: { controller: PanelController }) {
  const draft = controller.state.responseDraft;
  const [expanded, setExpanded] = useState(false);
  const [format, setFormat] = useState<ImageValueFormat>("base64");
  const [fieldPath, setFieldPath] = useState("data");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const suggestions = useMemo(
    () =>
      draft
        ? buildImageFieldSuggestionsFromText(draft.detailText, format)
        : [],
    [draft, format],
  );
  const selectedPreviewUrl = useObjectUrl(selectedFile);
  const currentImageValue = useMemo(
    () => (draft ? readImageValueFromDetailText(draft.detailText, fieldPath) : undefined),
    [draft?.detailText, fieldPath],
  );
  const currentImage = useMemo(() => inspectImageValue(currentImageValue), [currentImageValue]);
  const persistedPreviewUrl = selectedFile ? null : currentImage.previewUrl;
  const previewUrl = selectedPreviewUrl ?? persistedPreviewUrl;
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setPreviewError(false);
  }, [previewUrl]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    const nextFormat = suggestImageFormatFromText(draft.detailText);
    const nextFieldPath = suggestImageFieldPathFromText(draft.detailText, nextFormat);
    const existingImage = inspectImageValue(
      readImageValueFromDetailText(draft.detailText, nextFieldPath),
    );
    setFormat(nextFormat);
    setFieldPath(nextFieldPath);
    setSelectedFile(null);
    setExpanded(
      existingImage.kind === "base64" ||
        existingImage.kind === "dataUrl" ||
        existingImage.kind === "uri",
    );
  }, [draft?.id]);

  if (!draft) {
    return null;
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const applyImage = async () => {
    if (!selectedFile) {
      pushToast(controller, "error", "请先选择一张图片");
      return;
    }

    setApplying(true);
    try {
      const imageValue = await convertImageFileToValue(selectedFile, format);
      const result = writeImageValueToDetailText(draft.detailText, fieldPath, imageValue);
      if (!result.ok) {
        pushToast(controller, "error", result.error);
        return;
      }
      controller.setState((current) => ({
        ...current,
        responseDraft:
          current.responseDraft?.id === draft.id
            ? { ...current.responseDraft, detailText: result.detailText }
            : current.responseDraft,
        toast: { level: "success", message: `已写入${formatLabels[format]}` },
      }));
    } catch (error) {
      pushToast(
        controller,
        "error",
        error instanceof Error ? error.message : "图片读取失败",
      );
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className="workspace-section">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="control-button control-button--quiet"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "收起图片字段" : "添加图片字段"}
        </button>
      </div>
      {expanded ? (
        <>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <Field label="图片字段">
              <input
                list={`image-field-${draft.id}`}
                className="control-field mono"
                value={fieldPath}
                onChange={(event) => setFieldPath(event.target.value)}
              />
              <datalist id={`image-field-${draft.id}`}>
                {suggestions.map((path) => (
                  <option key={path} value={path} />
                ))}
              </datalist>
            </Field>
            <Field label="图片格式">
              <select
                className="control-select"
                value={format}
                onChange={(event) => setFormat(event.target.value as ImageValueFormat)}
              >
                <option value="androidUri">模拟 Android URI</option>
                <option value="base64">Base64</option>
              </select>
            </Field>
            <Field label="选择图片" span2>
              <input
                type="file"
                accept="image/*"
                className="control-field"
                onChange={handleFileChange}
              />
            </Field>
            <Field label="已选图片" span2>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Badge tone={selectedFile ? "green" : "gray"}>
                  {selectedFile ? selectedFile.name : "未选择新图片"}
                </Badge>
                {selectedFile ? (
                  <span className="workspace-pane__subtitle mono">
                    {selectedFile.type || "image/*"} / {Math.ceil(selectedFile.size / 1024)} KB
                  </span>
                ) : null}
              </div>
            </Field>
            {previewUrl && !previewError ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <img
                  src={previewUrl}
                  alt={selectedFile?.name ?? "configured image"}
                  onError={() => setPreviewError(true)}
                  style={{
                    width: "100%",
                    maxHeight: 220,
                    objectFit: "contain",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                />
              </div>
            ) : currentImage.kind === "base64" || currentImage.kind === "dataUrl" ? (
              <Field label="图片预览" span2>
                <span className="workspace-pane__subtitle">
                  图片数据已写入，但浏览器无法解码预览；仍可复制原始回包。
                </span>
              </Field>
            ) : null}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button
              type="button"
              className="control-button control-button--success"
              onClick={() => void applyImage()}
              disabled={!selectedFile || applying}
            >
              {applying ? "插入中..." : "插入图片"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function pushToast(
  controller: PanelController,
  level: "success" | "info" | "error",
  message: string,
) {
  controller.setState((current) => ({
    ...current,
    toast: { level, message },
  }));
}

function useObjectUrl(file: File | null): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return objectUrl;
}
