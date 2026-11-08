/* Presentation only: keep the existing puzzle nodes, events and saved answers. */
(() => {
  const menu = document.getElementById('wordMenu');
  const header = document.getElementById('menuHeader');
  if (!menu || !header) return;
  menu.classList.add('puzzle-panel');
  const key = `puzzlePanel:${location.pathname}`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch (_) {}
  const clamp = (n, min, max) => Math.max(min, Math.min(n, max));
  function fit() {
    if (menu.hidden) return;
    const r = menu.getBoundingClientRect();
    menu.style.left = `${clamp(r.left, 8, innerWidth - r.width - 8)}px`;
    menu.style.top = `${clamp(r.top, 8, innerHeight - r.height - 8)}px`;
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
  }
  function remember() {
    if (menu.hidden) return;
    const r = menu.getBoundingClientRect();
    try { localStorage.setItem(key, JSON.stringify({left:r.left, top:r.top, width:r.width, height:menu.style.height, collapsed:menu.classList.contains('collapsed')})); } catch (_) {}
  }
  for (const prop of ['left', 'top', 'width']) {
    if (Number.isFinite(saved[prop])) menu.style[prop] = `${saved[prop]}px`;
  }
  if (typeof saved.height === 'string') menu.style.height = saved.height;
  if (saved.collapsed) menu.classList.add('collapsed');
  const actions = header.querySelector('.right, .menu-actions, .title:last-child') || header;
  const hide = document.createElement('button');
  hide.type = 'button'; hide.textContent = '\u00d7'; hide.title = 'Ocultar menu'; hide.setAttribute('aria-label', hide.title);
  actions.append(hide);
  const restore = document.createElement('button');
  restore.type = 'button'; restore.className = 'panel-restore'; restore.textContent = 'Mostrar menu'; restore.hidden = true;
  document.body.append(restore);
  hide.onclick = () => { remember(); menu.hidden = true; restore.hidden = false; restore.focus(); };
  restore.onclick = () => { menu.hidden = false; restore.hidden = true; fit(); hide.focus(); };
  const toggle = document.getElementById('toggleMenu');
  function syncToggle() {
    const collapsed = menu.classList.contains('collapsed');
    if (!toggle) return;
    toggle.textContent = collapsed ? '+' : '\u2212';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expandir menu' : 'Minimizar menu');
  }
  if (toggle) toggle.addEventListener('click', () => requestAnimationFrame(() => { syncToggle(); fit(); remember(); }));
  syncToggle();
  // Keep frequent actions visible; preserve secondary controls and their listeners.
  const title = header.querySelector(':scope > .title');
  const counter = header.querySelector('#counter');
  const primary = document.createElement('div');
  primary.className = 'panel-primary';
  if (title && title !== actions) primary.append(title);
  const quick = document.createElement('div');
  quick.className = 'panel-quick';
  if (counter) quick.append(counter);
  if (toggle) quick.append(toggle);
  quick.append(hide);
  primary.append(quick);
  const options = document.createElement('details');
  options.className = 'panel-options';
  const summary = document.createElement('summary');
  summary.textContent = 'Opções';
  summary.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    options.open = !options.open;
  });
  const secondary = document.createElement('div');
  secondary.className = 'panel-secondary';
  // Move nodes instead of rebuilding them: dynamic credits and existing handlers survive.
  while (actions.firstChild) secondary.append(actions.firstChild);
  secondary.querySelectorAll('.menu-font-label').forEach(label => label.remove());
  secondary.querySelectorAll('.menu-font-controls button').forEach(button => {
    const decrease = button.dataset.fontStep?.startsWith('-') || button.id === 'decreaseMenuFont';
    button.textContent = decrease ? '\u2212' : '+';
  });
  secondary.querySelectorAll('.info-btn').forEach(button => {
    const help = button.parentElement.querySelector('.help-tooltip');
    button.textContent = help ? 'Ajuda' : 'Créditos';
    button.setAttribute('aria-label', help ? 'Como jogar' : 'Informações e créditos');
    button.title = button.getAttribute('aria-label');
    button.addEventListener('click', event => {
      event.stopImmediatePropagation();
      const wrapper = button.parentElement;
      const open = !wrapper.classList.contains('active');
      secondary.querySelectorAll('.info-wrapper').forEach(item => {
        item.classList.remove('active');
        item.querySelector('button')?.setAttribute('aria-expanded', 'false');
      });
      wrapper.classList.toggle('active', open);
      button.setAttribute('aria-expanded', String(open));
      positionHelp();
    }, true);
  });
  secondary.querySelectorAll('a.menu-btn').forEach(link => {
    link.textContent = '\u2630'; link.setAttribute('aria-label', 'Voltar ao menu');
    link.title = 'Voltar ao menu';
    quick.insertBefore(link, toggle || hide);
  });
  options.append(summary, secondary);
  actions.remove();
  header.append(primary, options);
  options.addEventListener('toggle', () => { fit(); positionHelp(); });
  const footer = document.createElement('div');
  footer.className = 'panel-footer';
  footer.setAttribute('role', 'group');
  footer.setAttribute('aria-label', 'Controles do jogo');
  menu.querySelectorAll(':scope > button, :scope > select, #menuBody > button, #menuBody > select, #menuBody > .control-row > button').forEach(control => {
    footer.append(control);
  });
  footer.querySelectorAll('select').forEach(select => footer.append(select));
  const reset = footer.querySelector('#clearButton');
  if (reset) footer.append(reset);
  if (footer.childElementCount) menu.append(footer);
  // Capture legacy drag handlers so one pointer gesture has one owner.
  for (const type of ['mousedown', 'touchstart']) header.addEventListener(type, e => e.stopImmediatePropagation(), true);
  header.tabIndex = 0;
  header.setAttribute('aria-label', 'Mover menu: arraste ou use as setas do teclado');
  let gesture;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('button, a, input, select, summary, .panel-secondary, .info-wrapper')) { e.stopImmediatePropagation(); return; }
    if (e.button !== 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const r = menu.getBoundingClientRect();
    gesture = {id:e.pointerId, x:e.clientX, y:e.clientY, left:r.left, top:r.top};
    header.setPointerCapture(e.pointerId);
  }, true);
  const resize = document.createElement('button');
  resize.type = 'button'; resize.className = 'panel-resize'; resize.textContent = '\u25e2';
  resize.title = 'Redimensionar menu: arraste ou use as setas'; resize.setAttribute('aria-label', resize.title);
  menu.append(resize);
  resize.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const r = menu.getBoundingClientRect();
    gesture = {id:e.pointerId, x:e.clientX, y:e.clientY, width:r.width, height:r.height};
    resize.setPointerCapture(e.pointerId);
  }, true);
  function size(w, h) {
    const r = menu.getBoundingClientRect();
    menu.style.width = `${clamp(w, Math.min(210, innerWidth - 16), innerWidth - r.left - 8)}px`;
    menu.style.height = `${clamp(h, Math.min(180, innerHeight - 16), innerHeight - r.top - 8)}px`;
  }
  document.addEventListener('pointermove', e => {
    if (!gesture || e.pointerId !== gesture.id) return;
    const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
    if ('width' in gesture) size(gesture.width + dx, gesture.height + dy);
    else { menu.style.left = `${gesture.left + dx}px`; menu.style.top = `${gesture.top + dy}px`; fit(); }
  });
  for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, e => {
    if (gesture?.id === e.pointerId) { gesture = null; fit(); remember(); }
  });
  function arrow(e, resizing) {
    const directions = {ArrowLeft:[-16,0], ArrowRight:[16,0], ArrowUp:[0,-16], ArrowDown:[0,16]};
    const d = directions[e.key]; if (!d) return;
    e.preventDefault(); e.stopPropagation(); const r = menu.getBoundingClientRect();
    if (resizing) size(r.width+d[0], r.height+d[1]);
    else { menu.style.left = `${r.left+d[0]}px`; menu.style.top = `${r.top+d[1]}px`; fit(); }
    remember();
  }
  header.addEventListener('keydown', e => { if (e.target === header) arrow(e, false); });
  resize.addEventListener('keydown', e => arrow(e, true));
  function positionHelp() {
    menu.querySelectorAll('.info-wrapper .tooltip').forEach(tip => {
      const anchor = tip.parentElement.getBoundingClientRect();
      const r = tip.getBoundingClientRect();
      tip.style.left = `${clamp(anchor.left, 12, innerWidth-r.width-12)}px`;
      tip.style.top = `${clamp(anchor.bottom+8, 12, innerHeight-r.height-12)}px`;
    });
  }
  menu.addEventListener('pointerover', positionHelp);
  menu.addEventListener('focusin', positionHelp);
  menu.addEventListener('click', positionHelp);
  menu.addEventListener('scroll', positionHelp);
  new ResizeObserver(() => { fit(); positionHelp(); }).observe(menu);
  window.addEventListener('resize', () => { fit(); positionHelp(); });
  window.addEventListener('load', fit);
  requestAnimationFrame(fit);
})();
