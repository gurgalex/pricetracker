"use strict";

/**
 * Returns whether the initiator of a request was a chrome extension.
 * @param initiator {String}
 * @returns {boolean}
 */
let is_background_page_tab = function(initiator) {
    return initiator.startsWith("chrome-extension");
}

chrome.webRequest.onCompleted.addListener((details) => {

        // Don't repeat our requests if origninating from our extension.
        // prevents DoS by not requesting product info if the extension requested it.
        if (is_background_page_tab(details.initiator)) {
            return;
        }

        let productInfoUrl = details.url;
        fetch(productInfoUrl)
            .then(response => response.json())
            .then(data => {
                console.log("captured request for url details: ", details);
                console.log("product info: ", data)
            });
    }, {urls: ["*://grocery.walmart.com/v3/api/products/*"],
        types: [
            "xmlhttprequest", // capture itemFields request
            ]}
);