import { openDB } from 'idb/with-async-ittr.js';

export const idb = {
    ProductDB: openDB('priceTracker', 1, {

        upgrade: (db, oldVersion, newVersion, transaction) => {
            if (oldVersion === 0) upgradeProductDBFromV0ToV1();

            function upgradeProductDBFromV0ToV1() {
                // Create a store of objects
                const store = db.createObjectStore('productWalmart', {
                    // The combination of the `retailer`, `storeId, `USItemId` and `DatePriced` will be the unique key
                    // Each store for that retailer will have a different price for each item `UsItemId
                    // We will track each date we record the price of an item.
                    // Index: Primarily query will be Price item price by Date (likely recent)
                    keyPath: ['storeId', 'USItemId', 'datePriced'],
                });
                // Quick access to Product price changes
                store.createIndex('byProduct', ['storeId', "USItemId"]);
            }
        },
    })
};