// ==UserScript==
// @name         Remove left pane from Azure DevOps search
// @version      1.0
// @description  Removes the obstructive left pane from Azure DevOps search
// @author       Yakasov
// @match        https://prospectsoft.visualstudio.com/_search?*
// @require      https://gist.githubusercontent.com/BrockA/2625891/raw/9c97aa67ff9c5d56be34a55ad6c18a314e5eb548/waitForKeyElements.js
// @grant        none
// ==/UserScript==

const classString =
    "top-level-navigation region-navigation flex-column flex-noshrink scroll-hidden expanded";
waitForKeyElements(
    classString,
    document.getElementsByClassName(classString)[0].remove()
);
