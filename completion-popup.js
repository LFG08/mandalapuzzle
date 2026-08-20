(function () {
  let popup;
  let closeButton;

  // Keep Próxima restricted to the dedicated caça-palavras/elementos section
  // of the main menu. Puzzles from the "???" and quebra-cabeça sections must
  // not enter this sequence, even when they use this shared completion popup.
  const mainWordElementPuzzles = [
    { path: "goya", key: "goyaPuzzleProgress", total: 18 },
    { path: "arcane", key: "arcanePuzzleProgress", total: 18 },
    { path: "tarits", key: "TARITSPuzzleProgress", total: 20 },
    { path: "unrealunearth", key: "unrealPuzzleProgress", total: 23 },
    { path: "vibevegana", key: "prantasPuzzleProgress", total: 25 },
    { path: "margrego", key: "marPuzzleProgress", total: 26 },
    { path: "losgatos", key: "losgatosPuzzleProgress", total: 26 },
    { path: "ajna", key: "ajnaPuzzleProgress", total: 27 },
    { path: "bichanos", key: "gatosPuzzleProgress", total: 34 },
    { path: "LispenardStreet", key: "lispenardStreetProgressV1", total: 39 },
    { path: "rotadeseda", key: "silkPuzzleProgress", total: 50 }
  ];

  // This denylist is deliberately kept in addition to the allowlist above.
  // It prevents a jigsaw or mystery puzzle from entering the sequence if it is
  // accidentally added to mainWordElementPuzzles during a future menu update.
  const excludedFromNextPaths = new Set([
    "seconds, minutes, hours, days,",
    "celtic",
    "fundodomar",
    "passacaglia",
    "allthewitches",
    "yaga",
    "tyre",
    "flower",
    "alittlepuzzle",
    "pavao",
    "green_eye",
    "lucifer"
  ]);

  function isExcludedFromNext(path) {
    return excludedFromNextPaths.has(path.toLocaleLowerCase());
  }

  function storedProgressCount(key) {
    try {
      const progress = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(progress)) return progress.length;
      if (progress && typeof progress === "object") {
        return Object.values(progress).filter(Boolean).length;
      }
    } catch {
      // A damaged save is treated as unfinished so the puzzle remains available.
    }
    return 0;
  }

  function currentPuzzleIndex() {
    const parts = decodeURIComponent(location.pathname).split("/").filter(Boolean);
    const folder = parts.length > 1 && /\.html$/i.test(parts.at(-1))
      ? parts.at(-2)
      : parts.at(-1);
    if (isExcludedFromNext(folder)) return -1;
    return mainWordElementPuzzles.findIndex(puzzle => puzzle.path === folder);
  }

  function nextUnfinishedPuzzle() {
    const currentIndex = currentPuzzleIndex();
    if (currentIndex < 0) return null;

    for (let offset = 1; offset < mainWordElementPuzzles.length; offset += 1) {
      const puzzle = mainWordElementPuzzles[(currentIndex + offset) % mainWordElementPuzzles.length];
      if (!isExcludedFromNext(puzzle.path) && storedProgressCount(puzzle.key) < puzzle.total) {
        return puzzle;
      }
    }
    return null;
  }

  function closeCompletionPopup() {
    if (!popup) return;
    popup.classList.remove("is-visible");
    popup.setAttribute("aria-hidden", "true");
  }

  function createPopup() {
    popup = document.createElement("div");
    popup.className = "completion-popup";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-modal", "true");
    popup.setAttribute("aria-labelledby", "completionPopupTitle");
    popup.setAttribute("aria-hidden", "true");
    popup.innerHTML = `
      <div class="completion-popup__card">
        <div class="completion-popup__sparkles" aria-hidden="true">✦ ✧ ✦</div>
        <h2 class="completion-popup__title" id="completionPopupTitle">Mandala completa!</h2>
        <p class="completion-popup__message">Você encontrou todas as palavras e elementos.</p>
        <div class="completion-popup__actions">
          <button class="completion-popup__button" type="button" data-completion-action="close">Voltar</button>
          <a class="completion-popup__button" href="../">Menu</a>
          <a class="completion-popup__button" data-completion-action="next">Próxima</a>
        </div>
      </div>`;
    document.body.appendChild(popup);
    closeButton = popup.querySelector('[data-completion-action="close"]');
    const nextButton = popup.querySelector('[data-completion-action="next"]');
    const nextPuzzle = nextUnfinishedPuzzle();
    if (nextPuzzle) {
      nextButton.href = "../" + nextPuzzle.path + "/";
    } else {
      nextButton.remove();
    }
    closeButton.addEventListener("click", closeCompletionPopup);
    popup.addEventListener("click", function (event) {
      if (event.target === popup) closeCompletionPopup();
    });
  }

  window.showCompletionPopup = function () {
    if (!popup) createPopup();
    popup.classList.add("is-visible");
    popup.setAttribute("aria-hidden", "false");
    closeButton.focus();
  };

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && popup?.classList.contains("is-visible")) closeCompletionPopup();
  });
}());
