/* Shared page chrome: the treehouse map drawer and the sky (day / night) menu in the header.
   The map's object links open their panel on the home page (treehouse.js handles that click);
   here they only close the drawer. */
(function () {
  var map = document.getElementById('th-map');
  var sheet = map && map.querySelector('.th-map-sheet');
  var openers = document.querySelectorAll('[data-map-open]');
  var lastFocus = null;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function setExpanded(v) { each(openers, function (b) { b.setAttribute('aria-expanded', String(v)); }); }

  function openMap() {
    if (!map) return;
    closeSky();
    lastFocus = document.activeElement;
    map.hidden = false;
    document.documentElement.classList.add('is-map-open');
    void map.offsetWidth;
    map.classList.add('is-in');
    setExpanded(true);
    var first = sheet.querySelector('.th-map-close');
    if (first) first.focus({ preventScroll: true });
  }

  function closeMap(restore) {
    if (!map || map.hidden) return;
    map.classList.remove('is-in');
    map.hidden = true;
    document.documentElement.classList.remove('is-map-open');
    setExpanded(false);
    if (restore && lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  each(openers, function (b) {
    b.addEventListener('click', function () { if (map && map.hidden) openMap(); else closeMap(true); });
  });

  if (map) {
    map.addEventListener('click', function (e) {
      if (e.target.closest('[data-map-close]')) { closeMap(true); return; }
      if (e.target.closest('a')) closeMap(false);
    });
    // keep Tab inside the open drawer
    map.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = sheet.querySelectorAll('a[href], button');
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* Sky menu */
  var skyBtn = document.querySelector('[data-sky-open]');
  var skyPop = document.getElementById('sky-pop');

  function closeSky(restore) {
    if (!skyPop || skyPop.hidden) return;
    skyPop.hidden = true;
    skyBtn.setAttribute('aria-expanded', 'false');
    if (restore) skyBtn.focus({ preventScroll: true });
  }

  if (skyBtn && skyPop) {
    skyBtn.addEventListener('click', function () {
      if (skyPop.hidden) {
        skyPop.hidden = false;
        skyBtn.setAttribute('aria-expanded', 'true');
        var on = skyPop.querySelector('[aria-pressed="true"]') || skyPop.querySelector('button');
        if (on) on.focus({ preventScroll: true });
      } else closeSky(false);
    });
    skyPop.addEventListener('click', function (e) {
      if (e.target.closest('[data-mode-set]')) setTimeout(function () { closeSky(true); }, 160);
    });
    document.addEventListener('click', function (e) {
      if (!skyPop.hidden && !e.target.closest('.sky-menu')) closeSky(false);
    });
  }

  /* Phones: the little treehouse in the corner tucks away while you scroll down to read,
     and comes back when you scroll up. */
  var locator = document.querySelector('.locator');
  if (locator) {
    var lastY = window.scrollY;
    var small = window.matchMedia('(max-width: 760px)');
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (!small.matches) { locator.classList.remove('is-tucked'); lastY = y; return; }
      if (Math.abs(y - lastY) < 8) return;
      var nearEnd = window.innerHeight + y > document.documentElement.scrollHeight - 40;
      locator.classList.toggle('is-tucked', y > lastY && y > 160 && !nearEnd);
      lastY = y;
    }, { passive: true });
  }

  /* Background: hills and clouds shift a little with the mouse (only with a mouse, never with reduced motion). */
  var bd = document.querySelector('.backdrop');
  if (bd && window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
    var raf = 0;
    window.addEventListener('pointermove', function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        bd.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3));
        bd.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3));
      });
    }, { passive: true });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (map && !map.hidden) { e.stopImmediatePropagation(); closeMap(true); }
    else if (skyPop && !skyPop.hidden) { e.stopImmediatePropagation(); closeSky(true); }
  }, true);
})();
