// Read the rendered SVG hit target so hint navigation follows zoom and rotation.
window.PuzzleHints = {
  centerArea(area) {
    if (!area) return;
    const map = area.closest('map');
    const index = Array.from(map.querySelectorAll('area')).indexOf(area);
    const target = document.querySelector(`.image-map-targets [aria-label="Elemento escondido ${index + 1}"]`);
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    const maxX = Math.max(0, document.documentElement.scrollWidth - innerWidth);
    const maxY = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo({
      left: Math.min(maxX, Math.max(0, scrollX + bounds.left + bounds.width / 2 - innerWidth / 2)),
      top: Math.min(maxY, Math.max(0, scrollY + bounds.top + bounds.height / 2 - innerHeight / 2)),
      behavior: 'smooth'
    });
  }
};
