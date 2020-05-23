export function getParams(url) {
    "use strict";
    let params = url.match(".*\\?(.*)")[1];
    if (params === undefined) {
        params = "";
    }
    return new URLSearchParams(params);
}
