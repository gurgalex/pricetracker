"use strict";

// Have the bg script attach the debugger every time the page loads
chrome.runtime.sendMessage({message: "attachDebugger"}, (response) => {
    console.log(response.message);
});