"use strict";


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


// Below adapted from: https://stackoverflow.com/questions/47962104/chrome-extension-no-resource-with-given-identifier-found-when-trying-to-netwo

let gAttached = false;
let gRequests = [];
let requestObjects = [];

chrome.debugger.onEvent.addListener(function (source, method, params) {
        if (method == "Network.requestWillBeSent") {
            // If we see a url need to be handled, push it into index queue
            let rUrl = params.request.url;
            let target = getTarget(rUrl);
            if (target !== undefined) {
                gRequests.push(rUrl);
            }
        }
        if (method == "Network.responseReceived") {
            // We get its request id here, write it down to object queue
            let eUrl = params.response.url;
            let target = getTarget(eUrl);
            if (target !== undefined) {
                requestObjects.push({
                    requestId: params.requestId,
                    target: target,
                    url: eUrl
                });
            }
        }
        if (method == "Network.loadingFinished" && requestObjects.length > 0) {
            // Pop out the request rObject from both rObject queue and request queue
            let requestId = params.requestId;
            let rObject = null;
            for (const o in requestObjects) {
                if (requestId === requestObjects[o].requestId) {
                    rObject = requestObjects.splice(o, 1)[0];
                    break;
                }
            }
            // Usually loadingFinished will be immediately after responseReceived
            if (rObject == null) {
                console.log('Failed!!');
                return;
            }
            gRequests.splice(gRequests.indexOf(rObject.url), 1);
            chrome.debugger.sendCommand(
                source,
                "Network.getResponseBody",
                {"requestId": requestId},
                function (response) {
                    if (response) {
                        console.log("response for url:", rObject.url);
                        let resp_json = JSON.parse(response.body);
                        parseProductJson(resp_json);
                    } else {
                        console.log("Empty response for " + rObject.url);
                    }
                    // If we don't have any request waiting for response, re-attach debugger
                    // since without this step it will lead to memory leak.
                    if (gRequests.length === 0) {
                        chrome.debugger.detach({
                            tabId: source.tabId
                        }, function () {
                            chrome.debugger.attach({
                                tabId: source.tabId
                            }, "1.3", function () {
                                chrome.debugger.sendCommand({
                                    tabId: source.tabId
                                }, "Network.enable");
                            });
                        });
                    }
                });
        }
    }
);

function initialListener(details) {
    console.debug(`enter initialListener: tabID=${details.tabId}, gAttached=${gAttached}`);
    if (gAttached) return;  // Only need once at the very first request, so block all following requests
    let tabId = details.tabId;
    if (tabId > 0) {
        gAttached = true;
        chrome.debugger.attach({
            tabId: tabId
        }, "1.3", function () {
            chrome.debugger.sendCommand({
                tabId: tabId
            }, "Network.enable");
        });
        console.debug("attached inner debugger");
    }
    console.debug(`exit initialListener: tabID=${details.tabId}, gAttached=${gAttached}`);

}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.message === "attachDebugger") {
            let tabId = sender.tab.id;
            gAttached = false;
            initialListener({tabId: tabId});
            console.debug("attached chrome debugger");
            chrome.debugger.onEvent.addListener(initialListener);
            sendResponse({message: "attached debugger"});
        }
    });


// Filter if the url is what we want
function getTarget(url) {
    return TARGETS.find(re => re.regex.test(url));
}

const TARGETS = [
    {regex: new RegExp('/grocery.walmart.com/v3/api/products'), desc: 'walmart_grocery_details'},
    {regex: new RegExp('/grocery.walmart.com/v4/api/products/search'), desc: 'walmart_product_basic'}
]