// Share pointer/keyboard focus behavior across native image maps and SVG puzzles.
(function () {
  const root = document.documentElement;
  const keyboardClass = "puzzle-keyboard-focus";
  const targets = ["area", ".image-map-targets > [role='button']", ".hotspots > [role='button']"];
  const style = document.createElement("style");
  // Explicit input tracking also works in browsers without :focus-visible.
  style.textContent = `
    ${targets.map(target => "html " + target).join(",")} { outline: none; }
    html:not(.${keyboardClass}) .image-map-targets > [role='button'] { stroke: transparent; }
    ${targets.map(target => "html." + keyboardClass + " " + target + ":focus").join(",")} { outline: 2px solid white; outline-offset: 2px; }
    html.${keyboardClass} .image-map-targets > [role='button']:focus { stroke: white; stroke-width: 2; }
  `;
  document.head.appendChild(style);

  document.addEventListener("keydown", function (event) {
    if (!event.altKey && !event.ctrlKey && !event.metaKey) root.classList.add(keyboardClass);
  }, true);
  function usePointer() {
    root.classList.remove(keyboardClass);
  }
  document.addEventListener("pointerdown", usePointer, true);
  document.addEventListener("mousedown", usePointer, true);
  document.addEventListener("touchstart", usePointer, { capture: true, passive: true });

  // Mouse side buttons pan the puzzle instead of navigating browser history.
  const sideButtonDown = window.PointerEvent ? "pointerdown" : "mousedown";
  for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "auxclick"]) {
    document.addEventListener(type, function (event) {
      if (event.button !== 3 && event.button !== 4) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (type === sideButtonDown) {
        window.scrollBy({ left: event.button === 3 ? -160 : 160, top: 0, behavior: "smooth" });
      }
    }, { capture: true, passive: false });
  }
})();
