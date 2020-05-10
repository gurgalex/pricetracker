"use strict";
// Attach debugger every time a tab is updated.
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status !== "complete") {
        return;
    }

    let debuggee = {tabId: tabId};
    chrome.debugger.attach(debuggee, "1.3");
    chrome.debugger.sendCommand({tabId: tabId}, "Network.enable");
    chrome.debugger.onEvent.addListener(onEvent);
});

/**
 *
 * @param json {Object} Json object of Product info needing validation.
 */
function parseProductJson(json) {
    let parsed_product_info = new ProductInfo(json);
    console.log(`formatted product info:`, parsed_product_info);
    console.log(`\nitem name: ${parsed_product_info.title}` +
        `\ntotal price: ${parsed_product_info.price.list_price}` +
        `\n$ per unit (${parsed_product_info.price.priceUnitOfMeasure}): ${parsed_product_info.price.unit_price}` +
        `\ndate recorded: ${(new Date()).toUTCString()}`
    );
}


/**
 * Detach the grocery store's internal data structure from ours in case their's changes.
 */
class ProductInfo {
    constructor(productJson) {
        this._json = productJson;
        // Title of product
        this.title = productJson.basic.name;
        this.price = new Price(productJson.store.price);
    }
}

class Price {
    constructor(priceJson) {
        this.unit_price = parseFloat(priceJson.unit);
        this.unitOfMeasure = priceJson.salesUnitOfMeasure;
        this.salesQuantity = parseFloat(priceJson.salesQuantity);
        // Unit * sale_quantity = list price
        this.list_price = priceJson.list;
        // amount paid per X (Each, oz, fl oz, lb, etc)
        this.priceUnitOfMeasure = priceJson.priceUnitOfMeasure;
    }
}

/**
 * Handles any events that are triggered by Chrome debugger
 * @param debuggeeId {chrome.debugger.types.Debuggee} Most concenred with tabId (for content tab)
 * @param message {String} Method name. Should be one of the notifications defined by the remote debugging protocol.
 * @param params {Object} JSON object with the parameters. Structure of the parameters varies depending on the method name and is defined by the 'parameters' attribute of the event description in the remote debugging protocol.
 */
function onEvent(debuggeeId, message, params) {
    if (message == "Network.responseReceived") {
        if (params.response.url.includes("grocery.walmart.com/v3/api/products")) {

            // Copied from: https://stackoverflow.com/questions/48785946/how-to-get-response-body-of-all-requests-made-in-a-chrome-extension
            chrome.debugger.sendCommand({
                tabId: debuggeeId.tabId
            }, "Network.getResponseBody", {
                "requestId": params.requestId
            }, function (response) {
                let response_json = JSON.parse(response.body);
                parseProductJson(response_json);
            });
        }
    }
}
