// ==UserScript==
// @name         Array Game Autoplay
// @namespace    https://raw.githubusercontent.com/yakasov/new-tampermonkey-scripts/master/Array%20Game%20Autoplay.users.js
// @version      0.4.3
// @description  Autoplays Array Game by Demonin
// @author       yakasov
// @match        https://demonin.com/games/arrayGame/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=demonin.com
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* eslint-disable no-undef */
let started = false;
let challenges = {
  0: {
    1: { BAmount: new Decimal(1e9), CAmount: new Decimal(1) },
    2: { BAmount: new Decimal(1e8), CAmount: new Decimal(2) },
    3: { BAmount: new Decimal(2e11), CAmount: new Decimal(3) },
    4: { BAmount: new Decimal(1e15), CAmount: new Decimal(30) },
    5: { BAmount: new Decimal(2e22), CAmount: new Decimal(50) },
    6: { BAmount: new Decimal(2e36), CAmount: new Decimal(50) },
  },
  1: {
    1: { BAmount: new Decimal(1e11), CAmount: new Decimal(10) },
    2: { BAmount: new Decimal(1e15), CAmount: new Decimal(30) },
    3: { BAmount: new Decimal(2e22), CAmount: new Decimal(50) },
    4: { BAmount: new Decimal(2e26), CAmount: new Decimal(50) },
    5: { BAmount: new Decimal(2e32), CAmount: new Decimal(50) },
    6: { BAmount: new Decimal(2e36), CAmount: new Decimal(50) },
  },
  2: {
    1: { BAmount: new Decimal(1e40), CAmount: new Decimal(50) },
    2: { BAmount: new Decimal(3e47) },
    3: { BAmount: new Decimal(2e62) },
    4: { BAmount: new Decimal(8e78) },
    5: { BAmount: new Decimal(1e97), CAmount: new Decimal(2e4) },
    6: { BAmount: new Decimal(2e113), CAmount: new Decimal(1e6) },
  },
  3: {
    1: { BAmount: new Decimal(1e68) },
    2: { BAmount: new Decimal(7e83), CAmount: new Decimal(2e4) },
    3: { BAmount: new Decimal(5e106), CAmount: new Decimal(1e6) },
    4: { BAmount: new Decimal(1e120), CAmount: new Decimal(1e7) },
    5: { BAmount: new Decimal(1e140), CAmount: new Decimal(1e9) },
    6: { BAmount: new Decimal(2e157), CAmount: new Decimal(3e10) },
  },
  4: {
    1: { CAmount: new Decimal(9e99), DAmount: new Decimal(1) },
  },
};

function autobuyA() {
  if (game.CMilestonesReached < 6) {
    // Milestone 6 is upgrade A autobuying
    for (let i = 1; i < 3; i++) {
      buyUpgrade(1, i);
    }

    if (game.BUpgradesBought[4].mag === 1) {
      buyUpgrade(1, 3);
    }
  }

  if (game.CMilestonesReached < 8) {
    // Milestone 8 is gen A autobuying
    buyGenerator(1, getCheapestGen(game.AGeneratorCosts));
  }
}

function autobuyB() {
  if (game.currentChallenge === 0) {
    for (let i = 1; i < 9; i++) {
      if (game.BUpgradesBought[i - 1].mag === 0) {
        buyUpgrade(2, i);
      }
    }

    if (game.CMilestonesReached >= 14) {
      buyUpgrade(2, 9);
    }

    // Only buy B generators if we passively gain B or we don't gain enough for it to be worth waiting for
    if (game.BUpgradesBought[2].mag === 1 || game.array[1].mag < 60) {
      buyABoosterator();
      buyGenerator(2, getCheapestGen(game.BGeneratorCosts));
    }
  }
}

