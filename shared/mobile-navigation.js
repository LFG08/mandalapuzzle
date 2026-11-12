(function () {
  const menu = document.getElementById("wordMenu");
  if (!menu) return;
  const mobile = matchMedia("(max-width: 900px) and (any-pointer: coarse)");
  const puzzle = document.querySelector("[data-zoom-container], .container");
  let viewport;
  if (puzzle) {
    viewport = document.createElement("div");
    viewport.className = "mobile-puzzle-viewport";
    viewport.setAttribute("aria-label", "Área do puzzle: deslize para explorar");
    // Attach only in touch layout; desktop keeps its original DOM structure.
  }
  const toggle = document.getElementById("toggleMenu");
  const header = document.getElementById("menuHeader");
  const controls = document.createElement("div");
  controls.className = "mobile-puzzle-zoom";
  controls.setAttribute("aria-label", "Zoom do puzzle");
  controls.innerHTML = '<button type="button" data-zoom="out" aria-label="Diminuir puzzle">−</button><button type="button" data-zoom="fit">Ver tudo</button><button type="button" data-zoom="in" aria-label="Ampliar puzzle">+</button>';
  header.after(controls);
  controls.addEventListener("click", event => {
    const button = event.target.closest("[data-zoom]");
    if (!button) return;
    const before = puzzle?.getBoundingClientRect();
    const x = viewport ? viewport.scrollLeft + viewport.clientWidth / 2 : 0;
    const y = viewport ? viewport.scrollTop + viewport.clientHeight / 2 : 0;
    document.dispatchEvent(new CustomEvent("puzzle-mobile-zoom", { detail: button.dataset.zoom }));
    if (viewport && before) {
      const ratio = puzzle.getBoundingClientRect().width / before.width;
      viewport.scrollTo(button.dataset.zoom === "fit" ? { left: 0, top: 0 } : {
        left: x * ratio - viewport.clientWidth / 2,
        top: y * ratio - viewport.clientHeight / 2
      });
    }
  });
  function syncToggle() {
    const collapsed = menu.classList.contains("collapsed");
    toggle?.setAttribute("aria-expanded", String(!collapsed));
    toggle?.setAttribute("aria-label", collapsed ? "Expandir menu" : "Recolher menu");
  }
  let desktopCollapsed = menu.classList.contains("collapsed");
  let wasMobile = false;
  function layout() {
    if (mobile.matches) {
      if (!wasMobile) desktopCollapsed = menu.classList.contains("collapsed");
      if (viewport && !viewport.isConnected) { puzzle.before(viewport); viewport.append(puzzle); }
      menu.classList.add("collapsed");
    } else if (wasMobile) {
      if (viewport?.isConnected) { viewport.before(puzzle); viewport.remove(); }
      menu.classList.toggle("collapsed", desktopCollapsed);
    }
    wasMobile = mobile.matches;
    syncToggle();
  }
  layout();
  mobile.addEventListener("change", layout);
  window.addEventListener("load", () => { if (mobile.matches) layout(); });
  new MutationObserver(syncToggle).observe(menu, { attributes: true, attributeFilter: ["class"] });
  // Let the browser pan with one finger and pinch with two. Legacy mouse/pointer
  // drag handlers otherwise compete with native scrolling or move the dock.
  document.addEventListener("pointerdown", event => {
    if (!mobile.matches || event.pointerType !== "touch") return;
    if (event.target.closest("#menuHeader") && !event.target.closest("button,a,input,select")) event.stopPropagation();
    else if (!event.target.closest("#wordMenu, .tipOverlay")) event.stopPropagation();
  }, true);
  let gesture = null, suppressUntil = 0;
  document.addEventListener("touchstart", event => {
    if (!mobile.matches || event.target.closest("#wordMenu, .tipOverlay")) return;
    const touch = event.touches[0];
    if (!gesture) gesture = { x: touch.clientX, y: touch.clientY };
    if (event.touches.length > 1) suppressUntil = Date.now() + 700;
  }, { passive: true });
  document.addEventListener("touchmove", event => {
    if (!gesture) return;
    const touch = event.touches[0];
    if (Math.hypot(touch.clientX - gesture.x, touch.clientY - gesture.y) > 10) suppressUntil = Date.now() + 700;
  }, { passive: true });
  document.addEventListener("touchend", event => { if (!event.touches.length) gesture = null; }, { passive: true });
  document.addEventListener("touchcancel", () => { gesture = null; }, { passive: true });
  document.addEventListener("click", event => {
    if (mobile.matches && Date.now() < suppressUntil && !event.target.closest("#wordMenu, .tipOverlay") && event.detail !== 0) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  function viewportHeight() {
    menu.style.setProperty("--mobile-menu-height", `${Math.round((visualViewport?.height || innerHeight) * .6)}px`);
  }
  visualViewport?.addEventListener("resize", viewportHeight);
  viewportHeight();
})();
