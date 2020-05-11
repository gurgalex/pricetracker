"use strict";

window.addEventListener("unload", function() {
        let currTab = tabs[0];
        if (currTab) { // Sanity check
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.debugger.detach({tabId:currTab.id});
                console.log("detached debugger from tab id:", currTab.id);
            });
        }
});


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


//requestIds
let pendingRequests = [];

/**
 * Handles any events that are triggered by Chrome debugger
 * @param debuggeeId {chrome.debugger.types.Debuggee} Most concenred with tabId (for content tab)
 * @param message {String} Method name. Should be one of the notifications defined by the remote debugging protocol.
 * @param params {Object} JSON object with the parameters. Structure of the parameters varies depending on the method name and is defined by the 'parameters' attribute of the event description in the remote debugging protocol.
 */
function onEvent(debuggeeId, message, params) {

    //console.log("got event", message, params);
    if (message == "Network.responseReceived") {
        if (params.response.url.includes("grocery.walmart.com/v3/api/products")) {
            //console.log(debuggeeId, message, params);
            pendingRequests.push(params.requestId);
            //console.log("saved pending requestID:", params.requestId);
        }
    }
    else if (message == "Network.loadingFinished") {
        //console.log("loading event:", message, params);
        let indexOrNot = pendingRequests.indexOf(params.requestId);
        if (indexOrNot === -1) {
            return;
        }
        // Got a grocery price request
        let neededRequestId = pendingRequests[indexOrNot];

        // Check if the loadingFinished event is for this request
        if (neededRequestId !== params.requestId) {
            console.log(`pendingRequestID ${neededRequestId} !== ${params.requestId} loadFinished requestId`);
            return;
        }

            // Copied from: https://stackoverflow.com/questions/48785946/how-to-get-response-body-of-all-requests-made-in-a-chrome-extension
        // encoded data length is -1 or 0
        console.log("requesting response for requestID:", neededRequestId);
            chrome.debugger.sendCommand({
                tabId: debuggeeId.tabId
            }, "Network.getResponseBody", {
                "requestId": neededRequestId
            }, function (response) {

                if (!response) {
                    console.log("no response", response);
                    return;
                }
                console.log("captured resp:", response);
                let response_json = JSON.parse(response.body);
                parseProductJson(response_json);
            })
        pendingRequests.splice(indexOrNot, 1);
    }
}


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