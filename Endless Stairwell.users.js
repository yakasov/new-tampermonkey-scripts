// ==UserScript==
// @name         Endless Stairwell Autoplay
// @namespace    https://raw.githubusercontent.com/yakasov/new-tampermonkey-scripts/master/Endless%Stairwell%20Autoplay.users.js
// @version      0.8.0
// @description  Autoplays Endless Stairwell by Demonin
// @author       yakasov
// @match        https://demonin.com/games/endlessStairwell/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=demonin.com
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* eslint-disable no-undef */
let started = false;
let currentSection = 0;
let nanMonsters = 0;
const runes = [4, 4, 4];
const blueKeyFloor = 49;
const sharkShopFloor = 149;
const eelFloor = 303;
const cocoaUpgrades = { 1: 6, 3: 5, 4: 40, 5: 115, 6: 600, 7: 2200 };
const fStop = ExpantaNum("10^^11");
const combinator2Upgrades = {
    2: "J110",
    3: "J300",
    4: "J1000",
    5: "J1500",
    6: "J2000",
    8: "J40000",
    9: "J100000",
    10: "J1e29",
};
const bloodUpgrades = {
    0: "J1e44",
    1: "J1e55",
    2: "J1e69",
    3: "J1e87",
    4: "J1e100",
    5: "J1e122",
    6: "J1e420",
    7: "Je1e100",
};

let previousKey = 0;
let pressedKey = 0;
let debugRunOnce = false;

