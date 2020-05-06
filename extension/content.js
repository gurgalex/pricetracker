"use strict";

document.addEventListener("load", scrapeProduct, {capture: true});

function scrapeProduct() {
    if (document.readyState !== "complete") {
        return;
    }

    let product_elem = document.querySelector("[data-automation-id='productPage']");
    if (!product_elem) {
        //console.log("product page not loaded yet.");
        return;
    }
    let price = getPrice();
    // Validate price $ + format.
    // Check if blank or invalid

    let unit_price = getUnitPrice()
    // Validate unit price $ + format.
    // Check if blank or invalid

    let productData = {
        total_price: price,
        unit_price: unit_price,
//        date_recorded: (new Date()).toUTCString(),
        date_recorded: (new Date()).toDateString(),

    }
    let json_product_data = JSON.stringify(productData);
    console.log(json_product_data);
}

/**
 * Returns the product price
 * @returns {String} price in form $1.98
 *
 */
function getPrice() {
    let price_elem = document.querySelector("[data-automation-id='productPage'] [data-automation-id='salePrice']");
    if (!price_elem) {console.log("Price not loaded on page yet");}
    else {
        return price_elem.textContent;
    }
}

/**
 * Returns the product unit price (ex. 5/oz)
 * @returns {String} unit price in form 0.53[cents]/unit
 */
function getUnitPrice() {
    let unit_elem = document.querySelector("[data-automation-id='productPage'] [data-automation-id='price-per-unit']");

    // element exists check
    if (!unit_elem) {
        return;
    }

    return unit_elem.textContent;

}

// TODO: Figure out what event can distingush when a new product has finished loading from an existing page.
// A counter will not work, as it only works when the