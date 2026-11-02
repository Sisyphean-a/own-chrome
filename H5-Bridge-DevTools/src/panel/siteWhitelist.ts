const PREFIX = "h5-site-";

export function sitePattern(input: string): string {
  const value = input.trim();
  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw new Error("请输入有效的网站地址");
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password ||
      url.port || (url.pathname !== "/" && url.pathname !== "") || url.search || url.hash ||
      !url.hostname.includes(".") || url.hostname.includes("*") || /^[0-9.]+$/.test(url.hostname) ||
      !/^[a-z0-9.-]+$/.test(url.hostname) || url.hostname.split(".").some((part) => !part || part.startsWith("-") || part.endsWith("-"))) {
    throw new Error("请输入不含端口、路径的 HTTP 或 HTTPS 域名");
  }
  return `${url.protocol}//*.${url.hostname}/*`;
}

function scriptId(pattern: string, world: "main" | "content"): string {
  return `${PREFIX}${world}-${encodeURIComponent(pattern)}`;
}

export interface WhitelistSite {
  pattern: string;
  enabled: boolean;
}

export async function listWhitelistSites(): Promise<WhitelistSite[]> {
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  const mains = scripts.filter((script) => script.id.startsWith(`${PREFIX}main-`));
  return Promise.all(mains.map(async (script) => {
    const pattern = script.matches?.[0] ?? "";
    const hasContent = scripts.some((item) => item.id === scriptId(pattern, "content"));
    const allowed = await chrome.permissions.contains({ origins: [pattern] });
    return { pattern, enabled: hasContent && allowed };
  }));
}

// 必须由用户点击直接调用，不能在权限请求前等待其他异步操作。
export async function addWhitelistSite(input: string): Promise<void> {
  const pattern = sitePattern(input);
  const granted = await chrome.permissions.request({ origins: [pattern] });
  if (!granted) throw new Error("未获得站点访问权限");
  const ids = [scriptId(pattern, "main"), scriptId(pattern, "content")];
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids });
  if (existing.length === ids.length) return;
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: existing.map((item) => item.id) });
  await chrome.scripting.registerContentScripts([
    { id: ids[0], matches: [pattern], js: ["injected/injectMain.js"], runAt: "document_start", world: "MAIN", persistAcrossSessions: true },
    { id: ids[1], matches: [pattern], js: ["content/contentScript.js"], runAt: "document_start", world: "ISOLATED", persistAcrossSessions: true },
  ]);
}

export async function removeWhitelistSite(pattern: string): Promise<void> {
  const ids = [scriptId(pattern, "main"), scriptId(pattern, "content")];
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids });
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: existing.map((item) => item.id) });
  const removed = await chrome.permissions.remove({ origins: [pattern] });
  if (!removed) throw new Error("脚本已移除，但站点权限未能撤销，请在 Chrome 扩展设置中检查");
}