function setTitleText() {
    let el = document.getElementsByClassName("title-bar-text")[0];
    let prestigeAt = format(game.cocoaHoney.mul(2), 0);
    let nextEel = format(ExpantaNum(gemEelLevels[game.gemEelsBeaten]), 0);
    let blood = format(game.monsterBlood, 0);
    el.innerText = `Endless Stairwell - Autoplay ${
        started ? "ON" : "OFF"
    } - Prestige @ ${prestigeAt} - Section ${currentSection} - Last Key ${previousKey} - Pressed Key ${pressedKey} - Next Eel ${nextEel} - Blood ${blood} - Eel Farm Floor ${
        game.floorsWithRooms[5][3]
    } - NaN Monsters ${nanMonsters}`;
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
        if (!game.floorDifficulty && game.fightingMonster) {
            // sometimes, I don't know how, it can get stuck in a fight against a NaN health monster
            // obviously it's impossible to beat so just 'cheat' a bit and exit the fight and go to the stairwell
            // once I figure it out I'll work around it properly
            //
            // they only occur in section 7, at floor ~290 (the top difficulty for tier 6)
            // the floor difficulty is set to 0 for some reason, I dunno
            nanMonsters++;
            game.fightingMonster = false;
            toStairwell();
        } else if (game.roomsExplored >= 3000) {
            // similiarly the automation breaks at room ~4000. again I have no clue why
            // probably just the way the health is increasing or something
            toStairwell();
        }

        if (this.shouldCocoaPrestige) {
            this.cocoaPrestigeNoConfirm();
        }

        this.setFloorTarget();

        if (this.shouldMoveToStairwell) {
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

    get shouldCocoaPrestige() {
        return (
            (cocoaHoneyToGet.gte(game.cocoaHoney.mul(2)) &&
                game.cocoaBars < 9 &&
                game.cocoaHoney.lte("10^^10")) ||
            (cocoaHoneyToGet.gte(cocoaBarRequirements[game.cocoaBars]) &&
                game.cocoaHoney.lt(cocoaBarRequirements[game.cocoaBars])) ||
            (game.cocoaBars >= 19 && game.cocoaHoney.lte("10^^^25")) ||
            (game.cocoaHoney.eq(0) && game.level.gte(500))
        );
    }

    get shouldMoveToStairwell() {
        return (
            !this.floorTargetOverride &&
            game.currentFloor !==
                game.floorsWithRooms[this.tier][this.floorTarget] &&
            game.roomsFromStairwell
        );
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
        if (
            game.fightingMonster &&
            game.altarUpgradesBought[6] &&
            game.monsterHealth.gt(game.attackDamage) &&
            game.level.gte("10^^10")
        ) {
            flee();
            return toStairwell();
        }

        if (
            (game.vanillaHoney.gte(1) &&
                game.energy < 25 &&
                !game.altarUpgradesBought[2]) ||
            game.vanillaHoney.gte(2500)
        ) {
            // consume vanilla honey for energy
            consumeHoney(2);
        }

        if (game.fightingMonster && game.energy > 15) {
            attack();
        } else if (!game.fightingMonster) {
            if (
                game.health.lte(game.maxHealth.div(1.8)) &&
                game.health.lte(1e5)
            ) {
                // go to stairwell if health low
                toStairwell();
            } else if (
                game.energy === 100 ||
                game.attackDamage.gt(game.monsterMaxHealth)
            ) {
                // only move on if energy maxed again or if we can kill in one hit
                newRoom();
            }
        }
    }

    moveToFloor(floor, enter = false) {
        this.fastTravel(floor);

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

    fastTravel(floor) {
        if (
            floor >= 1 &&
            floor <= 25 &&
            game.currentFloor > 25 &&
            game.altarUpgradesBought[4]
        ) {
            toGroundFloor();
        } else if (
            floor >= 26 &&
            floor <= 75 &&
            (game.currentFloor < 25 || game.currentFloor > 75) &&
            game.altarUpgradesBought[4]
        ) {
            toFloor49();
        } else if (
            floor >= 76 &&
            floor <= 125 &&
            (game.currentFloor < 75 || game.currentFloor > 125) &&
            game.altarUpgradesBought[4]
        ) {
            toFloor99();
        } else if (
            floor >= 126 &&
            floor <= 200 &&
            (game.currentFloor < 125 || game.currentFloor > 200) &&
            game.sharkUpgradesBought[2]
        ) {
            toFloor149();
        } else if (
            floor >= 201 &&
            floor <= 275 &&
            (game.currentFloor < 200 || game.currentFloor > 275) &&
            game.combinatorUpgradesBought[2]
        ) {
            toFloor248();
        } else if (
            floor >= 276 &&
            floor <= 325 &&
            (game.currentFloor < 275 || game.currentFloor > 325) &&
            game.combinatorUpgrades2Bought[4]
        ) {
            toFloor299();
        } else if (
            floor >= 326 &&
            game.currentFloor < 325 &&
            game.goldenUpgradesBought[0]
        ) {
            toFloor351();
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
        this.gainCocoaBarsNoConfirm();

        super.main();
    }

    buySharkUpgrades() {
        for (let i = 2; i < 12; i++) {
            buySharkUpgrade(i);
        }
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

class Section4 extends Section3 {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        this.darkOrbPrestigeNoConfirm();
        super.main();
    }

    darkOrbPrestigeNoConfirm() {
        // script.js: 2096
        if (game.cocoaHoney.gte(darkOrbRequirements[game.darkOrbs])) {
            game.darkOrbs++;
            darkOrbReset();
            $("#darkOrbBonuses").html(darkOrbBonuses[game.darkOrbs]);
            if (game.darkOrbs >= 1) {
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[6].style.display = "inline-block";
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[7].style.display = "inline-block";
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[8].style.display = "inline-block";
            }
            if (game.darkOrbs >= 2) {
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[9].style.display = "inline-block";
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[10].style.display = "inline-block";
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[11].style.display = "inline-block";
            }
            if (game.darkOrbs >= 4) {
                document.getElementById("getCocoaBarsButton").disabled = true;
                setInterval(autoCocoaBars, 100);
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[12].style.display = "inline-block";
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[13].style.display = "inline-block";
            }
        }
    }
}

class Section5 extends Section4 {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        this.combinate();
        this.buyCombinatorUpgrades();
        super.main();
    }

    get shouldCocoaPrestige() {
        return (
            game.cocoaHoney.eq(0) ||
            (game.roomsExplored >= 500 && game.cocoaHoney.lt("10^^^10^^2")) ||
            (cocoaHoneyToGet.gte(darkOrbRequirements[game.darkOrbs]) &&
                game.cocoaHoney.lt(darkOrbRequirements[game.darkOrbs]))
        );
    }

    combinate() {
        for (let i = 1; i < 4; i++) {
            combinate(i);
        }
    }

    buyCombinatorUpgrades() {
        for (let i = 1; i < 11; i++) {
            buyCombinatorUpgrade(i);
        }
    }
}

class Section6 extends Section5 {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        this.buyCombinatorUpgrades();
        super.main();
    }

    get shouldCocoaPrestige() {
        for (const [k, v] of Object.entries(combinator2Upgrades)) {
            if (cocoaHoneyToGet.gte(v) && !game.combinatorUpgrades2Bought[k]) {
                return true;
            }
        }
        return super.shouldCocoaPrestige;
    }

    buyCombinatorUpgrades() {
        for (let i = 1; i < 12; i++) {
            buyCombinatorUpgrade2(i);
        }
    }
}

class Section7 extends Section5 {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        if (game.energy < 100) {
            consumeHoney(2);
        }
        this.buyBloodUpgrades();
        this.buyBloodProducers();
        super.main();
    }

    get shouldCocoaPrestige() {
        if (game.roomsExplored >= 500) {
            return true;
        }

        for (const [k, v] of Object.entries(bloodUpgrades)) {
            if (cocoaHoneyToGet.gte(v) && !game.monsterBloodUpgradesBought[k]) {
                return true;
            }
        }

        return super.shouldCocoaPrestige;
    }

    buyBloodUpgrades() {
        for (let i = 1; i < 11; i++) {
            buyMonsterBloodUpgrade(i);
        }
    }

    buyBloodProducers() {
        for (let i = 1; i < 7; i++) {
            buyBloodProducer(i);
        }
    }

    basicAttack() {
        if (
            game.attackDamage.gt(ExpantaNum(gemEelLevels[game.gemEelsBeaten]))
        ) {
            this.floorTargetOverride = eelFloor;
            if (super.moveToFloor(eelFloor, true)) {
                if (game.attackDamage.gt(game.monsterMaxHealth)) {
                    attack();
                } else {
                    flee();
                }
            }
        } else {
            this.floorTargetOverride = game.floorsWithRooms[5][3];
            if (super.moveToFloor(game.floorsWithRooms[5][3], true)) {
                super.basicAttack();
            }
        }
    }
}

function main() {
    if (started || debugRunOnce) {
        if (debugRunOnce) {
            debugRunOnce = false;
        }

        if ((document.getElementById("deathDiv").style.display = "block")) {
            deathClose();
        }

        if (!game.specialItemsAcquired[1] || game.level.lte(25)) {
            currentSection = 1;
            s1.main();
        } else if (
            (!game.altarUpgradesBought[6] && game.cocoaHoney.lte(2e4)) ||
            game.level.lte(1e100)
        ) {
            currentSection = 2;
            s2.main();
        } else if (game.cocoaBars < 10 && !game.sharkUpgradesBought[9]) {
            currentSection = 3;
            s3.main();
        } else if (game.cocoaBars < 20) {
            currentSection = 4;
            s4.main();
        } else if (game.cocoaBars < 25) {
            currentSection = 5;
            s5.main();
        } else if (!game.combinatorUpgrades2Bought[10]) {
            currentSection = 6;
            s6.main();
        } else if (!game.monsterBloodUpgradesBought[9]) {
            currentSection = 7;
            s7.main();
        } else {
            currentSection = 8;
        }
    }
}

let s1 = new Section1(0, { 0: 10, 1: 13, 2: 17, 3: Infinity });
let s2 = new Section2(1, { 0: 40, 1: 55, 2: 80, 3: Infinity });
let s3 = new Section3(2, { 0: 1e200, 1: 1e1000, 2: 1e5000, 3: Infinity });
let s4 = new Section4(3, {
    0: "10^^25",
    1: "10^^50",
    2: "10^^75",
    3: Infinity,
});
let s5 = new Section5(4, {
    0: "10^^^10000000",
    1: "10^^^^3",
    2: "10^^^10^^3",
    3: Infinity,
});
let s6 = new Section6(5, {
    0: "J20",
    1: "J40",
    2: "J80",
    3: Infinity,
});
let s7 = new Section7(6, {});

document.addEventListener("keypress", (event) => {
    pressedKey = event.keyCode;
    if (
        (pressedKey === 122 || pressedKey === 120) &&
        pressedKey !== previousKey
    ) {
        debugRunOnce = true;
        previousKey = pressedKey;
    } else if (pressedKey == 99) {
        started = !started;
    }
});

setInterval(main, 20);
setInterval(setTitleText, 10);
GM_registerMenuCommand("Toggle autoplay", () => {
    started = !started;
});
