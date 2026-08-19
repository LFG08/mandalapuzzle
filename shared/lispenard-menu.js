(function () {
  const menu = document.getElementById("wordMenu");
  const container = document.querySelector(".container");
  const toggle = document.getElementById("toggleMenu");
  if (!menu || !container) return;

  const prefix = `${location.pathname.replace(/\W+/g, "_")}_`;
  let menuZoom = Number(localStorage.getItem(prefix + "menuZoom")) || 1;
  let mandalaZoom = Number(localStorage.getItem(prefix + "mandalaZoom")) || 1;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value.toFixed(2))));
  }

  function syncMenuZoom() {
    document.documentElement.style.setProperty("--menu-zoom", menuZoom);
  }

  const menuHeaderActions = menu.querySelector("#menuHeader .right, #menuHeader .title:last-child");
  if (menuHeaderActions) {
    const fontControls = document.createElement("span");
    fontControls.className = "menu-font-controls";
    fontControls.setAttribute("aria-label", "Tamanho da fonte");
    fontControls.innerHTML = '<span class="menu-font-label">fonte</span><button type="button" data-font-step="-0.1" aria-label="Diminuir fonte">−</button><button type="button" data-font-step="0.1" aria-label="Aumentar fonte">+</button>';
    menuHeaderActions.prepend(fontControls);
    fontControls.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-font-step]");
      if (!button) return;
      menuZoom = clamp(menuZoom + Number(button.dataset.fontStep), .75, 1.8);
      localStorage.setItem(prefix + "menuZoom", menuZoom);
      syncMenuZoom();
    });
  }

  function syncMandalaZoom(nextZoom, event) {
    const oldZoom = mandalaZoom;
    const newZoom = clamp(nextZoom, .5, 2.5);
    if (newZoom === oldZoom) return;

    const anchorX = event ? event.clientX : innerWidth / 2;
    const anchorY = event ? event.clientY : innerHeight / 2;
    const rect = container.getBoundingClientRect();
    const contentX = (scrollX + anchorX - (scrollX + rect.left)) / oldZoom;
    const contentY = (scrollY + anchorY - (scrollY + rect.top)) / oldZoom;

    mandalaZoom = newZoom;
    container.style.zoom = mandalaZoom;
    localStorage.setItem(prefix + "mandalaZoom", mandalaZoom);

    scrollTo(
      scrollX + rect.left + contentX * newZoom - anchorX,
      scrollY + rect.top + contentY * newZoom - anchorY
    );
  }

  syncMenuZoom();
  container.style.zoom = mandalaZoom;

  window.addEventListener("load", function () {
    menu.classList.remove("mobile-pinned", "pinned-bottom-collapsed", "pinned-top-left", "pinned-top-right");
    menu.style.right = "auto";
    menu.style.bottom = "auto";
  });

  document.addEventListener("wheel", function (event) {
    if (event.target.closest(".tipOverlay")) return;
    if (event.target.closest("#wordMenu")) return;
    event.preventDefault();
    syncMandalaZoom(mandalaZoom * (event.deltaY < 0 ? 1.1 : .9), event);
  }, { passive: false });

  if (toggle) {
    function syncToggle() {
      const collapsed = menu.classList.contains("collapsed");
      toggle.textContent = collapsed ? "+" : "–";
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.setAttribute("aria-label", collapsed ? "Expandir menu" : "Minimizar menu");
      toggle.title = collapsed ? "Expandir menu" : "Minimizar menu";
    }
    toggle.addEventListener("click", function () { requestAnimationFrame(syncToggle); });
    syncToggle();
  }

  const infoWrappers = Array.from(menu.querySelectorAll(".info-wrapper"));
  function closeInfoTooltips(exceptWrapper) {
    infoWrappers.forEach(function (wrapper) {
      if (wrapper !== exceptWrapper) {
        wrapper.classList.remove("active");
        wrapper.querySelector(".info-btn")?.setAttribute("aria-expanded", "false");
      }
    });
  }
  infoWrappers.forEach(function (wrapper) {
    const button = wrapper.querySelector(".info-btn");
    if (!button) return;
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      const willOpen = !wrapper.classList.contains("active");
      closeInfoTooltips();
      wrapper.classList.toggle("active", willOpen);
      button.setAttribute("aria-expanded", String(willOpen));
    });
  });
  document.addEventListener("click", function (event) {
    if (event.target.closest(".info-wrapper")) return;
    closeInfoTooltips();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeInfoTooltips();
  });

  const navigationKeys = {
    a: [-1, 0],
    s: [0, 1],
    w: [0, -1],
    d: [1, 0]
  };
  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    const direction = navigationKeys[event.key.toLowerCase()];
    if (!direction) return;
    event.preventDefault();
    // Keep WASD navigation close to the browser's arrow-key scrolling: use a
    // smaller increment and let successive key-repeat events blend together.
    const step = 40;
    window.scrollBy({
      left: direction[0] * step,
      top: direction[1] * step,
      behavior: "smooth"
    });
  });

  const resizeMargin = 10;
  let resize = null;
  function resizeEdges(event) {
    // Leave the word list (including its native scrollbar) to the browser. Treating
    // a scrollbar press as an east-edge resize hides the scrollbar while the user
    // is trying to scroll it.
    if (menu.classList.contains("collapsed") || event.target.closest("#wordList, button, a, select")) return "";
    const rect = menu.getBoundingClientRect();
    return `${event.clientY - rect.top <= resizeMargin ? "n" : event.clientY >= rect.bottom - resizeMargin ? "s" : ""}${event.clientX - rect.left <= resizeMargin ? "w" : event.clientX >= rect.right - resizeMargin ? "e" : ""}`;
  }
  menu.addEventListener("pointerdown", function (event) {
    const edges = resizeEdges(event);
    if (!edges) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = menu.getBoundingClientRect();
    resize = { edges, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    menu.style.maxHeight = "none";
    menu.setPointerCapture?.(event.pointerId);
  }, true);
  document.addEventListener("pointermove", function (event) {
    if (!resize) return;
    const dx = event.clientX - resize.x;
    const dy = event.clientY - resize.y;
    let { left, top, width, height } = resize;
    if (resize.edges.includes("e")) width = Math.max(190, resize.width + dx);
    if (resize.edges.includes("s")) height = Math.max(120, resize.height + dy);
    if (resize.edges.includes("w")) { left = Math.min(resize.left + dx, resize.left + resize.width - 190); width = resize.width + resize.left - left; }
    if (resize.edges.includes("n")) { top = Math.min(resize.top + dy, resize.top + resize.height - 120); height = resize.height + resize.top - top; }
    menu.style.left = `${Math.max(0, left)}px`;
    menu.style.top = `${Math.max(0, top)}px`;
    menu.style.width = `${width}px`;
    menu.style.height = `${height}px`;
  });
  function stopResize() { resize = null; }
  document.addEventListener("pointerup", stopResize);
  document.addEventListener("pointercancel", stopResize);
}());
