// ==UserScript==
// @name         Remove Fandom Annoyances
// @version      1.0
// @description  Gets rid of lots of annoying elements on Fandom pages
// @author       Yakasov
// @updateURL    https://raw.githubusercontent.com/yakasov/Tampermonkey-Scripts/main/Remove%20Fandom%20Annoyances.user.js
// @downloadURL  https://raw.githubusercontent.com/yakasov/Tampermonkey-Scripts/main/Remove%20Fandom%20Annoyances.user.js
// @match        *.fandom.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://gist.githubusercontent.com/BrockA/2625891/raw/9c97aa67ff9c5d56be34a55ad6c18a314e5eb548/waitForKeyElements.js
// @run-at       document-start
// ==/UserScript==

const scriptKeywords = ["pathfinder", "tracking", "consoleLoggerFactory"];
const innerHTMLKeywords = [
    "ads",
    "ONE_TRUST_LIBRARIES",
    "fandomContext",
    "fandomTaxonomy",
    "_plc",
];

new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
                if (
                    node.tagName === "SCRIPT" &&
                    (innerHTMLKeywords.some((kw) =>
                        node.innerText.includes(kw)
                    ) ||
                        scriptKeywords.some((kw) => node.src.includes(kw)))
                ) {
                    node.remove();
                    console.log(
                        "Remove Fandom Annoyances blocked script:",
                        node.src
                    );
                }
            });
        }
    }
}).observe(document.documentElement, {
    childList: true,
    subtree: true,
});

waitForKeyElements("body", (node) => {
    const elements = [
        "rail-boxad-wrapper",
        "WikiaRail",
        "WikiaBar",
        "p-views",
        "mw-data-after-content",
        "log-in-edit-side-tool",
    ];
    const classElements = [
        "notifications-placeholder",
        "global-registration-buttons",
        "global-navigation",
    ];

    for (const el of elements) {
        try {
            document.getElementById(el).remove();
        } catch (e) {
            console.warn(
                `Remove Fandom Annoyances couldn't remove ${el} for reason ${e}!`
            );
        }
    }

    for (const el of classElements) {
        try {
            document.getElementsByClassName(el)[0].remove();
        } catch (e) {
            console.warn(
                `Remove Fandom Annoyances couldn't remove ${el} for reason ${e}!`
            );
        }
    }

    document
        .getElementsByClassName(
            "global-footer__section global-footer__section-fandom-apps"
        )[0]
        .parentNode.remove();
    if (window.matchMedia("(min-width: 1024px)")) {
        document.getElementsByClassName("global-footer__content")[0].style[
            "grid-template-columns"
        ] = "repeat(3,1fr)";
    }

    document.getElementsByClassName("fandom-sticky-header")[0].style.left = 0;
    document.getElementsByClassName("main-container")[0].style[
        "margin-left"
    ] = 0;
    document.getElementsByClassName("main-container")[0].style.width = "100%";
});
