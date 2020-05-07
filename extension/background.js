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
                console.log("product info: ", data);
                let parsed_product_info = new ProductInfo(data);
                console.log("formatted product info:", parsed_product_info,
                    "\nitem name:", parsed_product_info.title,
                    "\ntotal price:", parsed_product_info.price.list_price,
                    "\n$ per unit (" + parsed_product_info.price.priceUnitOfMeasure + ")" + ":", parsed_product_info.price.unit_price,
                    "\ndate recorded:", (new Date()).toUTCString()
                );
            });
    }, {urls: ["*://grocery.walmart.com/v3/api/products/*"],
        types: [
            "xmlhttprequest", // capture itemFields request
            ]}
);

/**
 * Detach the grocerry store's internal data structure from ours incase their's changes.
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