function autobuyC() {
  if (game.currentChallenge === 0) {
    // Save C for A + B multiplier instead of spending whilst unlocking milestones
    if (
      (game.CMilestonesReached >= 6 && game.CGeneratorsBought[0].mag <= 3) ||
      (game.CMilestonesReached >= 8 && game.CGeneratorsBought[0].mag <= 6) ||
      game.CMilestonesReached >= 10
    ) {
      if (game.CGeneratorsBought[1].mag === 0) {
        buyGenerator(3, 2);
      }
      buyGenerator(3, getCheapestGen(game.CGeneratorCosts));
    }
  }
}

function resetForB() {
  // Only prestige if we can actually gain something and if we don't already passively gain B
  if (
    game.currentChallenge === 0 &&
    game.BUpgradesBought[2].mag !== 1 &&
    game.BToGet.mag !== 0 &&
    game.array[0].gte(1e10)
  ) {
    prestigeConfirm(1);
  }
}

function resetForC() {
  // Only prestige if we can actually gain something and if we don't already passively gain C
  if (
    game.currentChallenge === 0 &&
    game.array[1].gte(1e10) &&
    ((game.CMilestonesReached < 5 && game.CToGet.mag >= 1) ||
      (game.CMilestonesReached < 8 && game.CToGet.mag >= 2) ||
      (game.CMilestonesReached < 9 && game.CToGet.mag >= 3) ||
      (game.CMilestonesReached < 10 && game.CToGet.mag >= 5))
  ) {
    prestigeConfirm(2);
  }
}

function resetForD() {
  // Only prestige if we can actually gain something and if we don't already passively gain D
  // Only reset if all 24 A challenges are done
  if (
    game.currentChallenge === 0 &&
    game.challengesBeaten.slice(0, 4) == "6,6,6,6" &&
    game.DToGet.mag !== 0 &&
    game.array[2].gte(1e10)
  ) {
    prestigeConfirm(3);
  }
}

function startChallenges() {
  if (game.currentChallenge === 0 && started) {
    for (const [ch, tiers] of Object.entries(challenges)) {
      for (const [tier, reqs] of Object.entries(tiers)) {
        if (
          game.challengesBeaten[ch] < tier &&
          game.array[1].gte(reqs.BAmount ?? 0) &&
          game.array[2].gte(reqs.CAmount ?? 0) &&
          game.array[3].gte(reqs.DAmount ?? 0)
        ) {
          enterChallenge(parseInt(ch) + 1);
        }
      }
    }
  }
}

function completeChallenges() {
  if (game.currentChallenge !== 0 && started) {
    const ch = game.currentChallenge - 1;
    const tier = game.challengesBeaten[ch];
    const goal = new Decimal(challengeGoals[ch][tier]);
    if (game.array[Math.floor(ch / 4)].gte(goal)) {
      finishChallenge();
    }
  }
}

function getCheapestGen(costs) {
  const min = new Decimal(Math.min(...costs));
  const gen = costs.find((d) => d.equals(min));
  return costs.indexOf(gen) + 1;
}

function setTitleText() {
  let el = document.getElementById("titleText");
  el.innerText = `Array Game - Autoplay ${started ? "ON" : "OFF"}`;
}

function checkConfirmations() {
  for (let i = 1; i < 5; i++) {
    if (game.confirmations[i - 1]) {
      toggleConfirmation(i);
    }
  }
}

function main() {
  if (started) {
    autobuyA();
    autobuyB();
    autobuyC();
    // autobuyD();
  }
}

function mainPrestige() {
  if (started) {
    resetForB();
    resetForC();
    resetForD();
  }
}

GM_registerMenuCommand("Toggle autoplay", () => {
  started = !started;
  setTitleText();
});

setTitleText();
checkConfirmations();
setInterval(main, 100); // 1/10 seconds to try and buy generators (and upgrades)
setInterval(mainPrestige, 15000); // 15 seconds to try and prestige
setInterval(startChallenges, 1000); // 1 second to try and enter challenges
setInterval(completeChallenges, 1000); // 1 second to try and complete challenges
