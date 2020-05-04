"use strict";

document.addEventListener("load", printPrice, {capture: true});

function printPrice() {
    if (document.readyState === "complete") {
        console.log(document.readyState);
        let price_elem = document.querySelector("[data-automation-id='productPage'] [data-automation-id='salePrice']")
        if (!price_elem) {console.log("page not loaded yet");}
        else {
            let price = price_elem.textContent;
            console.log("price = " + price);
        }
    }
}