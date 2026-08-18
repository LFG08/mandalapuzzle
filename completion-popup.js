(function () {
  let popup;
  let closeButton;

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
        <button class="completion-popup__button" type="button">Admirar mandala</button>
      </div>`;
    document.body.appendChild(popup);
    closeButton = popup.querySelector(".completion-popup__button");
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
