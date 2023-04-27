// ==UserScript==
// @name         Hide Roll20 Avatars
// @version      1.0
// @description  Hides the Roll20 avatars from the editor page
// @author       Yakasov
// @updateURL    https://raw.githubusercontent.com/yakasov/Tampermonkey-Scripts/main/Hide%20Roll20%20Avatars.user.js
// @downloadURL  https://raw.githubusercontent.com/yakasov/Tampermonkey-Scripts/main/Hide%20Roll20%20Avatars.user.js
// @match        https://app.roll20.net/editor/
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://gist.githubusercontent.com/BrockA/2625891/raw/9c97aa67ff9c5d56be34a55ad6c18a314e5eb548/waitForKeyElements.js
// ==/UserScript==

waitForKeyElements(
    "playerzone",
    document.getElementById("playerzone").remove()
);
