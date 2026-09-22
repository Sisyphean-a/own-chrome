console.log('Code Pocket background script loaded.');

try {
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
            .catch((error) => console.error(error));
        console.log('Side panel behavior set successfully.');
    } else {
        console.warn('chrome.sidePanel API is not available.');
    }
} catch (e) {
    console.error('Error setting side panel behavior:', e);
}
