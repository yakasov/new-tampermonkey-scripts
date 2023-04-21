// ==UserScript==
// @name         Array Game Autoplay
// @namespace    https://yakasov.github.io/
// @version      0.3.1
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
    1: {
      BAmount: new Decimal(1e9),
      CAmount: new Decimal(1),
    },
    2: {
      BAmount: new Decimal(1e8),
      CAmount: new Decimal(2),
    },
    3: {
      BAmount: new Decimal(2e11),
      CAmount: new Decimal(3),
    },
  },
};

function autobuyA() {
  for (let i = 1; i < 3; i++) {
    buyUpgrade(1, i);
  }

  if (game.BUpgradesBought[4].mag === 1) {
    buyUpgrade(1, 3);
  }

  buyGenerator(1, getCheapestGen(game.AGeneratorCosts));
}

function resetForB() {
  // Only prestige if we can actually gain something and if we don't already passively gain B
  if (game.BToGet.mag !== 0 && game.BUpgradesBought[2].mag !== 1) {
    prestigeConfirm(1);
  }
}

function autobuyB() {
  if (game.currentChallenge === 0) {
    for (let i = 1; i < 9; i++) {
      if (game.BUpgradesBought[i - 1].mag === 0) {
        buyUpgrade(2, i);
      }
    }

    // Only buy B generators if we passively gain B or we don't gain enough for it to be worth waiting for
    if (game.BUpgradesBought[2].mag === 1 || game.array[1].mag < 60) {
      buyABoosterator();
      buyGenerator(2, getCheapestGen(game.BGeneratorCosts));
    }
  }
}

function resetForC() {
  // Only prestige if we can actually gain something and if we don't already passively gain C
  if (game.CToGet.mag !== 0 && game.CMilestonesReached < 10) {
    if (game.CMilestonesReached < 3) {
      prestigeConfirm(2);
    } else if (game.CMilestonesReached < 5 && game.CToGet.mag >= 2) {
      prestigeConfirm(2);
    } // up to milestone 5, ch-a2
  }
}

function startChallenges() {
  if (game.currentChallenge === 0 && started) {
    for (const [ch, tiers] of Object.entries(challenges)) {
      for (const [tier, reqs] of Object.entries(tiers)) {
        if (
          game.challengesBeaten[ch] < tier &&
          game.array[1].gte(reqs.BAmount) &&
          game.array[2].gte(reqs.CAmount)
        ) {
          enterChallenge(ch + 1);
        }
      }
    }
  }
}

function playChallenges() {
  if (game.currentChallenge !== 0 && started) {
    const challenge = Math.floor(game.currentChallenge / 6);
    const tier = (game.currentChallenge % 6) + 1;
    const goal = new Decimal(challengeGoals[challenge][tier]);
    switch (challenge) {
      // just guessing how the game.currentChallenge val works
      case 0:
        if (game.array[0].gt(goal)) {
          finishChallenge();
        }
        break;
      case 1:
        break;
      // B
      default:
        break;
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
    // autobuyC();
    // autobuyD();
  }
}

function mainPrestige() {
  if (started) {
    resetForB();
    // resetForC();
    // resetForD();
  }
}

GM_registerMenuCommand("Toggle autoplay", () => {
  started = !started;
  setTitleText();
});

setTitleText();
checkConfirmations();
setInterval(main, 100); // 1/10 seconds to try and buy generators (and upgrades)
setInterval(mainPrestige, 45000); // 45 seconds to try and prestige
setInterval(startChallenges, 1000); // 1 second to try and enter challenges
setInterval(playChallenges, 1000); // 1 second to try and play challenges
