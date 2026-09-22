export async function runSnippet(code) {
  console.log("[CodePocket] Running snippet...");
  // Use data: URL to open HTML - completely bypasses extension CSP
  const dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(code);

  if (typeof chrome !== "undefined" && chrome.tabs) {
    try {
      // 1. Get the last opened tab ID
      const result = await chrome.storage.local.get("lastRunnerTabId");
      const lastTabId = result.lastRunnerTabId;
      console.log("[CodePocket] Last Tab ID:", lastTabId);

      if (lastTabId) {
        try {
          // 2. Try to verify and remove the old tab
          // We get it first to make sure it exists, otherwise remove throws an error
          await chrome.tabs.get(lastTabId);
          await chrome.tabs.remove(lastTabId);
          console.log("[CodePocket] Closed old tab:", lastTabId);
        } catch (e) {
          console.log(
            "[CodePocket] Old tab not found or could not be closed (already closed?):",
            e
          );
        }
      }

      // 3. Create a new tab
      const tab = await chrome.tabs.create({ url: dataUrl });
      console.log("[CodePocket] Created new tab:", tab.id);

      // 4. Save the new tab ID
      await chrome.storage.local.set({ lastRunnerTabId: tab.id });
    } catch (err) {
      console.error("[CodePocket] Critical error in runner:", err);
      // Fallback: just open a tab so the user sees something
      chrome.tabs.create({ url: dataUrl });
    }
  } else {
    // Non-extension environment fallback
    console.log("[CodePocket] Opening in new window (web mode)");
    window.open(dataUrl, "code_pocket_runner");
  }
}
