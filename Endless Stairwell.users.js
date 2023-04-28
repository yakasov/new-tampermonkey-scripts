// ==UserScript==
// @name         Endless Stairwell Autoplay
// @namespace    https://raw.githubusercontent.com/yakasov/new-tampermonkey-scripts/master/Endless%Stairwell%20Autoplay.users.js
// @version      0.2.4
// @description  Autoplays Endless Stairwell by Demonin
// @author       yakasov
// @match        https://demonin.com/games/endlessStairwell/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=demonin.com
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* eslint-disable no-undef */
let started = false;
const runes = [4, 4, 4];
const blueKeyFloor = 49;
const cocoaUpgrades = {
    1: 6,
    3: 5,
    4: 40,
    5: 115,
    6: 600,
    7: 2200,
};

function moveToFloor(floor, enter = false) {
    if (game.currentFloor > floor) {
        floorDown();
        return false;
    } else if (game.currentFloor < floor) {
        floorUp();
        return false;
    }

    if (enter && !game.roomsFromStairwell) {
        if (game.energy !== 100) {
            return false;
        }
        enterFloor();
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

function getXP(tier, target, floor = null) {
    if (moveToFloor(floor ?? game.floorsWithRooms[tier][target], true)) {
        basicAttack();
    }
}

function basicAttack() {
    if (game.fightingMonster && game.energy > 15) {
        attack();
        if (
            game.vanillaHoney.gte(1) &&
            game.energy < 25 &&
            !game.altarUpgradesBought[2]
        ) {
            // consume vanilla honey for energy
            consumeHoney(2);
        }
    } else if (!game.fightingMonster) {
        if (game.health.lte(game.maxHealth.div(2))) {
            // go to stairwell if health low
            toStairwell();
        } else if (game.energy === 100) {
            // only move on if energy maxed again
            newRoom();
        }
    }
}

function getSpecialItems() {
    return game.specialItemsAcquired;
}

function setTitleText() {
    let el = document.getElementsByClassName("title-bar-text")[0];
    el.innerText = `Endless Stairwell - Autoplay ${started ? "ON" : "OFF"}`;
}

class mainMovement {
    constructor(tier, targets) {
        this.floorTarget = 0;
        this.tier = tier;
        this.targets = targets; // level must be > (v) to go to difficulty (k + 1)
        this.buffed = false; // use buffed so floorTarget doesn't get incremented more than once
        this.floorTargetOverride = null; // useful for fighting a specific floor eg 49
    }

    main() {
        for (const [k, v] of Object.entries(this.targets)) {
            if (game.level.lt(v)) {
                this.floorTarget = k;
                break;
            }
        }

        if (game.buffTimes[0] && this.floorTarget !== 3 && !this.buffed) {
            // if we have the temp buffs, increase the floor target
            // this should probably only be for floors up to 50
            this.floorTarget++;
            this.buffed = true;
        } else if (!game.buffTimes[0] && this.buffed) {
            this.buffed = false;
        }

        if (
            game.currentFloor !==
                game.floorsWithRooms[this.tier][this.floorTarget] &&
            game.roomsFromStairwell &&
            !this.floorTargetOverride
        ) {
            // move to stairwell if floorTarget has changed
            moveToStairwell();
        } else if (this.checkTempRunes) {
            this.getTempRunes();
        } else if (this.checkPermRunes) {
            this.getPermRunes(this.checkPermRunes);
        } else {
            getXP(this.tier, this.floorTarget, this.floorTargetOverride);
        }
    }

    get checkTempRunes() {
        const runesCheck = runes.every((v, i) => {
            return game.runeFragments[i] >= v;
        });
        return runesCheck && game.honey.gte(3) && !this.buffed;
    }

    get checkPermRunes() {
        if (this.buffed && game.honey.gte(1)) {
            const runeAmounts = [
                [game.redPermanentBought, 10],
                [game.greenPermanentBought, 5],
                [game.bluePermanentBought, 5],
            ];
            for (let i = 0; i < 3; i++) {
                if (
                    game.runeFragments[i] >= 4 &&
                    runeAmounts[i][0] < runeAmounts[i][1]
                ) {
                    return i + 1;
                }
            }
        }
        return false;
    }

    getTempRunes() {
        if (game.roomsFromStairwell) {
            return moveToStairwell();
        }

        if (moveToFloor(game.smithFloor)) {
            for (let i = 1; i < 4; i++) {
                smithRune(i);
            }
        }
    }

    getPermRunes(i) {
        if (game.roomsFromStairwell) {
            return moveToStairwell();
        }

        if (moveToFloor(game.smithFloor + 1)) {
            smithPermaRune(i);
        }
    }
}

class Section1 extends mainMovement {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        if (game.specialItemsAcquired[0] && game.level.gte(15)) {
            this.floorTargetOverride = blueKeyFloor;
        }

        super.main();
    }
}

class Section2 extends mainMovement {
    constructor(tier, targets) {
        super(tier, targets);
        this.lifetimeCocoaHoney = 0;
        this.prestigeTimes = 0;
    }

    main() {
        if (cocoaHoneyToGet.gte(2 ** this.prestigeTimes)) {
            this.cocoaPrestigeNoConfirm();
        }

        this.buyAltarUpgrades();
        super.main();
    }

    cocoaPrestigeNoConfirm() {
        // script.js: 1570
        if (cocoaHoneyToGet.gt(0)) {
            game.cocoaHoney = game.cocoaHoney.add(cocoaHoneyToGet);
            this.lifetimeCocoaHoney += cocoaHoneyToGet;
            this.prestigeTimes++;
            cocoaReset();
        }
    }

    buyAltarUpgrades() {
        for (const [k, v] of Object.entries(cocoaUpgrades)) {
            if (game.cocoaHoney.gte(v)) {
                buyAltarUpgrade(k);
            }
        }
    }
}

function main() {
    if (started) {
        if (!getSpecialItems()[1] || game.level.lte(25)) {
            s1.main();
        } else {
            s2.main();
        }
    }
}

let s1 = new Section1(0, {
    0: 10,
    1: 13,
    2: 17,
    3: 999,
});
let s2 = new Section2(1, {
    0: 40,
    1: 55,
    2: 80,
    3: 999,
});

setInterval(main, 20);
setTitleText();
GM_registerMenuCommand("Toggle autoplay", () => {
    started = !started;
    setTitleText();
});
