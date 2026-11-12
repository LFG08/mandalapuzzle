/* Mobile presentation keeps each game's board coordinates and save format intact. */
(function () {
  const board = document.querySelector('#board, .board');
  const tray = document.getElementById('tray');
  const menu = document.querySelector('.trayWrap > .card, .tray-wrap > .status-card, aside.side > .card, #status-card, #statusCard');
  if (!board || !tray || !menu) return;
  const shell = board.closest('main');
  const mobile = matchMedia('(max-width: 900px) and (any-pointer: coarse)');
  const viewport = document.createElement('div');
  viewport.className = 'mobile-board-viewport';
  viewport.setAttribute('aria-label', 'Tabuleiro: deslize para explorar');
  const origin = document.createComment('Original puzzle menu position');
  menu.before(origin);
  menu.classList.add('mobile-jigsaw-menu');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mobile-jigsaw-toggle';
  button.textContent = (menu.querySelector('h1, h2')?.textContent || 'Puzzle') + ' · Menu';
  menu.prepend(button);
  button.addEventListener('click', () => menu.classList.toggle('mobile-jigsaw-collapsed'));
  const tools = document.createElement('div');
  tools.className = 'mobile-jigsaw-tools';
  tools.setAttribute('role', 'group');
  tools.setAttribute('aria-label', 'Controles de toque');
  const explore = document.createElement('button');
  explore.type = 'button';
  explore.textContent = 'Explorar';
  explore.title = 'Deslizar sem mover peças; toque novamente para jogar';
  explore.setAttribute('aria-pressed', 'false');
  explore.addEventListener('click', () => {
    const active = document.body.classList.toggle('jigsaw-exploring');
    explore.setAttribute('aria-pressed', String(active));
    explore.textContent = active ? 'Mover peças' : 'Explorar';
  });
  tools.append(explore);
  let lastPointer;
  for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
    document.addEventListener(type, event => { lastPointer = {x: event.clientX, y: event.clientY}; }, true);
  }
  // The full board extends behind the tray when clipped. Only its visible pane
  // may accept a mobile drop; the original game still decides whether it snaps.
  globalThis.jigsawDropInsideBoard = (x = lastPointer?.x, y = lastPointer?.y) => {
    if (!mobile.matches) return true;
    if (!viewport.isConnected || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const r = viewport.getBoundingClientRect();
    return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
  };
  document.addEventListener('pointercancel', event => {
    if (!mobile.matches) return;
    lastPointer = null;
    // Let native cancellation run first; older engines only release on pointerup.
    queueMicrotask(() => window.dispatchEvent(new PointerEvent('pointerup', {
      pointerId: event.pointerId, pointerType: event.pointerType,
      clientX: -100000, clientY: -100000, buttons: 0
    })));
  }, true);
  let selected;
  if (board.hasAttribute('data-touch-rotate')) {
    const rotate = document.createElement('button');
    rotate.type = 'button'; rotate.textContent = 'Girar peça'; rotate.disabled = true;
    rotate.addEventListener('click', () => {
      if (selected?.isConnected) selected.dispatchEvent(new CustomEvent('jigsaw-touch-rotate'));
    });
    tools.append(rotate);
    document.addEventListener('pointerdown', event => {
      if (!mobile.matches || document.body.classList.contains('jigsaw-exploring')) return;
      const piece = event.target.closest('.piece');
      if (!piece) return;
      selected = piece;
      rotate.disabled = piece.classList.contains('placed') || piece.dataset.touchRotate === 'false';
    }, true);
  }
  if (board.hasAttribute('data-touch-remove')) {
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Retirar peça'; remove.setAttribute('aria-pressed', 'false');
    remove.title = 'Ativar retirada: arraste a peça colocada de volta à bandeja';
    remove.addEventListener('click', () => {
      const active = document.body.classList.toggle('jigsaw-removing');
      globalThis.jigsawTouchRemoval = active;
      remove.setAttribute('aria-pressed', String(active));
    });
    tools.append(remove);
  }
  shell.prepend(tools);
  // Exploring is an explicit alternative to dragging, including on canvas games.
  document.addEventListener('pointerdown', event => {
    if (mobile.matches && event.pointerType === 'touch' && document.body.classList.contains('jigsaw-exploring') &&
      (viewport.contains(event.target) || tray.contains(event.target))) event.stopImmediatePropagation();
  }, true);
  const credits = [...document.querySelectorAll('.credits, .page-credit, .credit, .soundCredits')].filter(node => !menu.contains(node));
  const creditOrigins = credits.map(node => {
    const anchor = document.createComment('Original credits position'); node.before(anchor); return anchor;
  });
  let creditsDetails;
  if (credits.length) {
    creditsDetails = document.createElement('details');
    creditsDetails.className = 'mobile-jigsaw-credits';
    const summary = document.createElement('summary'); summary.textContent = 'Créditos';
    creditsDetails.append(summary);
  }
  function sync() {
    const collapsed = menu.classList.contains('mobile-jigsaw-collapsed');
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? 'Expandir menu do puzzle' : 'Recolher menu do puzzle');
  }
  const journey = document.getElementById('journeyFooter');
  const journeyOrigin = document.createComment('Original journey controls position');
  if (journey) journey.before(journeyOrigin);
  function visibility() {
    const active = mobile.matches && getComputedStyle(shell).display !== 'none';
    document.body.classList.toggle('mobile-jigsaw-active', active);
    if (journey) { if (active) menu.append(journey); else journeyOrigin.after(journey); }
    menu.classList.toggle('mobile-jigsaw-inactive', mobile.matches && !active);
  }
  function layout() {
    if (mobile.matches) {
      if (!viewport.isConnected) { board.before(viewport); viewport.append(board); }
      document.body.append(menu);
      menu.classList.add('mobile-jigsaw-collapsed');
      if (creditsDetails) { credits.forEach(node => creditsDetails.append(node)); menu.append(creditsDetails); }
    } else {
      if (viewport.isConnected) { viewport.before(board); viewport.remove(); }
      origin.after(menu);
      credits.forEach((node, index) => creditOrigins[index].after(node));
      creditsDetails?.remove();
      document.body.classList.remove('jigsaw-exploring', 'jigsaw-removing');
      globalThis.jigsawTouchRemoval = false;
      explore.setAttribute('aria-pressed', 'false'); explore.textContent = 'Explorar';
      tools.querySelectorAll('[aria-pressed]').forEach(control => control.setAttribute('aria-pressed', 'false'));
    }
    visibility(); sync();
  }
  new MutationObserver(sync).observe(menu, {attributes: true, attributeFilter: ['class']});
  new MutationObserver(visibility).observe(shell, {attributes: true, attributeFilter: ['style', 'class', 'hidden']});
  mobile.addEventListener('change', layout);
  layout();
})();
