# PriceTracker

A chrome extension that provides monitors the pricing of online grocery items over time. The primary feature is displaying when an item is below or above its usual price.

# About

Once `pricetracker` is installed, it'll begin capturing pricing info as you browse and notify you if that item is below or above the usual price the next time you browse for the item page.

All pricing data is collected, processed, and stored locally.

Backing up the data should be explained and simple.

# Building

Clone repo such as `git clone <repo url>``

## Install yarn or npm
### npm
https://www.npmjs.com/get-npm

## bundle files
run `npx webpack` inside the `extension` directory

The bundled extension is in the *output directory* `extension/dist`

# Installation
Visit [chrome extensions page](chrome://extensions)

Enable developer mode

Click  unpacked file

Select the output directory mentioned in `bundle files`

