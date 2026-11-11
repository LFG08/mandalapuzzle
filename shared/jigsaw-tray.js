/* Persist the tray separately from each game's existing progress format. */
window.installJigsawTray = function ({tray, getPieces, isBusy = () => false, canvas = false, redraw = () => {}, onRestore = () => {}}) {
  const key = `jigsawTray:v1:${location.pathname.replace(/index\.html$/, '').replace(/\/$/, '')}`;
  let saved = null, initialized = false, resetting = false, queued = false;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch (_) {}
  const nodeOf = piece => piece.node || piece.element;
  function loosePieces() {
    return getPieces().filter(piece => !piece.placed && piece.active !== false && (canvas || tray.contains(nodeOf(piece))));
  }
  function remember() {
    if (!initialized || resetting || isBusy()) return;
    const loose = loosePieces();
    if (!loose.length) return;
    const positions = loose.map(piece => ({id:String(piece.id), x:canvas ? piece.trayX : piece.sourceX, y:canvas ? piece.trayY : piece.sourceY, z:canvas ? 0 : nodeOf(piece).style.zIndex}));
    if (positions.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return;
    try { localStorage.setItem(key, JSON.stringify({positions, scrollX:tray.scrollLeft, scrollY:tray.scrollTop})); } catch (_) {}
  }
  function settle() {
    queued = false;
    if (isBusy()) return;
    const loose = loosePieces();
    if (!loose.length || loose.some(p => !Number.isFinite(canvas ? p.trayX : p.sourceX))) return;
    if (!initialized) {
      initialized = true;
      const positions = new Map(Array.isArray(saved?.positions) ? saved.positions.map(p => [String(p.id), p]) : []);
      if (loose.every(p => {const old=positions.get(String(p.id)); return old && Number.isFinite(old.x) && old.x>=0 && Number.isFinite(old.y) && old.y>=0;})) {
        const rect = tray.getBoundingClientRect();
        let height = 710, width = 0;
        for (const piece of loose) {
          const old = positions.get(String(piece.id));
          if (canvas) { piece.trayX=old.x; piece.trayY=old.y; }
          else {
            const node = nodeOf(piece);
            piece.sourceX=old.x; piece.sourceY=old.y;
            node.style.left=`${old.x}px`; node.style.top=`${old.y}px`;
            if (old.z) node.style.zIndex=old.z;
            piece.currentX=rect.left+old.x-(saved.scrollX||0);
            piece.currentY=rect.top+old.y-(saved.scrollY||0);
            height=Math.max(height,old.y+node.offsetHeight+12);
            width=Math.max(width,old.x+node.offsetWidth+12);
          }
        }
        if (!canvas) {
          tray.style.setProperty('--content-height', `${height}px`);
          tray.style.setProperty('--content-width', `${width}px`);
        }
        onRestore(loose);
        tray.scrollLeft=saved.scrollX||0; tray.scrollTop=saved.scrollY||0;
        redraw();
      }
    }
    remember();
  }
  function schedule() { if (!queued) { queued=true; queueMicrotask(settle); } }
  new MutationObserver(() => { resetting=false; schedule(); }).observe(tray, {childList:true, subtree:true, attributes:true, attributeFilter:['style','class']});
  tray.addEventListener('scroll', remember, {passive:true});
  addEventListener('pointerup', () => { if (!resetting) requestAnimationFrame(schedule); });
  addEventListener('beforeunload', remember);
  addEventListener('pagehide', remember);
  addEventListener('jigsaw-reset', () => {
    resetting=true;
    try { localStorage.removeItem(key); } catch (_) {}
  });
  schedule();
  return schedule;
};
