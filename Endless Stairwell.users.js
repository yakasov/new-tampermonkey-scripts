// ==UserScript==
// @name         Endless Stairwell Autoplay
// @namespace    https://raw.githubusercontent.com/yakasov/new-tampermonkey-scripts/master/Endless%Stairwell%20Autoplay.users.js
// @version      0.2.0
// @description  Autoplays Endless Stairwell by Demonin
// @author       yakasov
// @match        https://demonin.com/games/endlessStairwell/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=demonin.com
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* eslint-disable no-undef */
let started = false;
const runes = [4, 1, 3];
const tempRuneFloor = 6;
const permRuneFloor = 7;
const blueKeyFloor = 49;

function moveToFloor(floor) {
	if (game.currentFloor > floor) {
		floorDown();
		return false;
	} else if (game.currentFloor < floor) {
		floorUp();
		return false;
	}
	return true;
}

function moveToStairwell() {
	if (game.fightingMonster) {
		basicAttack();
	} else {
		toStairwell();
	}
}

function getXP(tier, target = null, floor = null) {
	if (moveToFloor(floor ?? game.floorsWithRooms[tier][target])) {
		if (!game.floorDifficulty && game.energy === 100) {
			enterFloor();
		} else {
			basicAttack();
		}
	}
}

function basicAttack() {
	if (game.fightingMonster && game.energy > 15) {
		attack();
		if (game.vanillaHoney.gte(1) && game.energy < 50) {
			consumeHoney(2);
		}
	} else if (!game.fightingMonster) {
		if (game.health.lte(game.maxHealth.div(2.5))) {
			toStairwell();
		} else if (game.energy === 100) {
			newRoom();
		}
	}
}

class mainMovement {
	constructor(tier, targets) {
		this.floorTarget = 0;
		this.tier = tier;
		this.targets = targets;
	}

	main() {
		for (const [k, v] of Object.entries(this.targets)) {
			if (game.level.lt(v)) {
				this.floorTarget = k;
				break;
			}
		}

		if (game.buffTimes[0] && this.floorTarget !== 3) {
			this.floorTarget += 1;
		}

		if (
			game.currentFloor !==
				game.floorsWithRooms[this.tier][this.floorTarget] &&
			game.roomsFromStairwell
		) {
			moveToStairwell();
		} else if (this.checkRunes) {
			this.getRunes();
		} else {
			getXP(this.tier, this.floorTarget);
		}
	}

	get checkRunes() {
		const runesCheck = runes.every((v, i) => {
			return game.runeFragments[i] >= v;
		});
		return runesCheck && game.honey.gte(2);
	}

	getRunes() {
		if (moveToFloor(tempRuneFloor)) {
			smithRune(1);
			smithRune(3);
		}
	}
}

class Section1 extends mainMovement {
	constructor(tier, targets) {
		super(tier, targets);
	}

	main() {
		if (game.specialItemsAcquired[0]) {
			getXP(this.tier, 0, blueKeyFloor);
			return;
		}

		super.main();
	}
}

function main() {
	if (started) {
		if (!game.specialItemsAcquired[1] && game.level.lte(30)) {
			s1.main();
		} else {
			s2.main();
		}
	}
}

let s1 = new Section1(0, {
	0: 7,
	1: 12,
	2: 15,
	3: 999,
});
let s2 = new mainMovement(1, {
	0: 40,
	1: 55,
	2: 80,
	3: 999,
});

setInterval(main, 5);
GM_registerMenuCommand("Toggle autoplay", () => {
	started = !started;
	//setTitleText();
});
