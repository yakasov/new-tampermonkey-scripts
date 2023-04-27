// ==UserScript==
// @name         Endless Stairwell Autoplay
// @namespace    https://raw.githubusercontent.com/yakasov/new-tampermonkey-scripts/master/Endless%Stairwell%20Autoplay.users.js
// @version      0.1
// @description  Autoplays Endless Stairwell by Demonin
// @author       yakasov
// @match        https://demonin.com/games/endlessStairwell/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=demonin.com
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* eslint-disable no-undef */
let started = false;

function basicAttack() {
	if (game.fightingMonster && game.energy > 15) {
		attack();
	} else if (!game.fightingMonster) {
		if (game.health.lte(game.maxHealth.div(3))) {
			toStairwell();
		} else if (game.energy === 100) {
			newRoom();
		}
	}
}

function section1() {
	if (game.currentFloor !== game.floorsWithRooms[0][0]) {
		floorUp();
	} else if (!game.floorDifficulty && game.energy === 100) {
		enterFloor();
	} else {
		basicAttack();
	}
}

function main() {
	if (started) {
		section1();
	}
}

GM_registerMenuCommand("Toggle autoplay", () => {
	started = !started;
	//setTitleText();
});

//setTitleText();
setInterval(main, 5);
