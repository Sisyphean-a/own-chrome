import { afterEach, describe, expect, it, vi } from "vitest";
import { addWhitelistSite, listWhitelistSites, removeWhitelistSite, sitePattern } from "./siteWhitelist";
import { matchesContentScriptPattern } from "./helpers";

afterEach(() => vi.unstubAllGlobals());

describe("站点白名单", () => {
  it("按协议匹配域名和所有子域名，不接受路径、端口及通配输入", () => {
    expect(sitePattern("https://Loan-Test.com/")).toBe("https://*.loan-test.com/*");
    expect(sitePattern("ec-web.loan-test.com")).toBe("https://*.ec-web.loan-test.com/*");
    const pattern = sitePattern("loan-test.com");
    expect(matchesContentScriptPattern("https://a.loan-test.com/path", [pattern])).toBe(true);
    expect(matchesContentScriptPattern("https://loan-test.com", [pattern])).toBe(true);
    expect(matchesContentScriptPattern("https://evil-loan-test.com", [pattern])).toBe(false);
    expect(matchesContentScriptPattern("http://a.loan-test.com", [pattern])).toBe(false);
    for (const input of ["https://a.com/path", "https://a.com:8080", "https://*.a.com", "file:///tmp", "a", "https://a.com/?x=1"]) {
      expect(() => sitePattern(input)).toThrow();
    }
  });

  it("授权后注册两个脚本，列出并移除", async () => {
    let scripts: chrome.scripting.RegisteredContentScript[] = [];
    const request = vi.fn(async () => true);
    const remove = vi.fn(async () => true);
    const contains = vi.fn(async () => true);
    vi.stubGlobal("chrome", {
      permissions: { request, remove, contains },
      scripting: {
        getRegisteredContentScripts: vi.fn(async (filter?: { ids: string[] }) => filter ? scripts.filter((s) => filter.ids.includes(s.id)) : scripts),
        registerContentScripts: vi.fn(async (items: chrome.scripting.RegisteredContentScript[]) => { scripts = items; }),
        unregisterContentScripts: vi.fn(async () => { scripts = []; }),
      },
    });
    await addWhitelistSite("https://loan-test.com");
    expect(request).toHaveBeenCalledWith({ origins: ["https://*.loan-test.com/*"] });
    expect(scripts.map((s) => [s.world, s.runAt])).toEqual([["MAIN", "document_start"], ["ISOLATED", "document_start"]]);
    expect(await listWhitelistSites()).toEqual([{ pattern: "https://*.loan-test.com/*", enabled: true }]);
    contains.mockResolvedValueOnce(false);
    expect(await listWhitelistSites()).toEqual([{ pattern: "https://*.loan-test.com/*", enabled: false }]);
    await removeWhitelistSite("https://*.loan-test.com/*");
    expect(scripts).toEqual([]);
    expect(remove).toHaveBeenCalledWith({ origins: ["https://*.loan-test.com/*"] });
  });

  it("注册失败时显式报错，不伪装成添加成功", async () => {
    vi.stubGlobal("chrome", {
      permissions: { request: vi.fn(async () => true) },
      scripting: {
        getRegisteredContentScripts: vi.fn(async () => []),
        registerContentScripts: vi.fn(async () => { throw new Error("注册失败"); }),
      },
    });
    await expect(addWhitelistSite("example.com")).rejects.toThrow("注册失败");
  });

  it("拒绝授权时不注册脚本", async () => {
    const registerContentScripts = vi.fn();
    vi.stubGlobal("chrome", { permissions: { request: vi.fn(async () => false) }, scripting: { registerContentScripts } });
    await expect(addWhitelistSite("example.com")).rejects.toThrow("未获得站点访问权限");
    expect(registerContentScripts).not.toHaveBeenCalled();
  });
});
