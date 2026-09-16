(function () {
  const menu = document.getElementById("wordMenu");
  const container = document.querySelector("[data-zoom-container]") || document.querySelector(".container");
  const toggle = document.getElementById("toggleMenu");
  if (!menu || !container) return;

  const prefix = `${location.pathname.replace(/\W+/g, "_")}_`;
  let menuZoom = Number(localStorage.getItem(prefix + "menuZoom")) || 1;
  let mandalaZoom = Number(localStorage.getItem(prefix + "mandalaZoom")) || 1;
  let scrollZoomEnabled = localStorage.getItem(prefix + "scrollZoom") !== "off";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value.toFixed(2))));
  }

  function syncMenuZoom() {
    document.documentElement.style.setProperty("--menu-zoom", menuZoom);
    requestAnimationFrame(keepMenuInViewport);
  }

  function keepMenuInViewport() {
    const rect = menu.getBoundingClientRect();
    const gutter = 8;
    const maxLeft = Math.max(gutter, innerWidth - rect.width - gutter);
    const maxTop = Math.max(gutter, innerHeight - Math.min(rect.height, innerHeight - gutter * 2) - gutter);
    const left = Math.min(maxLeft, Math.max(gutter, rect.left));
    const top = Math.min(maxTop, Math.max(gutter, rect.top));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  const menuHeaderActions = menu.querySelector("#menuHeader .right, #menuHeader .title:last-child");
  if (menuHeaderActions) {
    const fontControls = document.createElement("span");
    fontControls.className = "menu-font-controls";
    fontControls.setAttribute("aria-label", "Zoom do menu");
    fontControls.innerHTML = '<span class="menu-font-label" aria-hidden="true">🔍</span><button type="button" data-font-step="-0.1" aria-label="Diminuir zoom do menu">−</button><button type="button" data-font-step="0.1" aria-label="Aumentar zoom do menu">+</button>';
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
    const configuredMinimum = Number(container.dataset.minZoom);
    const minimumZoom = container.dataset.minZoom === "fit"
      ? Math.min(1, Math.max(innerWidth / container.offsetWidth, innerHeight / container.offsetHeight))
      : Number.isFinite(configuredMinimum) && configuredMinimum > 0 ? configuredMinimum : .5;
    const newZoom = clamp(nextZoom, minimumZoom, 2.5);
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
  if (container.dataset.minZoom === "fit") {
    const fitMinimum = Math.min(1, Math.max(innerWidth / container.offsetWidth, innerHeight / container.offsetHeight));
    mandalaZoom = clamp(mandalaZoom, fitMinimum, 2.5);
  } else {
    const configuredMinimum = Number(container.dataset.minZoom);
    if (Number.isFinite(configuredMinimum) && configuredMinimum > 0) {
      mandalaZoom = clamp(mandalaZoom, configuredMinimum, 2.5);
    }
  }
  container.style.zoom = mandalaZoom;

  const scrollZoomToggle = document.createElement("button");
  scrollZoomToggle.type = "button";
  scrollZoomToggle.className = "scroll-zoom-toggle";
  function syncScrollZoomToggle() {
    scrollZoomToggle.textContent = `Scroll Zoom: ${scrollZoomEnabled ? "On" : "Off"}`;
    scrollZoomToggle.setAttribute("aria-pressed", String(scrollZoomEnabled));
    scrollZoomToggle.title = "Clique ou use o botão direito fora do menu para alternar";
  }
  function toggleScrollZoom() {
    scrollZoomEnabled = !scrollZoomEnabled;
    localStorage.setItem(prefix + "scrollZoom", scrollZoomEnabled ? "on" : "off");
    syncScrollZoomToggle();
  }
  syncScrollZoomToggle();
  menu.appendChild(scrollZoomToggle);
  scrollZoomToggle.addEventListener("click", toggleScrollZoom);
  scrollZoomToggle.addEventListener("contextmenu", function (event) {
    event.preventDefault();
    toggleScrollZoom();
  });

  window.addEventListener("load", function () {
    menu.classList.remove("mobile-pinned", "pinned-bottom-collapsed", "pinned-top-left", "pinned-top-right");
    menu.style.right = "auto";
    menu.style.bottom = "auto";
    keepMenuInViewport();
  });
  window.addEventListener("resize", function () {
    requestAnimationFrame(keepMenuInViewport);
    if (container.dataset.minZoom === "fit") syncMandalaZoom(mandalaZoom);
  });

  document.addEventListener("wheel", function (event) {
    if (event.target.closest(".tipOverlay")) return;
    if (event.target.closest("#wordMenu")) return;
    if (!scrollZoomEnabled) return;
    event.preventDefault();
    syncMandalaZoom(mandalaZoom * (event.deltaY < 0 ? 1.1 : .9), event);
  }, { passive: false });

  document.addEventListener("contextmenu", function (event) {
    if (event.target.closest("#wordMenu, .tipOverlay")) return;
    event.preventDefault();
    toggleScrollZoom();
  });

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

  let resize = null;
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "menu-resize-handle";
  resizeHandle.setAttribute("role", "separator");
  resizeHandle.setAttribute("aria-orientation", "vertical");
  resizeHandle.setAttribute("aria-label", "Redimensionar largura do menu");
  menu.appendChild(resizeHandle);

  resizeHandle.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    event.stopPropagation();
    const rect = menu.getBoundingClientRect();
    resize = { pointerId: event.pointerId, x: event.clientX, width: rect.width };
    resizeHandle.setPointerCapture?.(event.pointerId);
  });
  document.addEventListener("pointermove", function (event) {
    if (!resize || event.pointerId !== resize.pointerId) return;
    const dx = event.clientX - resize.x;
    const availableWidth = Math.max(190, innerWidth - menu.getBoundingClientRect().left - 8);
    menu.style.width = `${Math.min(Math.max(190, resize.width + dx), availableWidth)}px`;
  });
  function stopResize(event) {
    if (!resize || event.pointerId !== resize.pointerId) return;
    resize = null;
  }
  document.addEventListener("pointerup", stopResize);
  document.addEventListener("pointercancel", stopResize);
}());
