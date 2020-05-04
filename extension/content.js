"use strict";

document.addEventListener("load", printPrice, true);;

function printPrice() {
    let price = document.querySelector("[data-automation-id='productPage'] [data-automation-id='salePrice']").textContent;
    console.log("price = " + price);
}