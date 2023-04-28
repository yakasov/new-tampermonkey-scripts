// ==UserScript==
// @name         Endless Stairwell Autoplay
// @namespace    https://raw.githubusercontent.com/yakasov/new-tampermonkey-scripts/master/Endless%Stairwell%20Autoplay.users.js
// @version      0.3.8
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
const sharkShopFloor = 149;
const cocoaUpgrades = { 1: 6, 3: 5, 4: 40, 5: 115, 6: 600, 7: 2200 };

function setTitleText() {
    let el = document.getElementsByClassName("title-bar-text")[0];
    let prestigeAt = format(game.cocoaHoney.mul(2), 0);
    el.innerText = `Endless Stairwell - Autoplay ${
        started ? "ON" : "OFF"
    } - Prestige @ ${prestigeAt}`;
}

class mainFuncs {
    constructor(tier, targets) {
        this.floorTarget = 0;
        this.tier = tier;
        this.targets = targets; // level must be > (v) to go to difficulty (k + 1)
        this.buffed = false; // use buffed so floorTarget doesn't get incremented more than once
        this.floorTargetOverride = null; // useful for fighting a specific floor eg 49
    }

    main() {
        if (cocoaHoneyToGet.gte(game.cocoaHoney.mul(2))) {
            this.cocoaPrestigeNoConfirm();
            setTitleText();
        }

        this.setFloorTarget();

        if (
            !this.floorTargetOverride &&
            game.currentFloor !==
                game.floorsWithRooms[this.tier][this.floorTarget] &&
            game.roomsFromStairwell
        ) {
            // move to stairwell if floorTarget has changed
            this.moveToStairwell();
        } else if (this.checkTempRunes && game.level.lte(500)) {
            this.getTempRunes();
        } else if (this.checkPermRunes && game.level.lte(500)) {
            this.getPermRunes(this.checkPermRunes);
        } else {
            this.getXP();
        }
    }

    setFloorTarget() {
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
            return this.moveToStairwell();
        }

        if (this.moveToFloor(game.smithFloor)) {
            for (let i = 1; i < 4; i++) {
                smithRune(i);
            }
        }
    }

    getPermRunes(i) {
        if (game.roomsFromStairwell) {
            return this.moveToStairwell();
        }

        if (this.moveToFloor(game.smithFloor + 1)) {
            smithPermaRune(i);
        }
    }

    basicAttack() {
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
            if (
                game.health.lte(game.maxHealth.div(1.8)) &&
                game.health.lte(1e5)
            ) {
                // go to stairwell if health low
                toStairwell();
            } else if (game.energy === 100) {
                // only move on if energy maxed again
                newRoom();
            }
        }
    }

    moveToFloor(floor, enter = false) {
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

    moveToStairwell() {
        if (game.fightingMonster) {
            this.basicAttack();
        } else {
            toStairwell();
        }
    }

    getXP() {
        if (
            this.moveToFloor(
                this.floorTargetOverride ??
                    game.floorsWithRooms[this.tier][this.floorTarget],
                true
            )
        ) {
            this.basicAttack();
        }
    }

    cocoaPrestigeNoConfirm() {
        // script.js: 1570
        if (cocoaHoneyToGet.gt(0)) {
            game.cocoaHoney = game.cocoaHoney.add(cocoaHoneyToGet);
            this.lifetimeCocoaHoney += cocoaHoneyToGet;
            cocoaReset();
        }
    }
}

class Section1 extends mainFuncs {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        if (game.specialItemsAcquired[0] && game.level.gte(15)) {
            this.floorTargetOverride = blueKeyFloor;
        } else {
            this.floorTargetOverride = null;
        }

        super.main();
    }
}

class Section2 extends mainFuncs {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        this.buyAltarUpgrades();
        super.main();
    }

    buyAltarUpgrades() {
        for (const [k, v] of Object.entries(cocoaUpgrades)) {
            if (game.cocoaHoney.gte(v)) {
                buyAltarUpgrade(k);
            }
        }
    }
}

class Section3 extends mainFuncs {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        this.buySharkUpgrades();
        if (game.cocoaBars < 10) {
            this.gainCocoaBarsNoConfirm();
        }
        super.main();
    }

    buySharkUpgrades() {
        for (let i = 2; i < 12; i++) {
            buySharkUpgrade(i);
        }
    }

    basicAttack() {
        if (
            game.fightingMonster &&
            game.altarUpgradesBought[6] &&
            game.monsterHealth.gt(game.attackDamage)
        ) {
            flee();
            return toStairwell();
        }
        super.basicAttack();
    }

    gainCocoaBarsNoConfirm() {
        // script.js: 2025
        if (game.cocoaHoney.gte(cocoaBarRequirement)) {
            game.cocoaBars++;
            cocoaReset();
            game.cocoaHoney = ExpantaNum(0);
            if (game.cocoaBars >= 10) {
                document.getElementById("darkOrbIcon").style.display = "block";
                document.getElementById("darkOrbText").style.display = "block";
            }
            for (i = 0; i < cbmRequirements.length; i++) {
                if (game.cocoaBars >= cbmRequirements[i]) {
                    document.getElementsByClassName("cocoaBarMilestoneDiv")[
                        i
                    ].style.backgroundColor = "#40d040";
                }
            }
            if (game.cocoaBars >= 20) {
                document.getElementById("ringIcon").src = "img/ring3.png";
                document.getElementById("hyperplasmIcon").style.display =
                    "block";
                document.getElementById("hyperplasmText").style.display =
                    "block";
                document.getElementById("darkBarIcon").style.display = "block";
                document.getElementById("darkBarText").style.display = "block";
                document.getElementById("starBarIcon").style.display = "block";
                document.getElementById("starBarText").style.display = "block";
            }
        }
    }
}

function main() {
    if (started) {
        if ((document.getElementById("deathDiv").style.display = "block")) {
            deathClose();
        }

        if (!game.specialItemsAcquired[1] || game.level.lte(25)) {
            s1.main();
        } else if (
            (!game.altarUpgradesBought[6] && game.cocoaHoney.lte(2e4)) ||
            game.level.lte(1e100)
        ) {
            s2.main();
        } else {
            s3.main();
        }
    }
}

let s1 = new Section1(0, { 0: 10, 1: 13, 2: 17, 3: Infinity });
let s2 = new Section2(1, { 0: 40, 1: 55, 2: 80, 3: Infinity });
let s3 = new Section3(2, { 0: 1e200, 1: 1e1000, 2: 1e5000, 3: Infinity });

setInterval(main, 20);
setTitleText();
GM_registerMenuCommand("Toggle autoplay", () => {
    started = !started;
    setTitleText();
});
