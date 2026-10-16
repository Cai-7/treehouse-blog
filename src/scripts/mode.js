/* Day / night for the whole site. Runs inline in <head> so the right sky shows on first paint.
   Preference: "auto" (follow the visitor's local time), "day" or "night". */
(function () {
  var KEY = 'th-mode';
  var root = document.documentElement;

  function getPref() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'day' || v === 'night' ? v : 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  function resolve(pref) {
    if (pref === 'day' || pref === 'night') return pref;
    var h = new Date().getHours();
    return h < 6 || h >= 18 ? 'night' : 'day';
  }

  function sync() {
    var pref = root.getAttribute('data-pref');
    var mode = root.getAttribute('data-mode');
    var i, list = document.querySelectorAll('[data-mode-set]');
    for (i = 0; i < list.length; i++) {
      list[i].setAttribute('aria-pressed', String(list[i].getAttribute('data-mode-set') === pref));
    }
    list = document.querySelectorAll('[data-mode-toggle]');
    for (i = 0; i < list.length; i++) {
      list[i].setAttribute('aria-label', mode === 'night' ? '切换到白天' : '切换到夜晚');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'night' ? '#1e3759' : '#f7f0dc');
  }

  function apply(pref) {
    var before = root.getAttribute('data-mode');
    root.setAttribute('data-pref', pref);
    root.setAttribute('data-mode', resolve(pref));
    sync();
    if (before && before !== root.getAttribute('data-mode')) {
      document.dispatchEvent(new CustomEvent('th:mode', { detail: { mode: root.getAttribute('data-mode') } }));
    }
  }

  function set(pref) {
    try {
      if (pref === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, pref);
    } catch (e) {}
    apply(pref);
    sync();
  }

  window.THMode = {
    get: getPref,
    set: set,
    current: function () { return root.getAttribute('data-mode'); },
    toggle: function () { set(root.getAttribute('data-mode') === 'night' ? 'day' : 'night'); }
  };

  apply(getPref());

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-mode-toggle]');
    if (t) { window.THMode.toggle(); return; }
    var s = e.target.closest && e.target.closest('[data-mode-set]');
    if (s) set(s.getAttribute('data-mode-set'));
  });

  document.addEventListener('DOMContentLoaded', sync);

  setInterval(function () {
    if (getPref() === 'auto') apply('auto');
  }, 60000);
})();
