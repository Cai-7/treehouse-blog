/* Preview only: the single-file preview carries every article and section page inside one HTML file.
   "#post-…" and "#sec-…" show one of them; any other address shows the treehouse.
   The real site doesn't need this, because there every page is its own file. */
(function () {
  var home = document.querySelector('main.home');
  var view = document.getElementById('page-view');
  if (!home || !view) return;
  var baseTitle = document.title;
  var pages = view.querySelectorAll('[data-page]');
  var homeScroll = 0;

  function show() {
    var h = decodeURIComponent(location.hash.slice(1));
    var page = null;
    if (h.indexOf('post-') === 0 || h.indexOf('sec-') === 0) {
      page = view.querySelector('[data-page="' + h + '"]');
    }
    Array.prototype.forEach.call(pages, function (p) { p.hidden = p !== page; });
    if (page) {
      if (view.hidden) homeScroll = window.scrollY;
      view.hidden = false;
      home.hidden = true;
      document.title = page.getAttribute('data-title') + ' · ' + baseTitle;
      window.scrollTo(0, 0);
      var h1 = page.querySelector('h1');
      if (h1) h1.focus({ preventScroll: true });
    } else if (!view.hidden) {
      view.hidden = true;
      home.hidden = false;
      document.title = baseTitle;
      window.scrollTo(0, homeScroll);
    }
  }

  window.addEventListener('hashchange', show);
  window.addEventListener('popstate', show);
  show();
})();
