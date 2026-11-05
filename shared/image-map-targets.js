// SVG hit targets keep image-map coordinates aligned under CSS zoom and rotation.
(function () {
  const namespace = "http://www.w3.org/2000/svg";
  const images = document.querySelectorAll("img[usemap]");
  if (!images.length) return;

  const style = document.createElement("style");
  style.textContent = `
    .image-map-targets { position:absolute; z-index:4; pointer-events:none; }
    .image-map-targets > * { fill:transparent; pointer-events:all; cursor:pointer; }
    .image-map-targets > :focus-visible { stroke:white; stroke-width:2; }
  `;
  document.head.appendChild(style);

  images.forEach(image => {
    const name = image.getAttribute("usemap").replace(/^#/, "");
    const map = Array.from(document.querySelectorAll("map")).find(map => map.name === name);
    if (!map) return;

    const svg = document.createElementNS(namespace, "svg");
    svg.classList.add("image-map-targets");
    svg.setAttribute("aria-label", "Elementos escondidos");
    svg.setAttribute("preserveAspectRatio", "none");
    image.after(svg);
    // Keep the original areas and their handlers for hints, overlays and saved progress.
    image.removeAttribute("usemap");

    const originalCoords = new WeakMap();
    let entries = [];

    function syncGeometry() {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const width = image.clientWidth;
      const height = image.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.style.left = `${image.offsetLeft}px`;
      svg.style.top = `${image.offsetTop}px`;
      svg.style.width = `${image.clientWidth}px`;
      svg.style.height = `${image.clientHeight}px`;
      entries.forEach(({ area, target }) => {
        const coords = originalCoords.get(area).map((value, index) =>
          value * (index % 2 ? height / image.naturalHeight : width / image.naturalWidth)
        );
        // Existing answer-overlay handlers expect coordinates in displayed CSS pixels.
        area.coords = coords.join(",");
        if (area.shape === "rect") {
          target.setAttribute("x", Math.min(coords[0], coords[2]));
          target.setAttribute("y", Math.min(coords[1], coords[3]));
          target.setAttribute("width", Math.abs(coords[2] - coords[0]));
          target.setAttribute("height", Math.abs(coords[3] - coords[1]));
        } else if (area.shape === "circle") {
          ["cx", "cy", "r"].forEach((key, index) => target.setAttribute(key, coords[index]));
        } else {
          target.setAttribute("points", coords.join(","));
        }
      });
    }

    function renderTargets() {
      entries = Array.from(map.querySelectorAll("area")).map((area, index) => {
        if (!originalCoords.has(area)) originalCoords.set(area, area.coords.split(",").map(Number));
        const shape = area.shape === "rect" || area.shape === "circle" ? area.shape : "polygon";
        const target = document.createElementNS(namespace, shape);
        target.setAttribute("role", "button");
        target.setAttribute("tabindex", "0");
        target.setAttribute("aria-label", `Elemento escondido ${index + 1}`);
        target.addEventListener("click", () => area.click());
        target.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            area.click();
          }
        });
        return { area, target };
      });
      // Native image maps give the first overlapping area priority.
      svg.replaceChildren(...entries.map(entry => entry.target).reverse());
      syncGeometry();
    }

    renderTargets();
    syncGeometry();
    image.addEventListener("load", syncGeometry);
    new ResizeObserver(syncGeometry).observe(image);
    // Celtic replaces its map when the player changes levels.
    new MutationObserver(renderTargets).observe(map, {
      childList: true, subtree: true
    });
  });
})();
