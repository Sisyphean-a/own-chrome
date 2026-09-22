const code = localStorage.getItem('code_pocket_temp_run');

// Listen for download requests from the sandboxed iframe
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DOWNLOAD_REQUEST') {
        const { url, filename } = event.data;
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});

if (code) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; border:none;";
    // Point to the sandboxed page (now in public/ root)
    iframe.src = chrome.runtime.getURL('src/sandbox.html');

    // Wait for the iframe to load before sending data
    iframe.onload = () => {
        iframe.contentWindow.postMessage(code, '*');
    };

    document.body.appendChild(iframe);
} else {
    document.body.innerHTML = '<div style="padding:20px;font-family:sans-serif;">No code execution pending.</div>';
}
