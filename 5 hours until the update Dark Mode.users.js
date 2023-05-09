// ==UserScript==
// @name         5 hours until the update Dark Mode
// @version      0.1
// @description
// @author       yakasov
// @match        https://dan-simon.github.io/misc/5hours/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.io
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let body = document.getElementsByTagName('body')[0];
    body.style = 'background-color: black; color: lightgrey;';
})();