/**
 * Imposter Word Game
 * A party game where one player is the imposter with a different word.
 */
(function () {
  "use strict";

  // Game state
  let state = {
    playerCount: 0,
    playerNames: [],
    imposterIndex: -1,
    realWord: "",
    imposterWord: "",
    category: "",
    currentReveal: 0,
    currentVoter: 0,
    votes: {},
    phase: "setup" // setup | names | reveal | discussion | voting | results
  };

  // DOM references
  const screens = {
    setup: document.getElementById("setup-screen"),
    names: document.getElementById("names-screen"),
    reveal: document.getElementById("reveal-screen"),
    discussion: document.getElementById("discussion-screen"),
    voting: document.getElementById("voting-screen"),
    results: document.getElementById("results-screen")
  };

  // --- Utility ---

  function showScreen(name) {
    Object.values(screens).forEach(function (s) { s.classList.add("hidden"); });
    screens[name].classList.remove("hidden");
    state.phase = name;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // --- Setup Screen ---

  document.getElementById("start-btn").addEventListener("click", function () {
    var count = parseInt(document.getElementById("player-count").value, 10);
    if (isNaN(count) || count < 3 || count > 20) {
      showError("setup-error", "Please enter a number between 3 and 20.");
      return;
    }
    state.playerCount = count;
    buildNameInputs(count);
    showScreen("names");
  });

  document.getElementById("player-count").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      document.getElementById("start-btn").click();
    }
  });

  function showError(id, msg) {
    var el = document.getElementById(id);
    el.textContent = msg;
    el.classList.remove("hidden");
    setTimeout(function () { el.classList.add("hidden"); }, 3000);
  }

  // --- Names Screen ---

  function buildNameInputs(count) {
    var container = document.getElementById("name-inputs");
    container.innerHTML = "";
    for (var i = 0; i < count; i++) {
      var div = document.createElement("div");
      div.className = "name-input-row";
      var label = document.createElement("label");
      label.setAttribute("for", "player-name-" + i);
      label.textContent = "Player " + (i + 1);
      var input = document.createElement("input");
      input.type = "text";
      input.id = "player-name-" + i;
      input.placeholder = "Enter name";
      input.maxLength = 20;
      div.appendChild(label);
      div.appendChild(input);
      container.appendChild(div);
    }
  }

  document.getElementById("names-btn").addEventListener("click", function () {
    var names = [];
    for (var i = 0; i < state.playerCount; i++) {
      var val = document.getElementById("player-name-" + i).value.trim();
      if (!val) {
        showError("names-error", "All players must enter a name.");
        return;
      }
      names.push(val);
    }
    // Check for duplicate names
    var uniqueNames = new Set(names.map(function (n) { return n.toLowerCase(); }));
    if (uniqueNames.size !== names.length) {
      showError("names-error", "Player names must be unique.");
      return;
    }
    state.playerNames = names;
    startGame();
  });

  // --- Game Start ---

  function startGame() {
    // Pick category and word pair
    var categories = Object.keys(WORD_CATEGORIES);
    state.category = pickRandom(categories);
    var pair = pickRandom(WORD_CATEGORIES[state.category]);
    // Randomly decide which word is "real" and which is "imposter"
    if (Math.random() < 0.5) {
      state.realWord = pair[0];
      state.imposterWord = pair[1];
    } else {
      state.realWord = pair[1];
      state.imposterWord = pair[0];
    }
    // Pick the imposter
    state.imposterIndex = Math.floor(Math.random() * state.playerCount);
    state.currentReveal = 0;
    state.votes = {};
    showRevealScreen();
  }

  // --- Reveal Screen ---

  function showRevealScreen() {
    showScreen("reveal");
    showPassDevice();
  }

  function showPassDevice() {
    var name = escapeHtml(state.playerNames[state.currentReveal]);
    document.getElementById("reveal-content").innerHTML =
      '<div class="pass-device">' +
      '<h2>Pass the device to</h2>' +
      '<p class="player-name-display">' + name + '</p>' +
      '<button id="reveal-word-btn" class="btn btn-primary">Tap to See Your Word</button>' +
      '</div>';
    document.getElementById("reveal-word-btn").addEventListener("click", function () {
      showWord();
    });
  }

  function showWord() {
    var isImposter = state.currentReveal === state.imposterIndex;
    var name = escapeHtml(state.playerNames[state.currentReveal]);
    var contentHtml;

    if (isImposter) {
      contentHtml =
        '<div class="word-display">' +
        '<p class="player-label">' + name + '</p>' +
        '<p class="imposter-role-label">You are the</p>' +
        '<p class="imposter-role-text">IMPOSTER</p>' +
        '<p class="category-label">Category: ' + escapeHtml(state.category) + '</p>' +
        '<p class="word-hint">You do not get a word. Blend in!</p>' +
        '<button id="next-player-btn" class="btn btn-secondary">Next</button>' +
        '</div>';
    } else {
      contentHtml =
        '<div class="word-display">' +
        '<p class="player-label">' + name + '</p>' +
        '<p class="category-label">Category: ' + escapeHtml(state.category) + '</p>' +
        '<p class="word-text normal-word">' + escapeHtml(state.realWord) + '</p>' +
        '<p class="word-hint">Remember your word, then pass the device.</p>' +
        '<button id="next-player-btn" class="btn btn-secondary">Next</button>' +
        '</div>';
    }

    document.getElementById("reveal-content").innerHTML = contentHtml;

    document.getElementById("next-player-btn").addEventListener("click", function () {
      state.currentReveal++;
      if (state.currentReveal >= state.playerCount) {
        showScreen("discussion");
        startDiscussion();
      } else {
        showPassDevice();
      }
    });
  }

  // --- Discussion Screen ---

  function startDiscussion() {
    var order = shuffleArray(state.playerNames);
    var ol = document.getElementById("speaking-order");
    ol.innerHTML = "";
    order.forEach(function (name) {
      var li = document.createElement("li");
      li.textContent = name;
      ol.appendChild(li);
    });
    document.getElementById("category-reminder").textContent = "Category: " + state.category;
  }

  document.getElementById("vote-btn").addEventListener("click", function () {
    showScreen("voting");
    buildVoting();
  });

  // --- Voting Screen ---

  function buildVoting() {
    var container = document.getElementById("vote-options");
    container.innerHTML = "";
    state.playerNames.forEach(function (name, idx) {
      var btn = document.createElement("button");
      btn.className = "btn btn-vote";
      btn.textContent = name;
      btn.addEventListener("click", function () {
        castVote(idx);
      });
      container.appendChild(btn);
    });
    state.currentVoter = 0;
    state.votes = {};
    showVoterPrompt();
  }

  function showVoterPrompt() {
    document.getElementById("voter-prompt").textContent =
      state.playerNames[state.currentVoter] + ", vote for who you think is the imposter:";
    // Disable voting for yourself
    var btns = document.querySelectorAll("#vote-options .btn-vote");
    btns.forEach(function (btn, idx) {
      btn.disabled = idx === state.currentVoter;
      btn.classList.remove("voted");
    });
  }

  function castVote(targetIdx) {
    state.votes[state.currentVoter] = targetIdx;
    state.currentVoter++;
    if (state.currentVoter >= state.playerCount) {
      tallyVotes();
    } else {
      showVoterPrompt();
    }
  }

  function tallyVotes() {
    var tally = {};
    state.playerNames.forEach(function (_, idx) { tally[idx] = 0; });
    Object.values(state.votes).forEach(function (targetIdx) {
      tally[targetIdx]++;
    });

    // Find the player(s) with the most votes
    var maxVotes = Math.max.apply(null, Object.values(tally));
    var accused = [];
    Object.keys(tally).forEach(function (idx) {
      if (tally[idx] === maxVotes) accused.push(parseInt(idx, 10));
    });

    showResults(tally, accused, maxVotes);
  }

  // --- Results Screen ---

  function showResults(tally, accused, maxVotes) {
    showScreen("results");

    var imposterName = state.playerNames[state.imposterIndex];
    var imposterCaught = accused.length === 1 && accused[0] === state.imposterIndex;

    // Outcome message
    var outcomeEl = document.getElementById("outcome");
    if (imposterCaught) {
      outcomeEl.innerHTML = '<span class="outcome-win">&#127881; The group wins!</span>';
    } else {
      outcomeEl.innerHTML = '<span class="outcome-lose">&#128123; The imposter wins!</span>';
    }

    // Imposter reveal
    document.getElementById("imposter-reveal").innerHTML =
      'The imposter was <strong>' + escapeHtml(imposterName) + '</strong>';

    // Word reveal
    document.getElementById("word-reveal").innerHTML =
      'The word was: <strong>' + escapeHtml(state.realWord) + '</strong>';

    // Vote breakdown
    var breakdownEl = document.getElementById("vote-breakdown");
    breakdownEl.innerHTML = "";
    state.playerNames.forEach(function (name, idx) {
      var div = document.createElement("div");
      div.className = "vote-row";
      if (idx === state.imposterIndex) div.classList.add("is-imposter");
      var votesFormatted = tally[idx] === 1 ? "1 vote" : tally[idx] + " votes";
      div.innerHTML = '<span class="vote-name">' + escapeHtml(name) +
        (idx === state.imposterIndex ? ' <span class="imposter-badge">IMPOSTER</span>' : '') +
        '</span><span class="vote-count">' + votesFormatted + '</span>';
      breakdownEl.appendChild(div);
    });
  }

  document.getElementById("play-again-btn").addEventListener("click", function () {
    showScreen("setup");
    document.getElementById("player-count").value = "";
  });

  // --- Init ---
  showScreen("setup");
})();
