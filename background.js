console.log("Fresh background script");

chrome.action.onClicked.addListener(async () => {
    const result = await chrome.storage.local.get(["enabled"]);
    let currentState = result.enabled ?? true;
    currentState = !currentState;
    chrome.storage.local.set({ "enabled": currentState });

    // change the icon!
    if (result.enabled) {
        chrome.action.setIcon({ path: "icons/checkmark.png" });
    } else {
        chrome.action.setIcon({ path: "icons/x.png" });
    }
    chrome.tabs.query({
        url: ["*://*.instructure.com/*",
            "*://*/canvas/*",
            "*://canvas.wisc.edu/*"]
    }).then(sendMessageToTabs)

    function sendMessageToTabs(tabs) {
        for (const tab of tabs) {
            console.log("Current tab query:", tab);
            console.log(tab.id);
            chrome.tabs.sendMessage(tab.id, { action: "stateChanged", enabled: currentState }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Message send failed:", chrome.runtime.lastError.message);
                } else {
                    console.log("Message sent successfully, response:", response);
                }
            });
        }
    }
});
