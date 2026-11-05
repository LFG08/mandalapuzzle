// Find a point safely inside the requested area, away from rounded pixel edges.
const areas = Array.from(document.querySelectorAll("map area"));
const area = areas[arguments[0]];
function contains(area, x, y) {
  const coords = area.coords.split(",").map(Number);
  if (area.shape === "rect") {
    return x > Math.min(coords[0], coords[2]) && x < Math.max(coords[0], coords[2]) &&
      y > Math.min(coords[1], coords[3]) && y < Math.max(coords[1], coords[3]);
  }
  let inside = false;
  for (let i = 0, j = coords.length - 2; i < coords.length; j = i, i += 2) {
    if ((coords[i + 1] > y) !== (coords[j + 1] > y) &&
        x < (coords[j] - coords[i]) * (y - coords[i + 1]) /
          (coords[j + 1] - coords[i + 1]) + coords[i]) inside = !inside;
  }
  return inside;
}
const coords = area.coords.split(",").map(Number);
const xs = coords.filter((_, i) => i % 2 === 0);
const ys = coords.filter((_, i) => i % 2 === 1);
const left = Math.max(0, Math.min(...xs)), right = Math.max(...xs);
const top = Math.max(0, Math.min(...ys)), bottom = Math.max(...ys);
let best = -1, point;
for (let gx = 1; gx < 20; gx++) {
  for (let gy = 1; gy < 20; gy++) {
    const x = left + (right - left) * gx / 20;
    const y = top + (bottom - top) * gy / 20;
    if (!contains(area, x, y)) continue;
    let distance = Infinity;
    if (area.shape === "rect") {
      distance = Math.min(x - left, right - x, y - top, bottom - y) ** 2;
    } else {
      for (let i = 0, j = coords.length - 2; i < coords.length; j = i, i += 2) {
        const dx = coords[i] - coords[j], dy = coords[i + 1] - coords[j + 1];
        const t = Math.max(0, Math.min(1,
          ((x - coords[j]) * dx + (y - coords[j + 1]) * dy) / (dx * dx + dy * dy || 1)));
        distance = Math.min(distance,
          (x - coords[j] - t * dx) ** 2 + (y - coords[j + 1] - t * dy) ** 2);
      }
    }
    if (distance > best) {
      best = distance;
      point = {x, y, expected: areas.findIndex(area => contains(area, x, y))};
    }
  }
}
return point;
