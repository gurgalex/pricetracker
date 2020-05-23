"use strict";
import {idb} from "./db.js";
import {getParams} from "./utils.js";

/**
 * @param json {Object} Json object of Product info needing validation.
 * @param storeId {String} The identifier for a particular store for a company
 */
function parseProductJson(json, storeId) {
    const datePriced = new Date();
    let parsed_product_info = new ProductInfo(json, storeId, datePriced);
    console.log(`formatted product info:`, parsed_product_info);
    console.log(`\nitem name: ${parsed_product_info.title}` +
        `\ntotal price: ${parsed_product_info.price.list_price}` +
        `\n$ per unit (${parsed_product_info.price.priceUnitOfMeasure}): ${parsed_product_info.price.unit_price}` +
        `\ndate priced: ${parsed_product_info.datePriced.toUTCString()}`
    );
    const store = idb.ProductDB.transaction(storeName).objectStore(storeName);
    idb.ProductDB.then(res => res.add("productWalmart", parsed_product_info)
        .then(result => console.log(`result: ${result}`))
        .catch(err => {console.log(`error adding product to db: ${err}`); throw err;})
);
}


/**
 * Detach the grocery store's internal data structure from ours in case their's changes.
 */
class ProductInfo {
    constructor(productJson, storeId, datePriced) {
        this._json = productJson;
        // specific store the product price is tracked from
        this.storeId = storeId;
        // unique identifier for product in region??
        this.USItemId = productJson.USItemId;
        // Title of product
        this.title = productJson.basic.name;
        this.price = new Price(productJson.store.price);
        this.datePriced = datePriced;
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

let debuggerAttached = false;
let requestMapping = new Map();


function reAttachDebugger(tabId) {
    chrome.debugger.detach({tabId},
        () => chrome.debugger.attach({tabId}, "1.3",
            () => chrome.debugger.sendCommand({tabId}, "Network.enable")
        )
    );
}

chrome.debugger.onEvent.addListener(function (source, method, params) {

        if (method == "Network.responseReceived") {
            // We get its request id here, write it down to object queue
            let url = params.response.url;
            let urlTypeMatch = getUrlTypeMatch(url);
            if (urlTypeMatch !== undefined) {
                requestMapping.set(params.requestId, {
                    urlType: urlTypeMatch.urlType,
                    source,
                    params,
                    url,
                });
                console.log("pending request:", requestMapping.get(params.requestId));
            }
        }
        else if (method == "Network.loadingFinished" && requestMapping.size > 0) {
            // Pop out the request rObject from pending responses.
            const requestId = params.requestId;
            let rObject = requestMapping.get(requestId);
            // Usually loadingFinished will be immediately available after responseReceived
            if (rObject === undefined) {
                console.debug(`response still loading, not ready yet: ${requestId}`);
                return;
            }
            requestMapping.delete(requestId);

            chrome.debugger.sendCommand(
                source,
                "Network.getResponseBody",
                {"requestId": requestId},
                response => {
                    if (response) {
                        if (rObject.urlType === API_POINTS.walmart_grocery_details) {
                            handleProductPage(rObject, response);
                        }
                        else if (rObject.urlType === API_POINTS.walmart_product_search) {
                            console.log("got product search basic url");
                        }
                        else {
                            console.log("unhandled resp type", rObject.urlType);
                        }
                    }
                    else {
                        console.log("Empty response for " + rObject.url);
                    }
                    // If we don't have any request waiting for response, re-attach debugger
                    // since without this step it will lead to memory leak.
                    if (requestMapping.size === 0) {
                        reAttachDebugger(source.tabId);
                    }
                });
        }
    }
);

function handleProductPage(rObject, response) {
    console.log("got product page info url:", rObject.url, rObject)
    let params = getParams(rObject.url);
    let storeId = params.get("storeId");
    const resp_json = JSON.parse(response.body);
    parseProductJson(resp_json, storeId);
}

function initialListener(details) {
    console.debug(`enter initialListener: tabID=${details.tabId}, gAttached=${debuggerAttached}`);
    if (debuggerAttached) return;  // Only need once at the very first request, so block all following requests
    let tabId = details.tabId;
    if (tabId > 0) {
        debuggerAttached = true;
        chrome.debugger.attach({tabId}, "1.3",
            () => chrome.debugger.sendCommand({tabId}, "Network.enable")
        );
        console.debug("attached inner debugger");
    }
    console.debug(`exit initialListener: tabID=${details.tabId}, gAttached=${debuggerAttached}`);

}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.message === "attachDebugger") {
            let tabId = sender.tab.id;
            debuggerAttached = false;
            initialListener({tabId});
            console.debug("attached chrome debugger");
            chrome.debugger.onEvent.addListener(initialListener);
            sendResponse({message: "attached debugger"});
        }
    });


// Filter if the url is what we want
function getUrlTypeMatch(url) {
    return TARGETS.find(re => re.regex.test(url));
}

const API_POINTS = {
    walmart_grocery_details: 1,
    walmart_product_search: 2,
}
Object.freeze(API_POINTS);

const TARGETS = [
    {regex: new RegExp('/grocery.walmart.com/v3/api/products'), urlType: API_POINTS.walmart_grocery_details},
    {regex: new RegExp('/grocery.walmart.com/v4/api/products/search'), urlType: API_POINTS.walmart_product_search}
]
