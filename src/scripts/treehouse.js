/* Treehouse scene: info card, sounds, string lights, basket "elevator" and falling leaves.
   Plain browser JS with no dependencies, so it runs the same in Astro and in a static page. */
(function () {
  var dataEl = document.getElementById('th-data');
  var scene = document.getElementById('th-scene');
  if (!dataEl || !scene) return;

  var DATA = JSON.parse(dataEl.textContent);
  var ITEMS = {};
  DATA.items.forEach(function (it) { ITEMS[it.id] = it; });

  var stage = scene.querySelector('.th-stage');
  var card = document.getElementById('th-card');
  var cardKicker = card.querySelector('.th-card-kicker');
  var cardTitle = card.querySelector('.th-card-title');
  var cardDesc = card.querySelector('.th-card-desc');
  var cardExtra = card.querySelector('.th-card-extra');
  var cardGo = card.querySelector('.th-card-go');
  var zoomOutBtn = scene.querySelector('.th-zoom-out');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var sheet = window.matchMedia('(max-width: 640px)');

  var current = null;      // open item id
  var currentLayer = null; // layer element the card belongs to
  var trigger = null;      // button that opened the card
  var timers = {};

  function layersOf(id) { return stage.querySelectorAll('.th-layer[data-item="' + id + '"]'); }
  function firstLayer(id) { return stage.querySelector('.th-layer[data-item="' + id + '"]'); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function button(label, onClick, cls) {
    var b = el('button', cls || 'th-btn', label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function pulse(node, cls, ms) {
    if (!node) return;
    node.classList.remove(cls);
    void node.offsetWidth; // restart the CSS animation
    node.classList.add(cls);
    var key = cls + (node.getAttribute('data-key') || '');
    clearTimeout(timers[key]);
    timers[key] = setTimeout(function () { node.classList.remove(cls); }, ms);
  }

  /* ---------- Sound (only ever started by a click) ---------- */
  var ac = null;
  function audio() {
    try {
      if (!ac) {
        var C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        ac = new C();
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) {
      return null;
    }
  }

  function tone(freq, o) {
    var a = audio();
    if (!a) return;
    o = o || {};
    var t = a.currentTime + (o.at || 0);
    var dur = o.dur || 1.4;
    var osc = a.createOscillator();
    var gain = a.createGain();
    osc.type = o.type || 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(a.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    if (o.harm) {
      var osc2 = a.createOscillator();
      var g2 = a.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      g2.gain.value = o.harm;
      osc2.connect(g2);
      g2.connect(gain);
      osc2.start(t);
      osc2.stop(t + dur + 0.05);
    }
  }

  var NOTE = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
    C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760.0
  };

  function playPiano(n) { tone(NOTE[n], { type: 'triangle', dur: 1.6, vol: 0.22, harm: 0.12 }); }

  function playChime() {
    var pool = ['C6', 'D6', 'E6', 'G6', 'A6'];
    for (var i = 0; i < 5; i++) {
      tone(NOTE[pool[Math.floor(Math.random() * pool.length)]], { type: 'sine', dur: 2.6, vol: 0.08, at: i * 0.14 + Math.random() * 0.05 });
    }
  }

  var TUNE = [['E5', 0.3], ['G5', 0.3], ['A5', 0.6], ['G5', 0.3], ['E5', 0.3], ['D5', 0.6],
    ['C5', 0.3], ['D5', 0.3], ['E5', 0.3], ['G5', 0.3], ['E5', 0.9]];

  function playTune() {
    var at = 0;
    TUNE.forEach(function (n) {
      tone(NOTE[n[0]], { type: 'triangle', dur: Math.max(0.5, n[1] * 2), vol: 0.13, harm: 0.08, at: at });
      at += n[1];
    });
    return at;
  }

  /* ---------- Object actions ---------- */
  function fireNetwork() { pulse(firstLayer('lights'), 'is-firing', 2400); }
  function ringChime() { playChime(); pulse(firstLayer('chime'), 'is-ringing', 2400); }
  function blinkOwl() { pulse(firstLayer('owl'), 'is-blinking', 700); }

  function spinRecord() {
    var secs = playTune();
    var layer = firstLayer('record');
    if (!layer) return;
    layer.classList.add('is-playing');
    clearTimeout(timers.record);
    timers.record = setTimeout(function () { layer.classList.remove('is-playing'); }, (secs + 0.8) * 1000);
  }

  function modeText() {
    return window.THMode && window.THMode.current() === 'night' ? '现在是夜晚。' : '现在是白天。';
  }

  function fillExtra(it) {
    cardExtra.textContent = '';
    var row;
    if (it.extra === 'piano') {
      row = el('div', 'th-keys');
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', '琴键');
      [['C4', 'do'], ['D4', 're'], ['E4', 'mi'], ['F4', 'fa'], ['G4', 'sol'], ['A4', 'la'], ['B4', 'si'], ['C5', 'do']]
        .forEach(function (k, i) {
          var b = button(k[1], function () { playPiano(k[0]); }, 'th-key');
          b.setAttribute('aria-label', '弹 ' + k[1] + (i === 7 ? '（高音）' : ''));
          row.appendChild(b);
        });
      cardExtra.appendChild(row);
    } else if (it.extra === 'lamp') {
      cardExtra.appendChild(el('p', 'th-card-state', modeText()));
      row = el('div', 'th-actions');
      row.appendChild(button('再拉一下', function () { window.THMode && window.THMode.toggle(); }));
      row.appendChild(button('跟随当地时间', function () { window.THMode && window.THMode.set('auto'); }));
      cardExtra.appendChild(row);
    } else if (it.extra === 'nn') {
      row = el('div', 'th-actions');
      row.appendChild(button('再跑一次前向传播', fireNetwork));
      cardExtra.appendChild(row);
    } else if (it.extra === 'chime') {
      row = el('div', 'th-actions');
      row.appendChild(button('再摇一下', ringChime));
      cardExtra.appendChild(row);
    } else if (it.extra === 'record') {
      row = el('div', 'th-actions');
      row.appendChild(button('放一段', spinRecord));
      cardExtra.appendChild(row);
    } else if (it.extra === 'basket') {
      row = el('div', 'th-actions');
      DATA.floors.forEach(function (f) {
        row.appendChild(button(f.label, function () { closeCard(false); zoomTo(f.box); }));
      });
      cardExtra.appendChild(row);
    }
  }

  /* ---------- Card ---------- */
  function placeCard() {
    if (sheet.matches) {
      card.classList.add('is-sheet');
      card.style.left = '';
      card.style.top = '';
      return;
    }
    card.classList.remove('is-sheet');
    var s = scene.getBoundingClientRect();
    var r = currentLayer ? currentLayer.getBoundingClientRect() : s;
    var cw = card.offsetWidth;
    var ch = card.offsetHeight;
    var left = r.left + r.width / 2 - s.left - cw / 2;
    left = Math.max(8, Math.min(left, s.width - cw - 8));
    var below = r.bottom - s.top + 10;
    var above = r.top - s.top - ch - 10;
    var top;
    if (below + ch <= s.height - 8) top = below;
    else if (above >= 8) top = above;
    else top = Math.max(8, s.height - ch - 8);
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
  }

  function openCard(id, hit, byKeyboard) {
    var it = ITEMS[id];
    if (!it) return;
    if (currentLayer) currentLayer.classList.remove('is-on');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    current = id;
    trigger = hit || null;
    currentLayer = hit ? hit.closest('.th-layer') : firstLayer(id);
    if (currentLayer) currentLayer.classList.add('is-on');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');

    cardKicker.textContent = it.kicker;
    cardTitle.textContent = it.name;
    cardDesc.textContent = it.desc;
    fillExtra(it);
    if (it.href) {
      cardGo.hidden = false;
      cardGo.href = it.href;
      cardGo.textContent = '去看看「' + it.section + '」';
    } else {
      cardGo.hidden = true;
    }
    card.hidden = false;
    placeCard();
    if (byKeyboard) cardTitle.focus({ preventScroll: true });
  }

  function closeCard(restoreFocus) {
    if (!current) return;
    if (currentLayer) currentLayer.classList.remove('is-on');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    var back = trigger;
    current = null;
    currentLayer = null;
    trigger = null;
    card.hidden = true;
    if (restoreFocus && back && document.contains(back)) back.focus({ preventScroll: true });
  }

  function act(id) {
    if (id === 'lamp' && window.THMode) window.THMode.toggle();
    else if (id === 'lights') fireNetwork();
    else if (id === 'chime') ringChime();
    else if (id === 'owl') blinkOwl();
  }

  var REPEATABLE = { lamp: 1, lights: 1, chime: 1 };

  stage.addEventListener('click', function (e) {
    var hit = e.target.closest('.th-hit');
    if (!hit) return;
    var id = hit.getAttribute('data-item');
    var sameLayer = currentLayer && currentLayer === hit.closest('.th-layer');
    if (sameLayer && !REPEATABLE[id]) {
      closeCard(false);
      return;
    }
    openCard(id, hit, e.detail === 0);
    act(id);
    if (id === 'lamp') fillExtra(ITEMS.lamp);
  });

  card.querySelector('.th-card-close').addEventListener('click', function () { closeCard(true); });

  document.addEventListener('click', function (e) {
    if (!current) return;
    if (card.contains(e.target) || e.target.closest('.th-hit')) return;
    closeCard(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (current) closeCard(true);
    else if (scene.classList.contains('is-zoomed')) zoomTo(null);
  });

  document.addEventListener('th:mode', function () {
    if (current === 'lamp') fillExtra(ITEMS.lamp);
  });

  /* ---------- Directory links light up their object ---------- */
  var dirLinks = document.querySelectorAll('[data-th-target]');
  Array.prototype.forEach.call(dirLinks, function (a) {
    var id = a.getAttribute('data-th-target');
    function on() { Array.prototype.forEach.call(layersOf(id), function (l) { l.classList.add('is-hot'); }); }
    function off() { Array.prototype.forEach.call(layersOf(id), function (l) { l.classList.remove('is-hot'); }); }
    a.addEventListener('mouseenter', on);
    a.addEventListener('mouseleave', off);
    a.addEventListener('focus', on);
    a.addEventListener('blur', off);
  });

  /* ---------- Basket elevator (zoom to a floor) ---------- */
  function zoomTo(box) {
    if (!box) {
      stage.style.transform = '';
      stage.style.setProperty('--z', '1');
      scene.classList.remove('is-zoomed');
      return;
    }
    var W = scene.clientWidth;
    var H = scene.clientHeight;
    var k = W / DATA.scene.w;
    var bw = (box[2] - box[0]) * k;
    var bh = (box[3] - box[1]) * k;
    var s = Math.min(W / bw, H / bh, 2.4);
    var cx = (box[0] + box[2]) / 2 * k;
    var cy = (box[1] + box[3]) / 2 * k;
    var tx = Math.min(0, Math.max(W - s * W, W / 2 - s * cx));
    var ty = Math.min(0, Math.max(H - s * H, H / 2 - s * cy));
    stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    stage.style.setProperty('--z', String(s));
    scene.classList.add('is-zoomed');
    zoomOutBtn.focus({ preventScroll: true });
  }

  zoomOutBtn.addEventListener('click', function () { zoomTo(null); });

  window.addEventListener('resize', function () {
    if (scene.classList.contains('is-zoomed')) zoomTo(null);
    if (current) placeCard();
  });

  /* ---------- Falling leaves ---------- */
  var LEAF_COLORS = ['#f49f44', '#f4b84d', '#e07b2e', '#8e9a5a', '#f2c14e'];
  function seedLeaf(leaf, first) {
    var h = scene.clientHeight || 600;
    leaf.style.setProperty('--x', (8 + Math.random() * 84).toFixed(1) + '%');
    leaf.style.setProperty('--y', (3 + Math.random() * 30).toFixed(1) + '%');
    leaf.style.setProperty('--dx', ((Math.random() * 2 - 1) * 10).toFixed(1) + 'cqw');
    leaf.style.setProperty('--fall', Math.round(h * (0.5 + Math.random() * 0.35)) + 'px');
    leaf.style.setProperty('--rot', Math.round(Math.random() * 720 - 360) + 'deg');
    if (first) {
      leaf.style.setProperty('--dur', (10 + Math.random() * 7).toFixed(1) + 's');
      leaf.style.setProperty('--delay', (-Math.random() * 14).toFixed(1) + 's');
    }
  }

  function startLeaves() {
    var box = scene.querySelector('.th-leaves');
    if (!box || reduce.matches || box.childElementCount) return;
    for (var i = 0; i < 8; i++) {
      var leaf = el('span', 'th-leaf');
      leaf.style.setProperty('--c', LEAF_COLORS[i % LEAF_COLORS.length]);
      seedLeaf(leaf, true);
      leaf.addEventListener('animationiteration', function () { seedLeaf(this, false); });
      box.appendChild(leaf);
    }
  }

  startLeaves();

  document.addEventListener('visibilitychange', function () {
    scene.classList.toggle('is-paused', document.hidden);
  });
})();
