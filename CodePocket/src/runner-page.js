// Runner page script - redirects to blob URL to escape extension CSP
chrome.storage.local.get("code_pocket_temp_run", (result) => {
  const code = result.code_pocket_temp_run;
  if (code) {
    chrome.storage.local.remove("code_pocket_temp_run");
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    // Redirect to blob URL - completely exits extension environment
    location.replace(url);
  } else {
    document.body.innerHTML = "<p>No code to run.</p>";
  }
});
