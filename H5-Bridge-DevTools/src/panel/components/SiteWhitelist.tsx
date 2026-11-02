import { useEffect, useState } from "react";
import { addWhitelistSite, listWhitelistSites, removeWhitelistSite, type WhitelistSite } from "../siteWhitelist";

export function SiteWhitelist({ tabId }: { tabId: number }) {
  const [input, setInput] = useState("");
  const [sites, setSites] = useState<WhitelistSite[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setSites(await listWhitelistSites());
  }

  useEffect(() => {
    void refresh().catch((error: unknown) => setMessage(String(error)));
  }, []);

  function add(value: string) {
    setBusy(true);
    setMessage("");
    void addWhitelistSite(value).then(async () => {
      await refresh();
      setInput("");
      setMessage("站点已添加，请刷新目标页面生效。");
    }).catch((error: unknown) => setMessage(`添加失败：${String(error)}。若已授权，请重试或在 Chrome 扩展设置中检查站点权限。`)).finally(() => setBusy(false));
  }

  async function remove(pattern: string) {
    setBusy(true);
    setMessage("");
    try {
      await removeWhitelistSite(pattern);
      await refresh();
      setMessage("已移除，请刷新目标页面生效；内置站点或其他白名单仍可能覆盖此站点。");
    } catch (error) {
      setMessage(`移除失败：${String(error)}`);
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="site-whitelist">
      <p className="site-whitelist__description">授权指定域名及其所有子域名，不包含兄弟域名；仅对所选 HTTP 或 HTTPS 协议生效。</p>
      <div className="site-whitelist__form">
        <input className="control-field site-whitelist__input" aria-label="白名单域名" placeholder="https://loan-test.com" value={input} onChange={(event) => setInput(event.target.value)} />
        <button className="control-button control-button--primary" type="button" disabled={busy} onClick={() => add(input)}>添加站点</button>
        <button className="control-button" type="button" disabled={busy} onClick={() => {
          void chrome.tabs.get(tabId).then((tab) => {
            if (!tab.url) throw new Error("无法读取当前页面地址");
            const url = new URL(tab.url);
            setInput(url.origin);
          }).catch((error: unknown) => setMessage(`读取当前站点失败：${String(error)}`));
        }}>填入当前站点</button>
      </div>
      {sites.length === 0 ? <p className="site-whitelist__empty">暂无手动添加的站点，内置站点不显示在此列表中。</p> : (
        <ul className="site-whitelist__list">{sites.map((site) => <li className="site-whitelist__item" key={site.pattern}>
          <span className="site-whitelist__pattern mono">{site.pattern}</span>
          <span className={`site-whitelist__badge ${site.enabled ? "is-enabled" : "is-error"}`}>
            {site.enabled ? "已启用" : "权限或脚本异常，请重新添加"}
          </span>
          <button className="control-button control-button--quiet" type="button" disabled={busy} onClick={() => void remove(site.pattern)}>移除</button>
        </li>)}</ul>
      )}
      {message ? <p className="site-whitelist__message" role="status">{message}</p> : null}
    </div>
  );
}
