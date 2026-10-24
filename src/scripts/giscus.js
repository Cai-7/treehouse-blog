/* Comments through giscus (GitHub Discussions in Cai-7/treehouse-comments).
   The settings live in src/data/site.json under "giscus"; until repoId and categoryId are filled in,
   Base.astro leaves out the config and nothing here runs, so the site shows no comment boxes.

   Any element with data-giscus-term="..." gets a thread; the same term always maps to the same
   discussion (posts use "post:<slug>", the mailbox and /guestbook share "guestbook"). */
(function () {
  var node = document.getElementById('th-giscus');
  if (!node) return;
  var cfg;
  try {
    cfg = JSON.parse(node.textContent);
  } catch (e) {
    return;
  }
  if (!cfg || !cfg.repo || !cfg.repoId || !cfg.categoryId) return;

  var ORIGIN = 'https://giscus.app';
  function theme(light) {
    if (light) return 'noborder_light';
    return document.documentElement.getAttribute('data-mode') === 'night' ? 'noborder_dark' : 'noborder_light';
  }

  function mount(el, term, opts) {
    opts = opts || {};
    if (!el || el.getAttribute('data-giscus-on')) return;
    el.setAttribute('data-giscus-on', opts.light ? 'light' : 'auto');
    var s = document.createElement('script');
    s.src = ORIGIN + '/client.js';
    var attrs = {
      'data-repo': cfg.repo,
      'data-repo-id': cfg.repoId,
      'data-category': cfg.category,
      'data-category-id': cfg.categoryId,
      'data-mapping': 'specific',
      'data-term': term,
      'data-strict': '1',
      'data-reactions-enabled': '1',
      'data-emit-metadata': '0',
      'data-input-position': 'top',
      'data-theme': theme(opts.light),
      'data-lang': 'zh-CN'
    };
    // lazy loading never fires inside the scrolling side panel; the mailbox only mounts on click anyway
    if (!opts.light) attrs['data-loading'] = 'lazy';
    for (var k in attrs) s.setAttribute(k, attrs[k]);
    s.crossOrigin = 'anonymous';
    s.async = true;
    el.appendChild(s);
  }

  // follow day / night on pages where the thread sits on the page background
  document.addEventListener('th:mode', function () {
    var boxes = document.querySelectorAll('[data-giscus-on="auto"]');
    for (var i = 0; i < boxes.length; i++) {
      var f = boxes[i].querySelector('iframe.giscus-frame');
      if (f && f.contentWindow) f.contentWindow.postMessage({ giscus: { setConfig: { theme: theme(false) } } }, ORIGIN);
    }
  });

  window.THGiscus = { mount: mount };
  var list = document.querySelectorAll('[data-giscus-term]');
  for (var j = 0; j < list.length; j++) mount(list[j], list[j].getAttribute('data-giscus-term'));
})();
