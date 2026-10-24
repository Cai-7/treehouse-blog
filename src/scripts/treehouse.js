/* Treehouse scene: click an object and the camera moves in on it while its content opens beside the
   picture (or in a sheet from the bottom when the page is a single column). The lamp, the string
   lights and the basket act straight away and keep a small card. Also: sounds, falling leaves.
   Plain browser JS with no dependencies, so it runs the same in Astro and in a static page. */
(function () {
  var dataEl = document.getElementById('th-data');
  if (!dataEl) return;
  // On the home page this drives the whole scene; on an object's own page (no #th-scene) it only
  // draws that object at full size into [data-th-render] (see initPage further down).
  var scene = document.getElementById('th-scene');

  var DATA = JSON.parse(dataEl.textContent);
  var ITEMS = {};
  DATA.items.forEach(function (it) { ITEMS[it.id] = it; });
  var PANELS = DATA.panels || {};
  var POSTS = DATA.posts || [];
  var SW = DATA.scene.w;
  var SH = DATA.scene.h;

  var stage = scene ? scene.querySelector('.th-stage') : null;
  var sceneCol = scene ? scene.closest('.scene-col') || scene : null;
  var zoomOutBtn = scene ? scene.querySelector('.th-zoom-out') : null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrow = window.matchMedia('(max-width: 640px)');

  var card = document.getElementById('th-card');
  var cardKicker = card && card.querySelector('.th-card-kicker');
  var cardTitle = card && card.querySelector('.th-card-title');
  var cardDesc = card && card.querySelector('.th-card-desc');
  var cardExtra = card && card.querySelector('.th-card-extra');
  var cardGo = card && card.querySelector('.th-card-go');

  var panel = document.getElementById('th-panel');
  var side = panel ? panel.closest('.side') : null;
  var home = side ? side.closest('.home') : null;
  var panelKicker = panel && panel.querySelector('.th-panel-kicker');
  var panelTitle = panel && panel.querySelector('.th-panel-title');
  var panelDesc = panel && panel.querySelector('.th-panel-desc');
  var panelBody = panel && panel.querySelector('.th-panel-body');
  var panelMore = panel && panel.querySelector('.th-panel-more');
  var panelSteps = panel ? panel.querySelectorAll('.th-panel-step') : [];

  var current = null;      // item whose small card is open
  var currentLayer = null; // layer element the card belongs to
  var trigger = null;      // button that opened the card
  var panelId = null;      // item whose panel is open
  var panelLayer = null;
  var panelTrigger = null;
  var pushed = false;      // we added a history entry for the open panel
  var timers = {};

  function layersOf(id) { return stage ? stage.querySelectorAll('.th-layer[data-item="' + id + '"]') : []; }
  function firstLayer(id) { return stage ? stage.querySelector('.th-layer[data-item="' + id + '"]') : null; }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

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

  function link(href, cls) {
    var a = el('a', cls);
    a.href = href;
    if (/^https?:/.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    return a;
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

  /* ---------- Object actions ---------- */
  function fireNetwork() { pulse(firstLayer('lights'), 'is-firing', 2400); }
  function ringChime() { playChime(); pulse(firstLayer('chime'), 'is-ringing', 2400); }
  function blinkOwl() { pulse(firstLayer('owl'), 'is-blinking', 700); }

  function act(id) {
    if (id === 'lamp' && window.THMode) window.THMode.toggle();
    else if (id === 'lights') fireNetwork();
    else if (id === 'chime') ringChime();
    else if (id === 'owl') blinkOwl();
  }

  function modeText() {
    return window.THMode && window.THMode.current() === 'night' ? '现在是夜晚。' : '现在是白天。';
  }

  /* ---------- Camera ---------- */
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function setCamera(s, tx, ty) {
    stage.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
    stage.style.setProperty('--z', s.toFixed(3));
    scene.classList.add('is-zoomed');
  }

  function resetCamera() {
    if (typeof clearFloors === 'function') clearFloors();
    stage.style.transform = '';
    stage.style.setProperty('--z', '1');
    scene.classList.remove('is-zoomed');
  }

  // A floor, for the basket elevator.
  function zoomTo(box) {
    if (!box) { resetCamera(); return; }
    var W = scene.clientWidth;
    var H = scene.clientHeight;
    var k = W / SW;
    var s = Math.min(W / ((box[2] - box[0]) * k), H / ((box[3] - box[1]) * k), 2.4);
    var cx = (box[0] + box[2]) / 2 * k;
    var cy = (box[1] + box[3]) / 2 * k;
    setCamera(s, clamp(W / 2 - s * cx, W - s * W, 0), clamp(H / 2 - s * cy, H - s * H, 0));
    zoomOutBtn.focus({ preventScroll: true });
  }

  function boxOf(layer) {
    var x = parseFloat(layer.style.left) / 100 * SW;
    var y = parseFloat(layer.style.top) / 100 * SH;
    return [x, y, x + parseFloat(layer.style.width) / 100 * SW, y + parseFloat(layer.style.height) / 100 * SH];
  }

  // Move the camera onto one object. viewH is how much of the picture stays visible (a bottom sheet
  // covers the rest). The zoom is capped so the drawing is never stretched much past its own pixels.
  function focusOn(layer, viewH) {
    var W = scene.clientWidth;
    var H = scene.clientHeight;
    if (!W || !H || !layer) return false;
    var vh = clamp(viewH || H, H * 0.4, H);
    var box = boxOf(layer);
    var k = W / SW;
    var bw = (box[2] - box[0]) * k;
    var bh = (box[3] - box[1]) * k;
    var dpr = window.devicePixelRatio || 1;
    var cap = Math.min(3.2, 2.2 * SW / (W * dpr));
    var want = Math.min(W * 0.5 / bw, vh * 0.42 / bh);
    var s = Math.max(1.4, Math.min(want, cap));
    var cx = (box[0] + box[2]) / 2 * k;
    var cy = (box[1] + box[3]) / 2 * k;
    setCamera(s, clamp(W / 2 - s * cx, W - s * W, 0), clamp(vh / 2 - s * cy, H - s * H, 0));
    return true;
  }

  /* ---------- Small card (lamp, string lights, basket) ---------- */
  function fillExtra(it) {
    cardExtra.textContent = '';
    var row;
    if (it.extra === 'lamp') {
      cardExtra.appendChild(el('p', 'th-card-state', modeText()));
      row = el('div', 'th-actions');
      row.appendChild(button('再拉一下', function () { window.THMode && window.THMode.toggle(); }));
      row.appendChild(button('跟随当地时间', function () { window.THMode && window.THMode.set('auto'); }));
      cardExtra.appendChild(row);
    } else if (it.extra === 'nn') {
      row = el('div', 'th-actions');
      row.appendChild(button('再跑一次前向传播', fireNetwork));
      cardExtra.appendChild(row);
    } else if (it.extra === 'basket') {
      row = el('div', 'th-actions');
      DATA.floors.forEach(function (f) {
        row.appendChild(button(f.label, function () { closeCard(false); zoomTo(f.box); }));
      });
      cardExtra.appendChild(row);
    }
  }

  function placeCard() {
    if (narrow.matches) {
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
    if (currentLayer && currentLayer !== panelLayer) currentLayer.classList.remove('is-on');
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
    cardGo.hidden = true;
    card.hidden = false;
    placeCard();
    if (byKeyboard) cardTitle.focus({ preventScroll: true });
  }

  function closeCard(restoreFocus) {
    if (!current) return;
    if (currentLayer && currentLayer !== panelLayer) currentLayer.classList.remove('is-on');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    var back = trigger;
    current = null;
    currentLayer = null;
    trigger = null;
    card.hidden = true;
    if (restoreFocus && back && document.contains(back)) back.focus({ preventScroll: true });
  }

  /* ---------- Panel content ---------- */
  function stars(n) {
    n = Math.max(0, Math.min(5, Math.round(n || 0)));
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  }

  function heading(text) { return el('h3', 'pn-sub', text); }

  function listOf(rows, render) {
    var ul = el('ul', 'pn-list');
    rows.forEach(function (r) {
      var li = el('li');
      li.appendChild(render(r));
      ul.appendChild(li);
    });
    return ul;
  }

  function entry(title, meta, href, badge) {
    var a = href ? link(href, 'pn-link') : el('div', 'pn-link');
    var t = el('span', 'pn-title', title);
    if (badge) t.appendChild(el('span', 'pn-badge', badge));
    a.appendChild(t);
    if (meta) a.appendChild(el('span', 'pn-meta', meta));
    return a;
  }

  function postMeta(p) {
    return [p.dateLabel, p.minutes ? p.minutes + ' 分钟' : null].concat(p.tags || []).filter(Boolean).join(' · ');
  }

  function empty(text) { return el('p', 'pn-empty', text); }

  function baseSrc(night) {
    // crops sit on paper, so they use the opaque drawing (the scene itself uses the transparent-sky copy)
    return '/treehouse/' + (night ? 'night' : 'day') + '.webp';
  }

  function cropStyle(node, crop, night) {
    var x = crop[0], y = crop[1], w = crop[2], h = crop[3];
    node.style.backgroundImage = 'url("' + baseSrc(night) + '")';
    node.style.backgroundSize = (SW / w * 100).toFixed(2) + '% auto';
    node.style.backgroundPosition = (x / (SW - w) * 100).toFixed(2) + '% ' + (y / (SH - h) * 100).toFixed(2) + '%';
  }

  /* ---------- Bespoke panels ----------
     Some objects open into a miniature of themselves (a music-score book with a playable keyboard,
     a shelf of book spines) instead of a list. They set up listeners that must go away with the panel. */
  var leaving = [];
  function onLeave(fn) { leaving.push(fn); }
  function leave() {
    var fns = leaving;
    leaving = [];
    fns.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
  }

  var NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* --- Notes and the score --- */
  var STEP = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var PC_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function midiFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function playMidi(m, o) {
    o = o || {};
    // lower notes ring a little longer, like real strings
    var dur = o.dur || (2.2 - (m - 60) * 0.03);
    tone(midiFreq(m), { type: 'triangle', dur: Math.max(0.9, dur), vol: 0.2, harm: 0.12, at: o.at || 0 });
  }

  // "C4 E4*2 | R*1 F#4*0.5" -> [{ midi, dn, acc, beats, rest, bar, t }]
  function parseScore(src) {
    var out = [];
    var bar = 0;
    var t = 0;
    String(src || '').split(/\s+/).forEach(function (tok) {
      if (!tok) return;
      if (tok === '|') { bar++; return; }
      var m = /^([A-GR])([#b]?)(\d?)(?:\*([\d.]+))?$/.exec(tok);
      if (!m) return;
      var n = { rest: m[1] === 'R', beats: m[4] ? parseFloat(m[4]) || 1 : 1, bar: bar, t: t };
      if (!n.rest) {
        var oct = m[3] ? Number(m[3]) : 4;
        n.acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
        n.dn = oct * 7 + STEP[m[1]];
        n.midi = 12 * (oct + 1) + SEMI[m[1]] + n.acc;
        n.name = m[1] + m[2] + oct;
      }
      t += n.beats;
      out.push(n);
    });
    return out;
  }

  var STAFF = { w: 440, sysH: 90, top: 32, sp: 8, x0: 50, right: 12, perSystem: 4, meter: 4 };

  function drawClef(g) {
    // a hand-drawn treble clef curling around the G line (the second line from the bottom)
    var d = [
      'M19 44 C10 34 13 16 21 11 C27 17 25 31 19 44',
      'M19 44 C17 56 14 66 15 76 C16 84 10 88 7 84 C5 80 10 77 12 80',
      'M19 44 C31 46 32 66 19 67 C8 68 6 54 15 51 C21 49 25 55 21 59 C19 61 16 59 18 57'
    ];
    d.forEach(function (path) {
      svgEl('path', { d: path, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    });
  }

  function drawStaff(song, hostSvg) {
    var notes = song.notes;
    var maxBar = notes.length ? notes[notes.length - 1].bar : 0;
    var systems = Math.floor(maxBar / STAFF.perSystem) + 1;
    var H = systems * STAFF.sysH + 8;
    hostSvg.setAttribute('viewBox', '0 0 ' + STAFF.w + ' ' + H);
    hostSvg.textContent = '';
    var unit = (STAFF.w - STAFF.x0 - STAFF.right) / (STAFF.meter * STAFF.perSystem);
    var els = [];
    for (var s = 0; s < systems; s++) {
      var oy = s * STAFF.sysH + 4;
      var g = svgEl('g', { transform: 'translate(0 ' + oy + ')' }, hostSvg);
      var line = [];
      for (var l = 0; l < 5; l++) {
        var y = STAFF.top + l * STAFF.sp;
        svgEl('line', { x1: 8, x2: STAFF.w - 6, y1: y, y2: y, class: 'sc-line' }, g);
        line.push(y);
      }
      svgEl('line', { x1: 8, x2: 8, y1: STAFF.top, y2: STAFF.top + 4 * STAFF.sp, class: 'sc-bar' }, g);
      var clef = svgEl('g', { class: 'sc-clef' }, g);
      drawClef(clef);
      var first = null;
      var lastEnd = 0;
      notes.forEach(function (n, i) {
        if (Math.floor(n.bar / STAFF.perSystem) !== s) return;
        if (!first) first = n;
        lastEnd = n.t + n.beats - first.t;
      });
      // bar lines
      var seenBar = {};
      notes.forEach(function (n) {
        if (Math.floor(n.bar / STAFF.perSystem) !== s || !first) return;
        if (seenBar[n.bar] || n.bar % STAFF.perSystem === 0) { seenBar[n.bar] = 1; return; }
        seenBar[n.bar] = 1;
        var bx = STAFF.x0 + (n.t - first.t) * unit - 3;
        svgEl('line', { x1: bx, x2: bx, y1: STAFF.top, y2: STAFF.top + 4 * STAFF.sp, class: 'sc-bar' }, g);
      });
      var endX = STAFF.x0 + lastEnd * unit - 3;
      if (s === systems - 1) {
        svgEl('line', { x1: endX, x2: endX, y1: STAFF.top, y2: STAFF.top + 4 * STAFF.sp, class: 'sc-bar' }, g);
        svgEl('line', { x1: endX + 4, x2: endX + 4, y1: STAFF.top, y2: STAFF.top + 4 * STAFF.sp, class: 'sc-bar sc-bar-end' }, g);
      } else {
        svgEl('line', { x1: STAFF.w - 6, x2: STAFF.w - 6, y1: STAFF.top, y2: STAFF.top + 4 * STAFF.sp, class: 'sc-bar' }, g);
      }
      notes.forEach(function (n, i) {
        if (Math.floor(n.bar / STAFF.perSystem) !== s || !first) return;
        var x = STAFF.x0 + (n.t - first.t) * unit + 9;
        els[i] = drawNote(g, n, x, i);
      });
    }
    return els;
  }

  function drawNote(parent, n, x, idx) {
    var bottom = STAFF.top + 4 * STAFF.sp; // the E4 line
    var half = STAFF.sp / 2;
    var g = svgEl('g', { class: 'sc-n', 'data-i': String(idx) }, parent);
    if (n.rest) {
      var cy = STAFF.top + 2 * STAFF.sp;
      if (n.beats >= 4) svgEl('rect', { x: x - 5, y: STAFF.top + STAFF.sp, width: 10, height: 4, fill: 'currentColor' }, g);
      else if (n.beats >= 2) svgEl('rect', { x: x - 5, y: cy - 4, width: 10, height: 4, fill: 'currentColor' }, g);
      else svgEl('path', { d: 'M' + (x - 2) + ' ' + (cy - 12) + ' l5 5 l-5 6 l5 5 q-5 0 -4 5', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      return g;
    }
    var y = bottom - (n.dn - 30) * half;
    svgEl('ellipse', { cx: x, cy: y, rx: 12, ry: 12, class: 'sc-halo' }, g);
    // ledger lines
    if (n.dn <= 28) for (var d = 28; d >= n.dn; d -= 2) ledger(g, x, bottom - (d - 30) * half);
    if (n.dn >= 40) for (var u = 40; u <= n.dn; u += 2) ledger(g, x, bottom - (u - 30) * half);
    var hollow = n.beats >= 2;
    svgEl('ellipse', {
      cx: x, cy: y, rx: 5.4, ry: 3.9, transform: 'rotate(-22 ' + x + ' ' + y + ')',
      fill: hollow ? 'var(--sc-paper)' : 'currentColor', stroke: 'currentColor', 'stroke-width': hollow ? 1.7 : 1
    }, g);
    if (n.beats < 4) {
      var up = n.dn < 34;
      var sx = up ? x + 4.9 : x - 4.9;
      var ey = up ? y - 27 : y + 27;
      svgEl('line', { x1: sx, x2: sx, y1: y, y2: ey, stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, g);
      var flags = n.beats <= 0.25 ? 2 : n.beats <= 0.5 ? 1 : 0;
      for (var f = 0; f < flags; f++) {
        var fy = up ? ey + f * 5 : ey - f * 5;
        svgEl('path', {
          d: up ? 'M' + sx + ' ' + fy + ' q8 5 5 15' : 'M' + sx + ' ' + fy + ' q8 -5 5 -15',
          fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round'
        }, g);
      }
    }
    if (n.acc) {
      var ax = x - 13;
      if (n.acc > 0) {
        svgEl('path', { d: 'M' + (ax - 1.6) + ' ' + (y - 7) + ' v14 M' + (ax + 1.6) + ' ' + (y - 8) + ' v14 M' + (ax - 4) + ' ' + (y - 2) + ' l8 -2.4 M' + (ax - 4) + ' ' + (y + 3.4) + ' l8 -2.4', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, g);
      } else {
        svgEl('path', { d: 'M' + (ax - 2) + ' ' + (y - 9) + ' v13 q7 -1 5 -5 q-2 -3 -5 -1', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, g);
      }
    }
    var frac = n.beats % 1;
    if (frac === 0.5 && n.beats > 1) {
      var online = (n.dn - 30) % 2 === 0;
      svgEl('circle', { cx: x + 10, cy: online ? y - 2.6 : y, r: 1.6, fill: 'currentColor' }, g);
    }
    return g;
  }

  function ledger(g, x, y) {
    svgEl('line', { x1: x - 9, x2: x + 9, y1: y, y2: y, class: 'sc-line sc-ledger' }, g);
  }

  /* --- A playable keyboard: C4 to C6, 15 white keys and 10 black keys --- */
  var WHITE_PC = { 0: 1, 2: 1, 4: 1, 5: 1, 7: 1, 9: 1, 11: 1 };
  var KEY_MAP = {
    a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71,
    k: 72, o: 73, l: 74, p: 75, ';': 76, "'": 77
  };
  var KEY_CAP = {};
  Object.keys(KEY_MAP).forEach(function (k) { KEY_CAP[KEY_MAP[k]] = k.toUpperCase(); });

  function buildKeyboard(handlers) {
    var root = el('div', 'kb');
    var lid = el('div', 'kb-lid');
    lid.appendChild(el('span', 'kb-plate', '树屋牌 · 立式钢琴'));
    root.appendChild(lid);
    root.appendChild(el('div', 'kb-felt'));
    var keys = el('div', 'kb-keys');
    keys.setAttribute('role', 'group');
    keys.setAttribute('aria-label', '琴键，从中央 C 到高两个八度的 C');
    root.appendChild(keys);
    var byMidi = {};
    var whites = [];
    for (var m = 60; m <= 84; m++) if (WHITE_PC[m % 12]) whites.push(m);
    var wW = 100 / whites.length;
    whites.forEach(function (m) {
      var b = el('button', 'kb-w');
      b.type = 'button';
      b.setAttribute('data-midi', String(m));
      b.setAttribute('aria-label', PC_NAME[m % 12] + (Math.floor(m / 12) - 1));
      if (m % 12 === 0) b.appendChild(el('span', 'kb-name', 'C' + (Math.floor(m / 12) - 1)));
      if (KEY_CAP[m]) b.appendChild(el('span', 'kb-cap', KEY_CAP[m]));
      keys.appendChild(b);
      byMidi[m] = b;
    });
    for (var bm = 61; bm < 84; bm++) {
      if (WHITE_PC[bm % 12]) continue;
      var idx = whites.indexOf(bm - 1) + 1; // white keys to the left
      var k = el('button', 'kb-b');
      k.type = 'button';
      k.tabIndex = -1;
      k.setAttribute('data-midi', String(bm));
      k.setAttribute('aria-label', PC_NAME[bm % 12].replace('#', ' 升') + (Math.floor(bm / 12) - 1));
      k.style.left = (idx * wW - wW * 0.3) + '%';
      k.style.width = (wW * 0.6) + '%';
      if (KEY_CAP[bm]) k.appendChild(el('span', 'kb-cap', KEY_CAP[bm]));
      keys.appendChild(k);
      byMidi[bm] = k;
    }
    keys.style.setProperty('--kw', wW + '%');

    var active = {};
    function midiOf(node) { return Number(node.getAttribute('data-midi')); }
    function down(node) { node.classList.add('is-down'); handlers.down(midiOf(node), node); }
    function up(node) { node.classList.remove('is-down'); if (handlers.up) handlers.up(midiOf(node), node); }
    function keyAt(x, y) {
      var t = document.elementFromPoint(x, y);
      var k = t && t.closest ? t.closest('.kb-w, .kb-b') : null;
      return k && keys.contains(k) ? k : null;
    }
    keys.addEventListener('pointerdown', function (e) {
      var k = e.target.closest('.kb-w, .kb-b');
      if (!k || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      try { keys.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      active[e.pointerId] = k;
      down(k);
    });
    keys.addEventListener('pointermove', function (e) {
      var cur = active[e.pointerId];
      if (!cur) return;
      var k = keyAt(e.clientX, e.clientY);
      if (k && k !== cur) {
        up(cur);
        active[e.pointerId] = k;
        down(k);
      }
    });
    function release(e) {
      var cur = active[e.pointerId];
      if (cur) { up(cur); delete active[e.pointerId]; }
    }
    keys.addEventListener('pointerup', release);
    keys.addEventListener('pointercancel', release);
    // keyboard users: Enter / Space on a focused key
    keys.addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      var k = e.target.closest('.kb-w, .kb-b');
      if (!k) return;
      down(k);
      setTimeout(function () { up(k); }, 140);
    });

    return {
      root: root,
      key: function (m) { return byMidi[m]; },
      mark: function (m, cls, on) { if (byMidi[m]) byMidi[m].classList.toggle(cls, on); },
      clear: function (cls) { each(keys.querySelectorAll('.' + cls), function (n) { n.classList.remove(cls); }); },
      press: function (m, on) { var n = byMidi[m]; if (!n) return; if (on) down(n); else up(n); }
    };
  }

  /* --- The piano panel --- */
  function renderPiano(P, box) {
    var songs = (P.songs || []).map(function (s) {
      return { title: s.title, composer: s.composer, bpm: s.bpm || 96, notes: parseScore(s.notes) };
    }).filter(function (s) { return s.notes.length; });

    var wrap = el('div', 'pi');
    box.appendChild(wrap);

    var book = el('div', 'pi-book');
    wrap.appendChild(book);
    var binding = el('div', 'pi-binding');
    binding.setAttribute('aria-hidden', 'true');
    book.appendChild(binding);
    var page = el('div', 'pi-page');
    book.appendChild(page);

    var tabs = el('div', 'pi-tabs');
    tabs.setAttribute('role', 'tablist');
    page.appendChild(tabs);
    var head = el('div', 'pi-head');
    var titleEl = el('h4', 'pi-song');
    var byEl = el('span', 'pi-by');
    head.appendChild(titleEl);
    head.appendChild(byEl);
    page.appendChild(head);

    var staffWrap = el('div', 'pi-staff');
    var staff = svgEl('svg', { class: 'sc', role: 'img', preserveAspectRatio: 'xMidYMid meet' });
    staffWrap.appendChild(staff);
    page.appendChild(staffWrap);

    var bar = el('div', 'pi-bar');
    var status = el('p', 'pi-status', '点琴键就能弹；也可以用电脑键盘 A S D F G H J K。');
    status.setAttribute('aria-live', 'polite');
    var btnDemo = button('示范', function () { demo(); }, 'pi-btn');
    var btnFollow = button('跟弹', function () { follow(); }, 'pi-btn');
    var btnStop = button('停', function () { stopAll(true); }, 'pi-btn');
    bar.appendChild(btnDemo);
    bar.appendChild(btnFollow);
    bar.appendChild(btnStop);
    bar.appendChild(status);
    page.appendChild(bar);

    if (P.items && P.items.length) {
      var margin = el('div', 'pi-margin');
      margin.appendChild(el('p', 'pi-margin-title', '页边的铅笔字'));
      P.items.slice(0, 1).forEach(function (r) {
        var line = el('p', 'pi-pencil');
        line.appendChild(el('span', 'pi-pencil-date', [r.dateLabel, r.minutes ? r.minutes + ' 分钟' : null].filter(Boolean).join(' · ')));
        line.appendChild(document.createTextNode(' ' + r.piece + (r.note ? '：' + r.note : '')));
        margin.appendChild(line);
      });
      page.appendChild(margin);
    }

    var cur = 0;
    var els = [];
    var mode = 'idle';
    var followI = 0;
    var timers2 = [];
    var downKeys = {};

    function later(fn, ms) { timers2.push(setTimeout(fn, ms)); }

    function select(i) {
      stopAll(false);
      cur = i;
      var s = songs[i];
      titleEl.textContent = s.title;
      byEl.textContent = [s.composer, '每分钟 ' + s.bpm + ' 拍'].filter(Boolean).join(' · ');
      els = drawStaff(s, staff);
      staff.setAttribute('aria-label', s.title + '的五线谱，共 ' + s.notes.filter(function (n) { return !n.rest; }).length + ' 个音');
      each(tabs.children, function (t, k) {
        t.classList.toggle('is-on', k === i);
        t.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
      say('点琴键就能弹；也可以用电脑键盘 A S D F G H J K。');
    }

    function say(t) { status.textContent = t; }
    function noteOn(i, cls, on) { if (els[i]) els[i].classList.toggle(cls, on); }

    function stopAll(announce) {
      timers2.forEach(clearTimeout);
      timers2 = [];
      mode = 'idle';
      each(staff.querySelectorAll('.is-on, .is-done'), function (n) { n.classList.remove('is-on', 'is-done'); });
      kb.clear('is-hint');
      kb.clear('is-demo');
      btnDemo.classList.remove('is-active');
      btnFollow.classList.remove('is-active');
      if (announce) say('停下了。');
    }

    function demo() {
      stopAll(false);
      mode = 'demo';
      btnDemo.classList.add('is-active');
      var s = songs[cur];
      var spb = 60 / s.bpm;
      say('听一遍：亮着的音符就是现在弹到的地方。');
      s.notes.forEach(function (n, i) {
        var at = n.t * spb;
        if (!n.rest) playMidi(n.midi, { at: at, dur: Math.max(0.9, n.beats * spb * 1.5) });
        later(function () { noteOn(i, 'is-on', true); if (!n.rest) kb.mark(n.midi, 'is-demo', true); }, at * 1000);
        later(function () { noteOn(i, 'is-on', false); if (!n.rest) kb.mark(n.midi, 'is-demo', false); }, (at + n.beats * spb * 0.92) * 1000);
      });
      var last = s.notes[s.notes.length - 1];
      later(function () { stopAll(false); say('弹完了。想自己试试就点「跟弹」。'); }, (last.t + last.beats) * spb * 1000 + 250);
    }

    function nextPlayable(from) {
      var s = songs[cur].notes;
      for (var i = from; i < s.length; i++) if (!s[i].rest) return i;
      return -1;
    }

    function showTarget() {
      kb.clear('is-hint');
      each(staff.querySelectorAll('.is-on'), function (n) { n.classList.remove('is-on'); });
      var s = songs[cur].notes;
      if (followI < 0) return;
      noteOn(followI, 'is-on', true);
      kb.mark(s[followI].midi, 'is-hint', true);
    }

    function follow() {
      stopAll(false);
      mode = 'follow';
      btnFollow.classList.add('is-active');
      followI = nextPlayable(0);
      say('跟弹：按下发亮的那个键，一个音一个音往下走。');
      showTarget();
    }

    function onUserKey(m) {
      playMidi(m);
      if (mode !== 'follow' || followI < 0) return;
      var s = songs[cur].notes;
      if (s[followI].midi === m) {
        noteOn(followI, 'is-done', true);
        followI = nextPlayable(followI + 1);
        if (followI < 0) {
          kb.clear('is-hint');
          each(staff.querySelectorAll('.is-on'), function (n) { n.classList.remove('is-on'); });
          mode = 'idle';
          btnFollow.classList.remove('is-active');
          say('一整首都弹完啦！');
        } else {
          showTarget();
        }
      } else {
        var k = kb.key(m);
        if (k) { k.classList.add('is-wrong'); setTimeout(function () { k.classList.remove('is-wrong'); }, 220); }
      }
    }

    var kb = buildKeyboard({
      down: function (m) { onUserKey(m); },
      up: function () {}
    });
    wrap.appendChild(kb.root);

    // tapping a note on the staff plays it
    staff.addEventListener('click', function (e) {
      var g = e.target.closest ? e.target.closest('.sc-n') : null;
      if (!g) return;
      var n = songs[cur] && songs[cur].notes[Number(g.getAttribute('data-i'))];
      if (n && !n.rest) { playMidi(n.midi); g.classList.add('is-on'); setTimeout(function () { g.classList.remove('is-on'); }, 300); }
    });

    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      var m = KEY_MAP[e.key.toLowerCase()];
      if (!m || downKeys[m]) return;
      downKeys[m] = true;
      e.preventDefault();
      kb.press(m, true);
    }
    function onKeyUp(e) {
      var m = KEY_MAP[e.key.toLowerCase()];
      if (!m || !downKeys[m]) return;
      delete downKeys[m];
      kb.press(m, false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    onLeave(function () {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      timers2.forEach(clearTimeout);
    });

    if (!songs.length) {
      page.insertBefore(el('p', 'pn-empty', '谱架上还没有谱子，先随便弹弹吧。'), staffWrap);
      staffWrap.hidden = true;
      bar.hidden = true;
      return;
    }
    songs.forEach(function (s, i) {
      var tab = el('button', 'pi-tab', s.title);
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', function () { select(i); });
      tabs.appendChild(tab);
    });
    select(0);
  }

  /* --- The bookshelf panel --- */
  function hashOf(s) {
    var h = 7;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function isLight(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    if (!m) return false;
    return (parseInt(m[1], 16) * 299 + parseInt(m[2], 16) * 587 + parseInt(m[3], 16) * 114) / 1000 > 150;
  }

  var SPINES = ['#c8553d', '#3f6e8c', '#e0a33a', '#6b8e4e', '#8a5a83', '#2f4858', '#b9733a', '#4f7f78'];
  var PER_ROW = 8;

  // what sits on a shelf with no books yet: a pot plant and a pile of books lying down
  function decor(r) {
    var d = el('div', 'bs-decor');
    d.setAttribute('aria-hidden', 'true');
    d.appendChild(el('span', 'bs-pile'));
    d.appendChild(el('span', 'bs-pot'));
    if (r % 2) d.classList.add('is-flip');
    return d;
  }

  function renderShelf(P, box) {
    var items = P.items || [];
    var shelf = el('div', 'bs');
    box.appendChild(shelf);
    var reading = el('article', 'bs-read');
    reading.hidden = true;
    reading.setAttribute('aria-live', 'polite');
    var openBtn = null;

    var rows = Math.max(2, Math.ceil(items.length / PER_ROW));
    for (var r = 0; r < rows; r++) {
      var row = el('div', 'bs-row');
      var books = el('div', 'bs-books');
      row.appendChild(books);
      row.appendChild(el('div', 'bs-plank'));
      var slice = items.slice(r * PER_ROW, (r + 1) * PER_ROW);
      slice.forEach(function (b, k) {
        var i = r * PER_ROW + k;
        var h = hashOf(b.title);
        var chars = Array.from(b.title);
        var fs = chars.length <= 6 ? 14 : 12;
        var shown = chars.length > 9 ? chars.slice(0, 8).join('') + '…' : b.title;
        var width = 34 + ((h >> 4) % 4) * 6;
        var height = Math.min(188, Math.max(118 + (h % 4) * 10, 66 + Array.from(shown).length * (fs + 1) + (b.rating || 0) * 7));
        var color = b.color || SPINES[i % SPINES.length];
        var btn = el('button', 'bs-book' + (isLight(color) ? ' is-light' : ''));
        btn.type = 'button';
        btn.style.setProperty('--bk', color);
        btn.style.height = height + 'px';
        btn.style.width = width + 'px';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', b.title + '，' + (b.author || '') + '，' + (b.rating || 0) + ' 星');
        var t = el('span', 'bs-title', shown);
        t.style.fontSize = fs + 'px';
        btn.appendChild(t);
        var dots = el('span', 'bs-dots');
        for (var d = 0; d < (b.rating || 0); d++) dots.appendChild(el('i'));
        btn.appendChild(dots);
        if (k === slice.length - 1 && slice.length < PER_ROW - 1 && slice.length > 2) btn.classList.add('is-lean');
        btn.addEventListener('click', function () { choose(btn, b); });
        books.appendChild(btn);
      });
      if (!slice.length) books.appendChild(decor(r));
      books.appendChild(el('span', 'bs-end'));
      shelf.appendChild(row);
    }
    box.appendChild(reading);

    function choose(btn, b) {
      if (openBtn) { openBtn.classList.remove('is-out'); openBtn.setAttribute('aria-expanded', 'false'); }
      if (openBtn === btn) { openBtn = null; reading.hidden = true; return; }
      openBtn = btn;
      btn.classList.add('is-out');
      btn.setAttribute('aria-expanded', 'true');
      fill(b, btn.style.getPropertyValue('--bk'));
      reading.hidden = false;
      reading.classList.remove('is-in');
      void reading.offsetWidth;
      reading.classList.add('is-in');
      if (reading.scrollIntoView) reading.scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
    }

    function fill(b, color) {
      reading.textContent = '';
      reading.style.setProperty('--bk', color);
      var ribbon = el('div', 'bs-ribbon');
      ribbon.setAttribute('role', 'img');
      ribbon.setAttribute('aria-label', (b.rating || 0) + ' 星');
      ribbon.appendChild(el('span', null, stars(b.rating)));
      reading.appendChild(ribbon);
      reading.appendChild(el('h4', 'bs-name', b.title));
      reading.appendChild(el('p', 'bs-author', b.author || ''));
      if (b.note) reading.appendChild(el('p', 'bs-note', b.note));
      if (b.quote) reading.appendChild(el('blockquote', 'bs-quote', b.quote));
      var foot = el('div', 'bs-foot');
      if (b.finishedLabel) foot.appendChild(el('span', null, '读完于 ' + b.finishedLabel));
      foot.appendChild(button('合上', function () {
        if (openBtn) { openBtn.classList.remove('is-out'); openBtn.setAttribute('aria-expanded', 'false'); openBtn.focus({ preventScroll: true }); }
        openBtn = null;
        reading.hidden = true;
      }, 'bs-close'));
      reading.appendChild(foot);
    }

    if (!items.length) box.appendChild(empty('书架还是空的。'));
  }

  /* --- A layer that sits over a panel (the enlarged photo): Escape and the arrow keys go to it first --- */
  var overlay = null; // { close(), key(e) }

  /* --- The record player panel --- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A short pentatonic tune made from the title, so every record plays something of its own.
  function tuneFor(title) {
    var rand = rng(hashOf(title));
    var scale = [60, 62, 64, 67, 69, 72, 74, 76];
    var idx = 2 + Math.floor(rand() * 3);
    var beats = [1, 1, 0.5, 0.5, 2, 1];
    var steps = [-2, -1, -1, 0, 1, 1, 2];
    var out = [];
    var t = 0;
    for (var i = 0; i < 18; i++) {
      var b = beats[Math.floor(rand() * beats.length)];
      out.push({ m: scale[idx], t: t, b: b });
      t += b;
      idx = Math.max(0, Math.min(scale.length - 1, idx + steps[Math.floor(rand() * steps.length)]));
    }
    out.push({ m: 60, t: t, b: 3 });
    return out;
  }

  var SLEEVES = ['#d9a441', '#4f7f78', '#c8553d', '#6c7fb0', '#8a5a83', '#6b8e4e'];

  function renderRecord(P, box) {
    var items = P.items || [];
    var wrap = el('div', 'rp');
    box.appendChild(wrap);

    var deck = el('div', 'rp-deck');
    var platter = el('div', 'rp-platter');
    var disc = el('div', 'rp-disc');
    var label = el('div', 'rp-label');
    var labelText = el('span', 'rp-label-text', '♪');
    label.appendChild(labelText);
    disc.appendChild(label);
    platter.appendChild(disc);
    deck.appendChild(platter);
    var arm = el('div', 'rp-arm');
    arm.setAttribute('aria-hidden', 'true');
    arm.appendChild(el('span', 'rp-arm-base'));
    arm.appendChild(el('span', 'rp-arm-bar'));
    arm.appendChild(el('span', 'rp-arm-head'));
    deck.appendChild(arm);
    var knob = el('span', 'rp-knob');
    knob.setAttribute('aria-hidden', 'true');
    deck.appendChild(knob);
    var go = button('放', function () { toggle(); }, 'rp-go');
    go.setAttribute('aria-label', '放或停');
    deck.appendChild(go);
    wrap.appendChild(deck);

    var now = el('p', 'rp-now', '从下面的唱片箱里挑一张，放到唱盘上。');
    now.setAttribute('aria-live', 'polite');
    wrap.appendChild(now);
    var tag = el('div', 'rp-tag');
    wrap.appendChild(tag);

    var crate = el('div', 'rp-crate');
    crate.setAttribute('role', 'group');
    crate.setAttribute('aria-label', '唱片箱');
    wrap.appendChild(crate);
    wrap.appendChild(el('p', 'pn-note', '唱盘上放的是按歌名随手谱的小曲，只是示意；真正的歌请去链接里听。'));

    var sleeves = [];
    var cur = -1;
    var timers3 = [];
    var layer = firstLayer('record');

    function stop(msg) {
      timers3.forEach(clearTimeout);
      timers3 = [];
      deck.classList.remove('is-on');
      go.textContent = '放';
      if (layer) layer.classList.remove('is-playing');
      if (msg) now.textContent = msg;
    }

    function play(i) {
      stop();
      cur = i;
      var it = items[i];
      sleeves.forEach(function (s, k) { s.classList.toggle('is-on', k === i); s.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      label.style.setProperty('--lb', it.color || SLEEVES[i % SLEEVES.length]);
      labelText.textContent = Array.from(it.title)[0];
      now.textContent = '正在放：' + it.title + (it.artist ? ' · ' + it.artist : '');
      tag.textContent = '';
      if (it.url) {
        var a = link(it.url, 'pn-chip is-link');
        a.textContent = '去听原曲 →';
        tag.appendChild(a);
      }
      deck.classList.add('is-on');
      go.textContent = '停';
      if (layer) layer.classList.add('is-playing');
      var spb = 60 / 88;
      var tune = tuneFor(it.title);
      tune.forEach(function (n) {
        timers3.push(setTimeout(function () { playMidi(n.m, { dur: Math.max(1.2, n.b * spb * 1.8) }); }, n.t * spb * 1000));
      });
      var last = tune[tune.length - 1];
      timers3.push(setTimeout(function () { stop('放完了。再挑一张吧。'); }, (last.t + last.b) * spb * 1000 + 600));
    }

    function toggle() {
      if (deck.classList.contains('is-on')) stop('唱针抬起来了。');
      else play(cur >= 0 ? cur : 0);
    }

    items.forEach(function (it, i) {
      var color = it.color || SLEEVES[i % SLEEVES.length];
      var b = el('button', 'rp-sleeve' + (isLight(color) ? ' is-light' : ''));
      b.type = 'button';
      b.style.setProperty('--sl', color);
      b.style.setProperty('--tilt', ((hashOf(it.title) % 5) - 2) * 0.8 + 'deg');
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', it.title + (it.artist ? '，' + it.artist : ''));
      b.appendChild(el('span', 'rp-sleeve-disc'));
      b.appendChild(el('span', 'rp-sleeve-title', it.title));
      if (it.artist) b.appendChild(el('span', 'rp-sleeve-artist', it.artist));
      b.addEventListener('click', function () { if (cur === i && deck.classList.contains('is-on')) stop('唱针抬起来了。'); else play(i); });
      crate.appendChild(b);
      sleeves.push(b);
    });
    if (!items.length) crate.appendChild(empty('唱片箱是空的。'));
    onLeave(function () { stop(); });
  }

  /* --- The clothesline panel --- */
  function renderClothesline(P, box) {
    var items = P.items || [];
    var wrap = el('div', 'cl');
    box.appendChild(wrap);
    var pics = [];
    var PER = 3;
    var rows = Math.max(1, Math.ceil(items.length / PER));
    for (var r = 0; r < rows; r++) {
      var row = el('div', 'cl-row');
      var rope = svgEl('svg', { class: 'cl-rope', viewBox: '0 0 100 30', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      svgEl('path', { d: 'M-2 4 Q50 40 102 4', fill: 'none', stroke: '#6a4a2e', 'stroke-width': 2.4, 'vector-effect': 'non-scaling-stroke' }, rope);
      row.appendChild(rope);
      var line = el('div', 'cl-pics');
      row.appendChild(line);
      items.slice(r * PER, (r + 1) * PER).forEach(function (ph, j) {
        var i = r * PER + j;
        var t = (j + 0.5) / PER;
        var btn = el('button', 'cl-pic');
        btn.type = 'button';
        btn.style.marginTop = (4 + 36 * t * (1 - t) * 0.5 - 4).toFixed(1) + 'px';
        btn.style.setProperty('--d', (-(i * 0.9) % 4).toFixed(1) + 's');
        btn.style.setProperty('--r', ((hashOf(String(ph.caption || i)) % 5) - 2) * 0.6 + 'deg');
        btn.setAttribute('aria-label', '取下照片：' + (ph.caption || '照片 ' + (i + 1)));
        btn.appendChild(el('span', 'cl-pin'));
        var frame = el('span', 'cl-frame');
        frame.appendChild(photoFace(ph));
        frame.appendChild(el('span', 'cl-cap', ph.caption || ''));
        btn.appendChild(frame);
        btn.addEventListener('click', function () { openView(i); });
        line.appendChild(btn);
        pics[i] = btn;
      });
      wrap.appendChild(row);
    }
    if (!items.length) wrap.appendChild(empty('绳子上还没挂照片。'));

    var view = el('div', 'cl-view');
    view.hidden = true;
    view.setAttribute('role', 'dialog');
    view.setAttribute('aria-label', '照片');
    wrap.appendChild(view);
    var at = -1;

    function photoFace(ph) {
      var pic = el('span', 'cl-img');
      pic.setAttribute('role', 'img');
      pic.setAttribute('aria-label', ph.caption || '照片');
      if (ph.src) pic.style.backgroundImage = 'url("' + ph.src + '")';
      else if (ph.crop) cropStyle(pic, ph.crop, ph.night);
      return pic;
    }

    function openView(i) {
      at = i;
      pics.forEach(function (p, k) { p.classList.toggle('is-away', k === i); });
      var ph = items[i];
      view.textContent = '';
      var card = el('div', 'cl-card');
      var inner = el('div', 'cl-card-in');
      var front = el('div', 'cl-side cl-front');
      front.appendChild(photoFace(ph));
      front.appendChild(el('span', 'cl-cap', ph.caption || ''));
      var back = el('div', 'cl-side cl-back');
      back.appendChild(el('p', 'cl-back-title', ph.caption || '无题'));
      [['日期', ph.dateLabel], ['地点', ph.place], ['相机', ph.camera]].forEach(function (f) {
        if (!f[1]) return;
        var p = el('p', 'cl-back-line');
        p.appendChild(el('span', 'cl-back-k', f[0]));
        p.appendChild(document.createTextNode(f[1]));
        back.appendChild(p);
      });
      if (!ph.dateLabel && !ph.place && !ph.camera) back.appendChild(el('p', 'cl-back-line', '背面还是空白的。'));
      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);
      view.appendChild(card);
      var bar = el('div', 'cl-bar');
      var prev = button('‹', function () { openView((at - 1 + items.length) % items.length); }, 'cl-nav');
      prev.setAttribute('aria-label', '上一张');
      var flip = button('翻到背面', function () {
        var on = card.classList.toggle('is-back');
        flip.textContent = on ? '翻回正面' : '翻到背面';
      }, 'cl-flip');
      var next = button('›', function () { openView((at + 1) % items.length); }, 'cl-nav');
      next.setAttribute('aria-label', '下一张');
      var close = button('挂回去', closeView, 'cl-close');
      bar.appendChild(prev);
      bar.appendChild(flip);
      bar.appendChild(next);
      bar.appendChild(close);
      view.appendChild(bar);
      card.addEventListener('click', function () { flip.click(); });
      view.hidden = false;
      view.classList.remove('is-in');
      void view.offsetWidth;
      view.classList.add('is-in');
      overlay = {
        close: closeView,
        key: function (e) {
          if (items.length < 2) return false;
          if (e.key === 'ArrowLeft') { prev.click(); return true; }
          if (e.key === 'ArrowRight') { next.click(); return true; }
          return false;
        }
      };
      close.focus({ preventScroll: true });
    }

    function closeView() {
      view.hidden = true;
      overlay = null;
      var p = pics[at];
      pics.forEach(function (x) { x.classList.remove('is-away'); });
      at = -1;
      if (p) p.focus({ preventScroll: true });
    }
    onLeave(function () { overlay = null; });
  }

  /* --- The blackboard panel --- */
  var CHALKS = [['白', '#f6f1e3'], ['黄', '#f3d56b'], ['粉', '#f1a3b8'], ['蓝', '#8fd0e8']];

  function renderChalk(P, box) {
    var items = P.items || [];
    var PAGE = 3;
    var page = 0;
    var pages = Math.max(1, Math.ceil(items.length / PAGE));
    var wrap = el('div', 'cb');
    box.appendChild(wrap);

    var defs = svgEl('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false', style: 'position:absolute' });
    var f = svgEl('filter', { id: 'th-chalk', x: '-2%', y: '-5%', width: '104%', height: '110%' }, defs);
    svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.8', numOctaves: '2', result: 'n' }, f);
    svgEl('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '2.4' }, f);
    wrap.appendChild(defs);

    var board = el('div', 'cb-board');
    wrap.appendChild(board);
    var surface = el('div', 'cb-surface');
    board.appendChild(surface);
    var head = el('p', 'cb-head', '今日板书');
    surface.appendChild(head);
    var lines = el('div', 'cb-lines');
    surface.appendChild(lines);
    var foot = el('p', 'cb-foot');
    surface.appendChild(foot);
    var doodle = el('div', 'cb-doodle');
    var canvas = el('canvas', 'cb-canvas');
    canvas.setAttribute('aria-label', '涂鸦区，可以用粉笔随手画');
    doodle.appendChild(canvas);
    doodle.appendChild(el('span', 'cb-hint', '这里可以随手涂鸦'));
    surface.appendChild(doodle);
    var eraserFly = el('span', 'cb-eraser-fly');
    doodle.appendChild(eraserFly);

    var tray = el('div', 'cb-tray');
    var color = CHALKS[0][1];
    var chalkBtns = CHALKS.map(function (c, i) {
      var b = el('button', 'cb-chalk' + (i === 0 ? ' is-on' : ''), c[0]);
      b.type = 'button';
      b.style.setProperty('--ch', c[1]);
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.setAttribute('aria-label', c[0] + '色粉笔');
      b.addEventListener('click', function () {
        color = c[1];
        chalkBtns.forEach(function (x, k) { x.classList.toggle('is-on', k === i); x.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      });
      tray.appendChild(b);
      return b;
    });
    var eraser = button('擦掉涂鸦', function () { wipe(); }, 'cb-eraser');
    tray.appendChild(eraser);
    wrap.appendChild(tray);

    function write() {
      lines.textContent = '';
      var slice = items.slice(page * PAGE, (page + 1) * PAGE);
      if (!slice.length) {
        lines.appendChild(el('p', 'cb-empty', '今天还没有板书，写点什么吧。'));
      }
      slice.forEach(function (p, i) {
        var a = link(p.href, 'cb-line');
        a.style.setProperty('--i', String(i));
        a.appendChild(el('span', 'cb-title', p.title));
        a.appendChild(el('span', 'cb-meta', [p.dateLabel, p.minutes ? p.minutes + ' 分钟' : null].concat(p.tags || []).filter(Boolean).join(' · ')));
        lines.appendChild(a);
      });
      foot.textContent = '';
      if (pages > 1) {
        var prev = button('‹', function () { turn(-1); }, 'cb-page');
        prev.setAttribute('aria-label', '上一页');
        var next = button('›', function () { turn(1); }, 'cb-page');
        next.setAttribute('aria-label', '下一页');
        foot.appendChild(prev);
        foot.appendChild(el('span', null, '第 ' + (page + 1) + ' / ' + pages + ' 页'));
        foot.appendChild(next);
      }
      lines.classList.remove('is-writing');
      void lines.offsetWidth;
      lines.classList.add('is-writing');
    }

    function turn(step) {
      page = (page + step + pages) % pages;
      write();
    }

    // The eraser only rubs out the doodles; the posts stay where they are.
    var busy = false;
    function wipe() {
      if (busy) return;
      if (!fit() || reduce.matches) { clearCanvas(); return; }
      busy = true;
      var w = cw;
      var bw = eraserFly.offsetWidth || 60;
      var t0 = null;
      var DUR = 700;
      doodle.classList.add('is-wiping');
      eraserFly.style.opacity = '1';
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / DUR);
        var x = -bw + k * (w + bw * 2);
        eraserFly.style.left = x + 'px';
        ctx.clearRect(0, 0, Math.max(0, x + bw * 0.6), ch);
        if (k < 1) { requestAnimationFrame(frame); return; }
        clearCanvas();
        eraserFly.style.opacity = '0';
        eraserFly.style.left = '';
        doodle.classList.remove('is-wiping');
        busy = false;
      }
      requestAnimationFrame(frame);
    }

    // doodling
    var ctx = null;
    var dpr = 1;
    var cw = 0;
    var ch = 0;
    function fit() {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      if (!w || !h) return false;
      if (w === cw && h === ch && ctx) return true;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cw = w; ch = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      return true;
    }
    function clearCanvas() {
      if (ctx) ctx.clearRect(0, 0, cw, ch);
      doodle.classList.remove('has-ink');
    }
    var last = null;
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (!fit()) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      last = pos(e);
      stroke(last, last);
      doodle.classList.add('has-ink');
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!last) return;
      var p = pos(e);
      stroke(last, p);
      last = p;
    });
    function end() { last = null; }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    function stroke(a, b) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x + 0.01, b.y);
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(a.x + 1.4, a.y - 1);
      ctx.lineTo(b.x + 1.4, b.y - 1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    write();
  }

  /* --- Shared bits for the second batch --- */
  function slugOf(p) { return p.slug || 'untitled'; }
  function isoOf(p) { return p.date || ''; }
  function clampN(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* --- The double-monitor desk: my tech stack, front end on one screen, ML on the other --- */
  var LEVELS = ['', '入门', '会用', '熟练', '精通'];
  function extOf(file) { var m = /\.([a-z0-9]+)$/i.exec(file || ''); return m ? m[1].toLowerCase() : 'txt'; }
  var EXT_COLOR = { ts: '#7fb3e8', tsx: '#7fb3e8', js: '#f2d36b', mjs: '#f2d36b', vue: '#7fd1a4', css: '#c59ae8', svg: '#f2a86b', py: '#f2d36b', ipynb: '#f2a86b' };

  function renderStack(P, box) {
    var screens = (P.screens || []).filter(function (s) { return s && (s.items || []).length; });
    var win = el('div', 'ed st');
    box.appendChild(win);
    var bar = el('div', 'ed-title st-title');
    ['i', 'i', 'i'].forEach(function (t) { var d = el(t); d.setAttribute('aria-hidden', 'true'); bar.appendChild(d); });
    var monitors = el('div', 'st-monitors');
    monitors.setAttribute('role', 'tablist');
    monitors.setAttribute('aria-label', '两块屏幕');
    bar.appendChild(monitors);
    win.appendChild(bar);
    var body = el('div', 'ed-body');
    win.appendChild(body);
    var side = el('div', 'ed-side');
    var sideTitle = el('p', 'ed-side-title');
    side.appendChild(sideTitle);
    var files = el('div', 'ed-files');
    files.setAttribute('role', 'listbox');
    side.appendChild(files);
    body.appendChild(side);
    var main = el('div', 'ed-main');
    body.appendChild(main);
    var tabs = el('div', 'ed-tabs');
    var tab = el('span', 'ed-tab');
    tabs.appendChild(tab);
    main.appendChild(tabs);
    var code = el('div', 'ed-code');
    code.setAttribute('aria-live', 'polite');
    main.appendChild(code);
    var status = el('div', 'ed-status');
    var statusText = el('span');
    status.appendChild(statusText);
    main.appendChild(status);
    var timer = null;
    onLeave(function () { clearTimeout(timer); });
    var monBtns = [];
    var cur = 0;

    function ln(n, parts) {
      var row = el('div', 'ed-line');
      row.appendChild(el('span', 'ed-ln', String(n)));
      var tx = el('span', 'ed-tx');
      (parts || []).forEach(function (p) { tx.appendChild(el('span', p[0] ? 'c-' + p[0] : null, p[1])); });
      row.appendChild(tx);
      code.appendChild(row);
      return tx;
    }
    function varName(name) {
      var v = String(name || 'skill').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      return v || 'skill';
    }
    function show(si, i) {
      clearTimeout(timer);
      var s = screens[si].items[i];
      each(files.children, function (b, k) { b.classList.toggle('is-on', k === i); b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      tab.textContent = s.file || s.name;
      code.textContent = '';
      var lv = Math.max(0, Math.min(4, Number(s.level) || 0));
      var yrs = s.since ? Math.max(0, new Date().getFullYear() - Number(s.since)) : null;
      var n = 1;
      ln(n++, [['m', '// ' + s.name]]);
      ln(n++, [['k', 'export const '], ['p', varName(s.name) + ' = {']]);
      var lvRow = ln(n++, [['p', '  level: '], ['s', "'" + (LEVELS[lv] || '?') + "'"], ['p', ',  ']]);
      var meter = el('span', 'st-meter');
      meter.setAttribute('aria-label', '熟练度 ' + lv + ' / 4');
      for (var q = 1; q <= 4; q++) meter.appendChild(el('i', q <= lv ? 'is-on' : null));
      lvRow.appendChild(meter);
      if (s.since) ln(n++, [['p', '  since: '], ['n', String(s.since)], ['p', ','], ['m', yrs ? '  // 用了 ' + yrs + ' 年' : '  // 今年刚开始']]);
      var used = [].concat(s.used || []);
      if (used.length) ln(n++, [['p', '  usedIn: ['], ['s', used.map(function (u) { return "'" + u + "'"; }).join(', ')], ['p', '],']]);
      ln(n++, [['p', '};']]);
      ln(n++, []);
      var tx = ln(n++, [['m', '']]);
      var noteEl = tx.firstChild;
      var caret = el('span', 'ed-caret');
      tx.appendChild(caret);
      var text = s.note ? '// ' + s.note : '';
      var lvCount = screens[si].items.filter(function (x) { return Number(x.level) >= 3; }).length;
      statusText.textContent = screens[si].title + ' · ' + screens[si].items.length + ' 项 · 熟练以上 ' + lvCount + ' 项';
      if (reduce.matches || !text) { noteEl.textContent = text; return; }
      var k = 0;
      (function step() {
        noteEl.textContent = text.slice(0, k);
        if (k < text.length) { k++; timer = setTimeout(step, 30); }
      })();
    }
    function screen(si) {
      cur = si;
      monBtns.forEach(function (b, k) { b.classList.toggle('is-on', k === si); b.setAttribute('aria-selected', k === si ? 'true' : 'false'); });
      win.setAttribute('data-screen', screens[si].id || String(si));
      sideTitle.textContent = screens[si].title;
      files.setAttribute('aria-label', screens[si].title + '技术栈');
      files.textContent = '';
      screens[si].items.forEach(function (s, i) {
        var b = el('button', 'ed-file');
        b.type = 'button';
        b.setAttribute('role', 'option');
        var ext = extOf(s.file);
        var ico = el('span', 'ed-ico', ext);
        if (EXT_COLOR[ext]) ico.style.background = EXT_COLOR[ext];
        b.appendChild(ico);
        b.appendChild(el('span', 'ed-name', s.name));
        b.addEventListener('click', function () { show(si, i); });
        files.appendChild(b);
      });
      show(si, 0);
    }
    screens.forEach(function (sc, si) {
      var b = el('button', 'st-mon', (si === 0 ? '左屏 · ' : '右屏 · ') + sc.title);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { screen(si); });
      monitors.appendChild(b);
      monBtns.push(b);
    });
    if (screens.length) screen(0);
    else { tab.textContent = 'stack.yaml'; code.appendChild(el('p', 'pn-empty', '还没写技术栈，在 stack.yaml 里加上就会出现在屏幕上。')); }
  }

  /* --- The filing cabinet: one drawer per year, each post a folder --- */
  function renderDrawers(P, box) {
    var items = P.items || [];
    var byYear = {};
    items.forEach(function (p) {
      var y = (isoOf(p) || '').slice(0, 4) || '未标年份';
      (byYear[y] = byYear[y] || []).push(p);
    });
    var years = Object.keys(byYear).sort().reverse();
    var seed = Number(years[years.length - 1]) || new Date().getFullYear();
    while (years.length < 3) { seed--; years.push(String(seed)); byYear[seed] = []; }

    var cab = el('div', 'dr');
    box.appendChild(cab);
    var opened = null;
    var COLORS = ['#e6c27a', '#d9a86a', '#c9b37e', '#dcb98c'];

    years.forEach(function (y, di) {
      var list = byYear[y] || [];
      var drawer = el('div', 'dr-drawer');
      var front = el('button', 'dr-front');
      front.type = 'button';
      front.setAttribute('aria-expanded', 'false');
      var label = el('span', 'dr-label');
      label.appendChild(el('b', null, y));
      label.appendChild(el('span', null, list.length ? list.length + ' 个项目' : '空着'));
      front.appendChild(label);
      front.appendChild(el('span', 'dr-handle'));
      var wrapIn = el('div', 'dr-wrap');
      var inner = el('div', 'dr-inner');
      if (!list.length) inner.appendChild(el('p', 'dr-empty', '这个抽屉还空着，等一个新项目。'));
      list.forEach(function (p, i) {
        var a = link(p.href, 'dr-folder');
        a.style.setProperty('--fc', COLORS[i % COLORS.length]);
        a.style.setProperty('--off', (i % 3) * 22 + '%');
        a.appendChild(el('span', 'dr-tab', p.dateLabel || ''));
        a.appendChild(el('span', 'dr-ftitle', p.title));
        if (p.summary) a.appendChild(el('span', 'dr-fsum', p.summary));
        inner.appendChild(a);
      });
      wrapIn.appendChild(inner);
      drawer.appendChild(wrapIn);
      drawer.appendChild(front);
      cab.appendChild(drawer);
      front.addEventListener('click', function () {
        var was = drawer.classList.contains('is-open');
        if (opened) { opened.classList.remove('is-open'); opened.querySelector('.dr-front').setAttribute('aria-expanded', 'false'); }
        opened = null;
        if (!was) { drawer.classList.add('is-open'); front.setAttribute('aria-expanded', 'true'); opened = drawer; }
      });
      if (di === 0 && list.length) front.click();
    });
  }

  /* --- The pegboard: each post a tool with a paper tag --- */
  function toolSvg(i) {
    var s = svgEl('svg', { class: 'pg-tool', viewBox: '0 0 60 112', 'aria-hidden': 'true' });
    var ln2 = { stroke: '#2b1a0e', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    function add(tag, a) {
      var o = {};
      var cssFill = null;
      for (var k in ln2) o[k] = ln2[k];
      for (var k2 in a) o[k2] = a[k2];
      if (/^var\(/.test(o.fill || '')) { cssFill = o.fill; delete o.fill; }
      var n = svgEl(tag, o, s);
      if (cssFill) n.style.fill = cssFill;
      return n;
    }
    add('path', { d: 'M30 2 V14', fill: 'none' });
    switch (i % 5) {
      case 0: // hammer
        add('rect', { x: 25, y: 38, width: 10, height: 68, rx: 4, fill: '#b9803f' });
        add('rect', { x: 8, y: 16, width: 38, height: 22, rx: 3, fill: '#8d98a3' });
        add('path', { d: 'M46 20 q10 0 12 12 l-9 -2 q-1 -6 -3 -6z', fill: '#8d98a3' });
        break;
      case 1: // wrench
        add('rect', { x: 26, y: 38, width: 10, height: 68, rx: 5, fill: '#a9b2bb' });
        add('circle', { cx: 31, cy: 32, r: 15, fill: '#a9b2bb' });
        add('rect', { x: 26.5, y: 14, width: 9, height: 15, fill: 'var(--pg, #c79a62)', stroke: 'none' });
        break;
      case 2: // screwdriver
        add('rect', { x: 23, y: 16, width: 16, height: 38, rx: 7, fill: '#d2552d' });
        add('rect', { x: 29, y: 54, width: 4, height: 46, fill: '#a9b2bb' });
        add('path', { d: 'M29 100 l1 8 l2 -8', fill: '#a9b2bb' });
        break;
      case 3: // pliers
        add('path', { d: 'M24 106 L29 56', fill: 'none', 'stroke-width': 8, stroke: '#2b1a0e' });
        add('path', { d: 'M38 106 L33 56', fill: 'none', 'stroke-width': 8, stroke: '#2b1a0e' });
        add('path', { d: 'M24 106 L29 56', fill: 'none', 'stroke-width': 5, stroke: '#4f7f78' });
        add('path', { d: 'M38 106 L33 56', fill: 'none', 'stroke-width': 5, stroke: '#4f7f78' });
        add('rect', { x: 24, y: 34, width: 14, height: 24, rx: 3, fill: '#8d98a3' });
        add('path', { d: 'M26 34 L28 14 H34 L36 34z', fill: '#a9b2bb' });
        break;
      default: // saw
        add('rect', { x: 18, y: 14, width: 26, height: 16, rx: 7, fill: '#b9803f' });
        add('circle', { cx: 31, cy: 22, r: 3, fill: 'var(--pg, #c79a62)' });
        add('path', { d: 'M24 30 H38 V100 L35 96 L38 92 L35 88 L38 84 L35 80 L38 76 L35 72 L38 68 L35 64 L38 60 L35 56 L38 52 L35 48 L38 44 L35 40 L38 36 H24z', fill: '#a9b2bb' });
    }
    return s;
  }

  function renderPegs(P, box) {
    var items = P.items || [];
    var board = el('div', 'pg');
    box.appendChild(board);
    var grid = el('div', 'pg-grid');
    board.appendChild(grid);
    items.forEach(function (p, i) {
      var a = link(p.href, 'pg-item');
      a.style.setProperty('--d', (-(i * 0.7)).toFixed(1) + 's');
      var hang = el('span', 'pg-hang');
      hang.appendChild(toolSvg(i));
      a.appendChild(hang);
      var tag = el('span', 'pg-tag');
      tag.appendChild(el('span', 'pg-tag-title', p.title));
      tag.appendChild(el('span', 'pg-tag-meta', [p.dateLabel].concat(p.tags || []).filter(Boolean).join(' · ')));
      a.appendChild(tag);
      grid.appendChild(a);
    });
    if (!items.length) board.appendChild(empty('墙上还没挂东西。'));
    board.appendChild(el('p', 'pg-note', '点一件工具，取下来读那篇踩坑记录。'));
  }

  /* --- The projector screen: films and games as a showing --- */
  function renderProjector(P, box) {
    var items = P.items || [];
    var room = el('div', 'pj');
    box.appendChild(room);
    var proj = el('div', 'pj-proj');
    proj.setAttribute('aria-hidden', 'true');
    proj.appendChild(el('span', 'pj-lens'));
    room.appendChild(proj);
    room.appendChild(el('div', 'pj-beam'));
    var scr = el('div', 'pj-screen');
    var film = el('div', 'pj-film');
    film.setAttribute('aria-live', 'polite');
    scr.appendChild(film);
    room.appendChild(scr);
    var stubs = el('div', 'pj-stubs');
    stubs.setAttribute('role', 'group');
    stubs.setAttribute('aria-label', '片单');
    room.appendChild(stubs);
    var btns = [];
    var cur = -1;

    function show(i) {
      var it = items[i];
      cur = i;
      btns.forEach(function (b, k) { b.classList.toggle('is-on', k === i); b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      var color = it.color || SLEEVES[i % SLEEVES.length];
      film.textContent = '';
      film.style.setProperty('--pc', color);
      var poster = el('div', 'pj-poster' + (isLight(color) ? ' is-light' : ''));
      poster.appendChild(el('span', 'pj-kind', it.kind || ''));
      poster.appendChild(el('span', 'pj-ptitle', it.title));
      film.appendChild(poster);
      var info = el('div', 'pj-info');
      var tk = el('div', 'pj-ticket');
      tk.setAttribute('role', 'img');
      tk.setAttribute('aria-label', (it.rating || 0) + ' 星');
      tk.appendChild(el('span', 'pj-stars', stars(it.rating)));
      tk.appendChild(el('span', 'pj-admit', 'ADMIT ONE'));
      info.appendChild(tk);
      info.appendChild(el('p', 'pj-name', it.title));
      info.appendChild(el('p', 'pj-note', it.note || (it.kind ? '一部看过的' + it.kind + '。' : '')));
      film.appendChild(info);
      scr.classList.remove('is-flick');
      void scr.offsetWidth;
      scr.classList.add('is-flick');
    }

    items.forEach(function (it, i) {
      var color = it.color || SLEEVES[i % SLEEVES.length];
      var b = el('button', 'pj-stub');
      b.type = 'button';
      b.style.setProperty('--pc', color);
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'pj-stub-title', it.title));
      b.appendChild(el('span', 'pj-stub-kind', it.kind || ''));
      b.addEventListener('click', function () { show(i); });
      stubs.appendChild(b);
      btns.push(b);
    });
    if (items.length) show(0);
    else film.appendChild(el('p', 'pj-name', '幕布还是黑的。'));
  }

  /* --- The suitcase: an explored-territory map and luggage tags --- */
  var CITY = {
    北京: [116.4, 39.9], 上海: [121.5, 31.2], 天津: [117.2, 39.1], 重庆: [106.5, 29.6], 广州: [113.3, 23.1], 深圳: [114.1, 22.5],
    杭州: [120.2, 30.3], 南京: [118.8, 32.1], 苏州: [120.6, 31.3], 成都: [104.1, 30.7], 西安: [108.9, 34.3], 武汉: [114.3, 30.6],
    长沙: [113.0, 28.2], 厦门: [118.1, 24.5], 青岛: [120.4, 36.1], 大连: [121.6, 38.9], 沈阳: [123.4, 41.8], 哈尔滨: [126.6, 45.8],
    长春: [125.3, 43.9], 济南: [117.0, 36.7], 郑州: [113.6, 34.7], 合肥: [117.3, 31.9], 南昌: [115.9, 28.7], 福州: [119.3, 26.1],
    昆明: [102.7, 25.0], 贵阳: [106.7, 26.6], 南宁: [108.4, 22.8], 海口: [110.3, 20.0], 三亚: [109.5, 18.3], 拉萨: [91.1, 29.7],
    兰州: [103.8, 36.1], 西宁: [101.8, 36.6], 银川: [106.3, 38.5], 乌鲁木齐: [87.6, 43.8], 呼和浩特: [111.7, 40.8], 太原: [112.5, 37.9],
    石家庄: [114.5, 38.0], 洛阳: [112.5, 34.6], 桂林: [110.3, 25.3], 丽江: [100.2, 26.9], 大理: [100.2, 25.6], 敦煌: [94.7, 40.1],
    香港: [114.2, 22.3], 澳门: [113.5, 22.2], 台北: [121.6, 25.0], 东京: [139.7, 35.7], 京都: [135.8, 35.0], 大阪: [135.5, 34.7],
    首尔: [127.0, 37.6], 曼谷: [100.5, 13.8], 新加坡: [103.8, 1.35], 吉隆坡: [101.7, 3.1], 巴黎: [2.35, 48.9], 伦敦: [-0.13, 51.5],
    纽约: [-74.0, 40.7], 旧金山: [-122.4, 37.8], 悉尼: [151.2, -33.9], 雷克雅未克: [-21.9, 64.1], 奥克兰: [174.8, -36.8],
    罗马: [12.5, 41.9], 柏林: [13.4, 52.5], 阿姆斯特丹: [4.9, 52.4], 巴塞罗那: [2.17, 41.4], 莫斯科: [37.6, 55.8],
    迪拜: [55.3, 25.3], 伊斯坦布尔: [28.98, 41.0]
  };

  function renderMap(P, box) {
    var visited = P.visited || [];
    var wish = P.wish || [];
    var coords = P.coords || {};
    var notes = P.notes || {};
    function where(name) { return coords[name] || CITY[name] || null; }

    var wrap = el('div', 'mp');
    box.appendChild(wrap);
    wrap.appendChild(el('p', 'pn-lead', '去过 ' + visited.length + ' 个地方，还想去 ' + wish.length + ' 个。'));

    var W = 440;
    var H = 290;
    var known = visited.filter(where);
    var unknown = visited.filter(function (n) { return !where(n); });

    var frame = el('div', 'mp-case');
    wrap.appendChild(frame);
    var lid = el('div', 'mp-lid');
    frame.appendChild(lid);
    var svg = svgEl('svg', { class: 'mp-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '去过的地方的地图' });
    lid.appendChild(svg);
    var card = el('div', 'mp-card');
    card.hidden = true;
    card.setAttribute('aria-live', 'polite');
    lid.appendChild(card);

    // graticule and compass
    for (var g = 1; g < 8; g++) {
      svgEl('line', { x1: g * W / 8, x2: g * W / 8, y1: 0, y2: H, class: 'mp-grid' }, svg);
      if (g < 5) svgEl('line', { x1: 0, x2: W, y1: g * H / 5, y2: g * H / 5, class: 'mp-grid' }, svg);
    }
    var comp = svgEl('g', { class: 'mp-compass', transform: 'translate(' + (W - 38) + ' 40)' }, svg);
    svgEl('circle', { r: 17, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4 }, comp);
    svgEl('path', { d: 'M0 -15 L4 0 L0 15 L-4 0z', fill: 'currentColor' }, comp);
    svgEl('text', { y: -21, 'text-anchor': 'middle', class: 'mp-n' }, comp).textContent = 'N';

    var pins = [];
    var pts = [];
    if (known.length) {
      var lons = known.map(function (n) { return where(n)[0]; });
      var lats = known.map(function (n) { return where(n)[1]; });
      var lon0 = Math.min.apply(null, lons), lon1 = Math.max.apply(null, lons);
      var lat0 = Math.min.apply(null, lats), lat1 = Math.max.apply(null, lats);
      var kx = Math.cos(((lat0 + lat1) / 2) * Math.PI / 180);
      var dx = Math.max((lon1 - lon0) * kx, 9);
      var dy = Math.max(lat1 - lat0, 9);
      var sc = Math.min((W - 110) / dx, (H - 100) / dy);
      var cx = (lon0 + lon1) / 2;
      var cy = (lat0 + lat1) / 2;
      pts = known.map(function (n) {
        var c = where(n);
        return { name: n, x: W / 2 + (c[0] - cx) * kx * sc, y: H / 2 - (c[1] - cy) * sc };
      });
      // islands: a hand-inked patch under every place
      pts.forEach(function (p) {
        var rand = rng(hashOf(p.name));
        var n = 9;
        var v = [];
        for (var i = 0; i < n; i++) {
          var a = i / n * Math.PI * 2;
          var r = 24 + rand() * 12;
          v.push([p.x + Math.cos(a) * r * 1.15, p.y + Math.sin(a) * r * 0.85]);
        }
        // a smooth closed blob: curves through the midpoints, pulled towards each vertex
        var mid = function (a1, b1) { return [(a1[0] + b1[0]) / 2, (a1[1] + b1[1]) / 2]; };
        var m0 = mid(v[n - 1], v[0]);
        var d = 'M' + m0[0].toFixed(1) + ' ' + m0[1].toFixed(1);
        for (var j = 0; j < n; j++) {
          var m = mid(v[j], v[(j + 1) % n]);
          d += 'Q' + v[j][0].toFixed(1) + ' ' + v[j][1].toFixed(1) + ' ' + m[0].toFixed(1) + ' ' + m[1].toFixed(1);
        }
        svgEl('path', { d: d + 'Z', class: 'mp-land', 'stroke-linejoin': 'round' }, svg);
      });
      if (pts.length > 1) {
        svgEl('path', {
          d: pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(''),
          class: 'mp-route', fill: 'none'
        }, svg);
      }
      pts.forEach(function (p) {
        var pin = svgEl('g', { class: 'mp-pin', transform: 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')', tabindex: '0', role: 'button', 'aria-label': p.name }, svg);
        svgEl('path', { d: 'M0 0 C-9 -12 -9 -24 0 -24 C9 -24 9 -12 0 0z', class: 'mp-pin-body' }, pin);
        svgEl('circle', { cy: -16, r: 3, class: 'mp-pin-dot' }, pin);
        pin.addEventListener('click', function () { pick(p.name); });
        pin.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(p.name); } });
        pins.push({ name: p.name, node: pin, x: p.x, y: p.y });
      });
    } else {
      svgEl('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'mp-empty' }, svg).textContent = '地图还是空白的，去哪儿走走吧。';
    }

    function pick(name) {
      pins.forEach(function (p) { p.node.classList.toggle('is-on', p.name === name); });
      stamps.forEach(function (s) { s.classList.toggle('is-on', s.getAttribute('data-name') === name); });
      card.textContent = '';
      card.appendChild(el('b', null, name));
      card.appendChild(el('span', null, notes[name] || '去过这里。'));
      card.hidden = false;
    }

    var stampRow = el('div', 'mp-stamps');
    stampRow.setAttribute('role', 'group');
    stampRow.setAttribute('aria-label', '去过的地方');
    var stamps = [];
    visited.forEach(function (n, i) {
      var b = el('button', 'mp-stamp', n);
      b.type = 'button';
      b.setAttribute('data-name', n);
      b.style.setProperty('--tilt', ((hashOf(n) % 5) - 2) * 1.2 + 'deg');
      b.addEventListener('click', function () { if (where(n)) pick(n); else { card.textContent = ''; card.appendChild(el('b', null, n)); card.appendChild(el('span', null, notes[n] || '去过这里。（地图上还没标位置）')); card.hidden = false; } });
      stampRow.appendChild(b);
      stamps.push(b);
    });
    wrap.appendChild(stampRow);
    if (unknown.length) wrap.appendChild(el('p', 'pn-note', '「' + unknown.join('、') + '」不在内置的地名表里，在 places.yaml 的 coords 里补上经纬度就会出现在地图上。'));

    if (wish.length) {
      var tags = el('div', 'mp-wish');
      tags.appendChild(el('span', 'mp-wish-title', '想去'));
      wish.forEach(function (n) {
        var t = el('span', 'mp-tag', n);
        t.style.setProperty('--tilt', ((hashOf(n) % 5) - 2) * 1.4 + 'deg');
        tags.appendChild(t);
      });
      wrap.appendChild(tags);
    }
  }

  /* --- The telescope: demos as stars you find by dragging the sky --- */
  function renderTelescope(P, box) {
    var items = P.items || [];
    var wrap = el('div', 'tl');
    box.appendChild(wrap);
    var view = el('div', 'tl-view');
    view.setAttribute('role', 'group');
    view.setAttribute('aria-label', '望远镜里的星空，拖动可以平移');
    var sky = el('div', 'tl-sky');
    view.appendChild(sky);
    view.appendChild(el('div', 'tl-cross'));
    view.appendChild(el('div', 'tl-ring'));
    wrap.appendChild(view);
    var card = el('div', 'tl-card');
    card.setAttribute('aria-live', 'polite');
    wrap.appendChild(card);
    wrap.appendChild(el('p', 'pn-note', '拖动夜空找星星，每颗星是一个小实验。亮黄色的可以玩，淡蓝色的还在做。'));

    var SK = 2.2; // the sky is this many times wider than the eyepiece
    var rand = rng(20261017);
    for (var i = 0; i < 150; i++) {
      var s = el('span', 'tl-dot');
      s.style.left = (rand() * 100).toFixed(1) + '%';
      s.style.top = (rand() * 100).toFixed(1) + '%';
      var sz = 1.2 + rand() * 2;
      s.style.width = s.style.height = sz.toFixed(1) + 'px';
      s.style.opacity = (0.35 + rand() * 0.55).toFixed(2);
      sky.appendChild(s);
    }

    var stars2 = items.map(function (d, i) {
      var h = hashOf(d.title);
      var ang = i * 2.399 + (h % 100) / 100;
      var rad = 0.06 + 0.06 * Math.sqrt(i);
      return { d: d, x: 0.5 + Math.cos(ang) * rad, y: 0.5 + Math.sin(ang) * rad };
    });
    if (stars2.length > 1) {
      var lines = svgEl('svg', { class: 'tl-lines', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      svgEl('path', { d: stars2.map(function (s, i) { return (i ? 'L' : 'M') + (s.x * 100).toFixed(1) + ' ' + (s.y * 100).toFixed(1); }).join(''), class: 'tl-link', fill: 'none', 'vector-effect': 'non-scaling-stroke' }, lines);
      sky.appendChild(lines);
    }

    var tx = 0;
    var ty = 0;
    var vw = 0;
    function size() { vw = view.clientWidth; return vw; }
    function apply(animate) {
      var w = vw || size();
      if (!w) return;
      var lim = (SK - 1) * w;
      tx = clampN(tx, -lim, 0);
      ty = clampN(ty, -lim, 0);
      sky.style.transition = animate && !reduce.matches ? 'transform 0.55s cubic-bezier(0.3, 0.7, 0.2, 1)' : 'none';
      sky.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
    }
    function centre(s, animate) {
      var w = size();
      if (!w) return;
      tx = w / 2 - s.x * w * SK;
      ty = w / 2 - s.y * w * SK;
      apply(animate);
    }

    var nodes = [];
    var cur = -1;
    function pick(i) {
      cur = i;
      var d = stars2[i].d;
      nodes.forEach(function (n, k) { n.classList.toggle('is-on', k === i); });
      card.textContent = '';
      var top = el('div', 'tl-card-top');
      top.appendChild(el('b', null, d.title));
      if (d.status) top.appendChild(el('span', 'tl-status' + (d.status === '可以玩' ? ' is-live' : ''), d.status));
      card.appendChild(top);
      if (d.desc) card.appendChild(el('p', 'tl-desc', d.desc));
      if (d.href) {
        var a = link(d.href, 'pn-chip is-link');
        a.textContent = '去玩 →';
        card.appendChild(a);
      }
      centre(stars2[i], true);
    }

    stars2.forEach(function (s, i) {
      var b = el('button', 'tl-star' + (s.d.status === '可以玩' ? ' is-live' : ''));
      b.type = 'button';
      b.style.left = (s.x * 100).toFixed(2) + '%';
      b.style.top = (s.y * 100).toFixed(2) + '%';
      b.style.setProperty('--d', (-(i * 0.8)).toFixed(1) + 's');
      b.setAttribute('aria-label', s.d.title + (s.d.status ? '，' + s.d.status : ''));
      b.appendChild(el('i'));
      b.appendChild(el('span', 'tl-name', s.d.title));
      b.addEventListener('click', function () { if (!moved) pick(i); });
      sky.appendChild(b);
      nodes.push(b);
    });

    var drag = null;
    var moved = false;
    view.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
      moved = false;
      try { view.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    view.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      tx = drag.tx + dx;
      ty = drag.ty + dy;
      apply(false);
    });
    function endDrag() { drag = null; setTimeout(function () { moved = false; }, 0); }
    view.addEventListener('pointerup', endDrag);
    view.addEventListener('pointercancel', endDrag);
    view.addEventListener('keydown', function (e) {
      var step = size() * 0.12;
      if (e.key === 'ArrowLeft') tx += step;
      else if (e.key === 'ArrowRight') tx -= step;
      else if (e.key === 'ArrowUp') ty += step;
      else if (e.key === 'ArrowDown') ty -= step;
      else return;
      e.preventDefault();
      e.stopPropagation();
      apply(true);
    });
    nodes.forEach(function (n, i) { n.addEventListener('focus', function () { if (cur !== i) centre(stars2[i], true); }); });

    if (!items.length) card.appendChild(empty('夜空里还没有星星。'));
    else {
      pick(0);
      // the eyepiece has no width until the panel is shown, so place the sky again once it is
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (size()) centre(stars2[cur < 0 ? 0 : cur], false); }); });
    }
  }

  /* --- Batch three: goals, friends, search, subscribe, guestbook, about, essays, daily notes, now --- */
  function copyText(text, node, done) {
    function select() {
      var r = document.createRange();
      r.selectNodeContents(node);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      done(false);
    }
    try {
      navigator.clipboard.writeText(text).then(function () { done(true); }, select);
    } catch (e) {
      select();
    }
  }

  function chirp() {
    tone(2093, { type: 'sine', dur: 0.12, vol: 0.07 });
    tone(2637, { type: 'sine', dur: 0.14, vol: 0.07, at: 0.1 });
    tone(2349, { type: 'sine', dur: 0.2, vol: 0.06, at: 0.22 });
  }

  /* --- Flag: bunting, one pennant per goal, filled up as it gets done --- */
  function renderFlags(P, box) {
    var items = P.items || [];
    var wrap = el('div', 'fl');
    box.appendChild(wrap);
    var all = 0;
    var got = 0;
    items.forEach(function (g) { all += g.total || 0; got += Math.min(g.done || 0, g.total || 0); });
    var pct = all ? got / all : 0;

    var stage = el('div', 'fl-stage');
    wrap.appendChild(stage);
    var pole = el('div', 'fl-pole');
    pole.setAttribute('role', 'img');
    pole.setAttribute('aria-label', '全部目标完成了 ' + Math.round(pct * 100) + '%');
    var flag = el('span', 'fl-flag');
    pole.appendChild(flag);
    pole.appendChild(el('span', 'fl-pct', Math.round(pct * 100) + '%'));
    stage.appendChild(pole);
    // the flag climbs the pole once the panel is up
    flag.style.setProperty('--rise', '0');
    setTimeout(function () { flag.style.setProperty('--rise', String(pct)); }, 120);

    var bunting = el('div', 'fl-bunting');
    stage.appendChild(bunting);
    if (P.year) bunting.appendChild(el('p', 'fl-year', P.year + ' 年的目标'));
    var PER = 3;
    var COL = ['#d2552d', '#e0a33a', '#4f8a4a', '#3f6e8c', '#8a5a83'];
    for (var r = 0; r < Math.max(1, Math.ceil(items.length / PER)); r++) {
      var row = el('div', 'fl-row');
      var rope = svgEl('svg', { class: 'fl-rope', viewBox: '0 0 100 20', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      svgEl('path', { d: 'M-2 3 Q50 22 102 3', fill: 'none', stroke: '#6a4a2e', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, rope);
      row.appendChild(rope);
      var line = el('div', 'fl-pens');
      row.appendChild(line);
      items.slice(r * PER, (r + 1) * PER).forEach(function (g, j) {
        var i = r * PER + j;
        var p = g.total ? Math.min(1, (g.done || 0) / g.total) : 0;
        var item = el('div', 'fl-pen');
        item.style.setProperty('--d', (-(i * 0.8)).toFixed(1) + 's');
        item.setAttribute('role', 'img');
        item.setAttribute('aria-label', g.title + '：' + (g.done || 0) + ' / ' + (g.total || 0) + (g.unit || ''));
        var color = COL[i % COL.length];
        var s = svgEl('svg', { viewBox: '0 0 100 112', class: 'fl-tri', 'aria-hidden': 'true' });
        var defs = svgEl('defs', {}, s);
        var cp = svgEl('clipPath', { id: 'fl-c' + i }, defs);
        svgEl('rect', { x: 0, y: 112 - 112 * p, width: 100, height: 112 * p }, cp);
        svgEl('path', { d: 'M4 4 H96 L50 108Z', fill: '#f6ecd0' }, s);
        svgEl('path', { d: 'M4 4 H96 L50 108Z', fill: color, 'clip-path': 'url(#fl-c' + i + ')' }, s);
        svgEl('path', { d: 'M4 4 H96 L50 108Z', fill: 'none', stroke: '#2b1a0e', 'stroke-width': 3, 'stroke-linejoin': 'round' }, s);
        item.appendChild(s);
        if (p >= 1) item.appendChild(el('span', 'fl-done', '★'));
        item.appendChild(el('span', 'fl-title', g.title));
        item.appendChild(el('span', 'fl-count', (g.done || 0) + ' / ' + (g.total || 0) + (g.unit ? ' ' + g.unit : '')));
        line.appendChild(item);
      });
      bunting.appendChild(row);
    }
    if (!items.length) bunting.appendChild(empty('今年的目标还没定。'));
  }

  /* --- Birdhouse: one little house per friend --- */
  var HOUSES = ['#c8553d', '#4f7f78', '#e0a33a', '#6c7fb0', '#8a5a83', '#6b8e4e'];

  function houseSvg(color) {
    var s = svgEl('svg', { class: 'bh-svg', viewBox: '0 0 90 112', 'aria-hidden': 'true' });
    var st = { stroke: '#2b1a0e', 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    function add(tag, a) { var o = {}; for (var k in st) o[k] = st[k]; for (var k2 in a) o[k2] = a[k2]; return svgEl(tag, o, s); }
    add('rect', { x: 40, y: 94, width: 10, height: 18, fill: '#8a5a35' });
    add('rect', { x: 14, y: 40, width: 62, height: 56, rx: 3, fill: '#e9cf9e' });
    add('path', { d: 'M5 44 L45 8 L85 44Z', fill: color });
    add('circle', { cx: 45, cy: 66, r: 11, fill: '#3a2a1d' });
    var bird = svgEl('g', { class: 'bh-bird' }, s);
    svgEl('circle', { cx: 45, cy: 68, r: 7, fill: '#f3d56b', stroke: '#2b1a0e', 'stroke-width': 1.6 }, bird);
    svgEl('path', { d: 'M51 66 l7 2 l-7 3z', fill: '#d2552d', stroke: '#2b1a0e', 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, bird);
    svgEl('circle', { cx: 46, cy: 66, r: 1.3, fill: '#2b1a0e' }, bird);
    add('line', { x1: 28, x2: 62, y1: 86, y2: 86, 'stroke-width': 3 });
    return s;
  }

  function renderBirdhouses(P, box) {
    var items = P.items || [];
    var wrap = el('div', 'bh');
    box.appendChild(wrap);
    var branch = el('div', 'bh-branch');
    branch.setAttribute('aria-hidden', 'true');
    wrap.appendChild(branch);
    var row = el('div', 'bh-row');
    wrap.appendChild(row);
    items.forEach(function (f, i) {
      var a = link(f.url || '#', 'bh-house');
      a.style.setProperty('--d', (-(i * 0.9)).toFixed(1) + 's');
      a.appendChild(el('span', 'bh-string'));
      a.appendChild(houseSvg(HOUSES[hashOf(f.name || String(i)) % HOUSES.length]));
      var plate = el('span', 'bh-plate');
      plate.appendChild(el('span', 'bh-name', f.name));
      if (f.desc) plate.appendChild(el('span', 'bh-desc', f.desc));
      a.appendChild(plate);
      a.addEventListener('click', function () {
        a.classList.remove('is-out');
        void a.offsetWidth;
        a.classList.add('is-out');
        chirp();
        setTimeout(function () { a.classList.remove('is-out'); }, 1400);
      });
      row.appendChild(a);
    });
    if (!items.length) wrap.appendChild(empty('树枝上还没挂鸟屋。'));
    wrap.appendChild(el('p', 'pn-note', '点一间鸟屋，小鸟飞出来，带你去朋友的博客（新标签页打开）。'));
  }

  /* --- Owl: ask it something, it fetches a scroll --- */
  function owlSvg() {
    var s = svgEl('svg', { class: 'ow-svg', viewBox: '0 0 140 160', 'aria-hidden': 'true' });
    var st = { stroke: '#2b1a0e', 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    function add(tag, a, parent) { var o = {}; for (var k in st) o[k] = st[k]; for (var k2 in a) o[k2] = a[k2]; return svgEl(tag, o, parent || s); }
    add('path', { d: 'M30 36 L24 12 L52 28Z', fill: '#8f6a4f' });
    add('path', { d: 'M110 36 L116 12 L88 28Z', fill: '#8f6a4f' });
    add('ellipse', { cx: 70, cy: 92, rx: 50, ry: 58, fill: '#a97f5e' });
    add('ellipse', { cx: 70, cy: 112, rx: 30, ry: 38, fill: '#e9cf9e', 'stroke-width': 1.6 });
    var eyes = svgEl('g', { class: 'ow-eyes' }, s);
    [[48, 66], [92, 66]].forEach(function (p) {
      add('circle', { cx: p[0], cy: p[1], r: 19, fill: '#fff9e6' }, eyes);
      var pup = svgEl('g', { class: 'ow-pupil', 'data-cx': p[0], 'data-cy': p[1] }, eyes);
      svgEl('circle', { cx: p[0], cy: p[1], r: 8, fill: '#2b1a0e' }, pup);
      svgEl('circle', { cx: p[0] - 2.5, cy: p[1] - 3, r: 2.4, fill: '#fff' }, pup);
      var lid = svgEl('ellipse', { class: 'ow-lid', cx: p[0], cy: p[1], rx: 19.5, ry: 19.5, fill: '#8f6a4f', stroke: '#2b1a0e', 'stroke-width': 2 }, eyes);
      lid.style.transformOrigin = p[0] + 'px ' + (p[1] - 19) + 'px';
    });
    add('path', { d: 'M64 80 L76 80 L70 94Z', fill: '#e0a33a' });
    add('path', { d: 'M54 148 l-4 10 M62 150 l-2 10 M86 150 l2 10 M94 148 l4 10', fill: 'none', stroke: '#e0a33a' });
    return s;
  }

  /* Full-text search. Pagefind builds its index when you run `npm run build`, so in `npm run dev`
     (and in the plain preview) it is missing and the owl falls back to titles and tags. */
  var pagefindLoad = null;
  function loadPagefind() {
    if (!pagefindLoad) {
      var url = '/pagefind/pagefind.js';
      pagefindLoad = import(/* @vite-ignore */ url).then(function (m) { return m; }, function () { return null; });
    }
    return pagefindLoad;
  }
  function pathOf(u) { return String(u || '').split('#')[0].split('?')[0].replace(/\/+$/, ''); }
  // resolves to null when there is no index, otherwise {path: {url, excerpt, meta}}
  function searchFull(q) {
    return loadPagefind().then(function (pf) {
      if (!pf || !pf.search) return null;
      return pf.search(q).then(function (res) {
        return Promise.all(res.results.slice(0, 6).map(function (r) { return r.data(); }));
      }).then(function (list) {
        var map = {};
        list.forEach(function (d) { map[pathOf(d.url)] = d; });
        return map;
      });
    }).catch(function () { return null; });
  }
  // Pagefind marks matches with <mark>; rebuild only text and marks, nothing else
  function excerptNode(html) {
    var span = el('span', 'ow-excerpt');
    try {
      var doc = new DOMParser().parseFromString('<body>' + html, 'text/html');
      each(doc.body.childNodes, function (n) {
        if (n.nodeName === 'MARK') span.appendChild(el('mark', null, n.textContent));
        else span.appendChild(document.createTextNode(n.textContent));
      });
    } catch (e) { /* no excerpt */ }
    return span;
  }

  function renderOwl(P, box) {
    var wrap = el('div', 'ow');
    box.appendChild(wrap);
    var top = el('div', 'ow-top');
    wrap.appendChild(top);
    var owl = owlSvg();
    var bird = el('div', 'ow-bird');
    bird.appendChild(owl);
    top.appendChild(bird);
    var bubble = el('div', 'ow-bubble');
    var form = el('form', 'ow-form');
    form.setAttribute('role', 'search');
    var input = el('input');
    input.type = 'search';
    input.placeholder = '问我：文章标题或标签';
    input.setAttribute('aria-label', '搜索文章');
    form.appendChild(input);
    bubble.appendChild(form);
    var say = el('p', 'ow-say', '咕？想找哪一篇？');
    say.setAttribute('aria-live', 'polite');
    bubble.appendChild(say);
    top.appendChild(bubble);
    var out = el('div', 'ow-out');
    wrap.appendChild(out);

    // eyes follow the pointer
    var pupils = owl.querySelectorAll('.ow-pupil');
    function look(e) {
      var r = owl.getBoundingClientRect();
      if (!r.width) return;
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height * 0.42;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var m = Math.min(6.5, d / 40);
      each(pupils, function (p) { p.style.transform = 'translate(' + (dx / d * m).toFixed(1) + 'px,' + (dy / d * m).toFixed(1) + 'px)'; });
    }
    document.addEventListener('pointermove', look);
    var timer = null;
    onLeave(function () { document.removeEventListener('pointermove', look); clearTimeout(timer); });

    var seq = 0;
    function draw(q, local, full) {
      var seen = {};
      var rows = [];
      local.forEach(function (p) {
        var key = pathOf(p.href);
        seen[key] = true;
        rows.push({ title: p.title, href: p.href, meta: [p.dateLabel].concat(p.tags || []), excerpt: full && full[key] ? full[key].excerpt : '' });
      });
      Object.keys(full || {}).forEach(function (key) {
        if (seen[key]) return;
        var f = full[key];
        var post = POSTS.filter(function (p) { return pathOf(p.href) === key; })[0];
        rows.push({
          title: post ? post.title : (f.meta && f.meta.title) || f.url,
          href: post ? post.href : f.url,
          meta: post ? [post.dateLabel].concat(post.tags || []) : [],
          excerpt: f.excerpt
        });
      });
      out.textContent = '';
      owl.classList.remove('is-think');
      if (!q) say.textContent = '最近的几篇，给你叼来了。';
      else if (rows.length) say.textContent = '叼来了 ' + rows.length + ' 卷。';
      else say.textContent = full === null ? '翻遍了标题和标签，没找到。（现在只搜标题和标签，正式构建后会搜全文。）' : '翻遍了，没找到。换个词？';
      rows.slice(0, 6).forEach(function (r, i) {
        var a = link(r.href, 'ow-scroll');
        a.style.setProperty('--i', String(i));
        a.appendChild(el('span', 'ow-roll'));
        var paper = el('span', 'ow-paper');
        paper.appendChild(el('span', 'ow-stitle', r.title));
        if (r.excerpt) paper.appendChild(excerptNode(r.excerpt));
        paper.appendChild(el('span', 'ow-smeta', r.meta.filter(Boolean).join(' · ')));
        a.appendChild(paper);
        a.appendChild(el('span', 'ow-roll'));
        out.appendChild(a);
      });
      if (q && !rows.length) out.appendChild(empty('没有这一卷。'));
    }
    function run() {
      var mine = ++seq;
      var q = input.value.trim();
      var ql = q.toLowerCase();
      var local = ql ? POSTS.filter(function (p) {
        return p.title.toLowerCase().indexOf(ql) > -1 || (p.tags || []).some(function (t) { return t.toLowerCase().indexOf(ql) > -1; });
      }) : POSTS.slice(0, 4);
      if (!q) { draw(q, local, {}); return; }
      searchFull(q).then(function (full) {
        if (mine === seq) draw(q, local, full);
      });
    }
    function think() {
      clearTimeout(timer);
      owl.classList.add('is-think');
      say.textContent = '嗯……让我想想……';
      timer = setTimeout(run, reduce.matches ? 0 : 520);
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); think(); });
    input.addEventListener('input', think);
    run();
  }

  /* --- Chime: each tube is a way to subscribe --- */
  function renderChime(P, box) {
    var rss = P.rss || '';
    var enc = encodeURIComponent(rss);
    var opts = [
      { key: 'RSS', note: 'C6', text: '把这个地址粘进任意 RSS 阅读器：', copy: rss },
      { key: 'Feedly', note: 'D6', text: '在 Feedly 里订阅（需要登录 Feedly）：', href: 'https://feedly.com/i/subscription/feed%2F' + enc },
      { key: 'Inoreader', note: 'E6', text: '在 Inoreader 里订阅：', href: 'https://www.inoreader.com/?add_feed=' + enc },
      { key: 'feed://', note: 'G6', text: '用电脑上装好的阅读器打开：', href: 'feed:' + rss },
      { key: '邮件', note: 'A6', text: '邮件订阅还没做，先用 RSS 吧。' }
    ];
    var HEIGHTS = [96, 84, 70, 58, 46];
    var wrap = el('div', 'cm');
    box.appendChild(wrap);
    var rack = el('div', 'cm-rack');
    wrap.appendChild(rack);
    rack.appendChild(el('span', 'cm-top'));
    var tubes = el('div', 'cm-tubes');
    tubes.setAttribute('role', 'group');
    tubes.setAttribute('aria-label', '风铃，每根管是一种订阅方式');
    rack.appendChild(tubes);
    var info = el('div', 'cm-info');
    info.setAttribute('aria-live', 'polite');
    wrap.appendChild(info);
    var btns = [];
    var timers4 = [];
    onLeave(function () { timers4.forEach(clearTimeout); });

    function ring(i, quiet) {
      var b = btns[i];
      b.classList.remove('is-swing');
      void b.offsetWidth;
      b.classList.add('is-swing');
      if (!quiet) tone(NOTE[opts[i].note], { type: 'sine', dur: 2.6, vol: 0.1 });
    }

    function pick(i) {
      var o = opts[i];
      btns.forEach(function (b, k) { b.classList.toggle('is-on', k === i); b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      info.textContent = '';
      info.appendChild(el('p', 'cm-text', o.text));
      if (o.copy) {
        var row = el('div', 'pn-copy');
        var code = el('code', null, o.copy);
        row.appendChild(code);
        var cb = button('复制', function () {
          copyText(code.textContent, code, function (ok) {
            cb.textContent = ok ? '已复制' : '请手动复制';
            setTimeout(function () { cb.textContent = '复制'; }, 1600);
          });
        });
        row.appendChild(cb);
        info.appendChild(row);
      } else if (o.href) {
        var a = link(o.href, 'pn-chip is-link');
        a.textContent = '订阅 →';
        if (!/^https?:/.test(o.href)) a.removeAttribute('target');
        info.appendChild(a);
      }
    }

    opts.forEach(function (o, i) {
      var b = el('button', 'cm-tube');
      b.type = 'button';
      b.style.setProperty('--h', HEIGHTS[i] + 'px');
      b.style.setProperty('--d', (-(i * 0.6)).toFixed(1) + 's');
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', o.key);
      b.appendChild(el('span', 'cm-string'));
      b.appendChild(el('span', 'cm-pipe'));
      b.appendChild(el('span', 'cm-clap'));
      b.appendChild(el('span', 'cm-label', o.key));
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') ring(i); });
      b.addEventListener('click', function () { ring(i); pick(i); });
      tubes.appendChild(b);
      btns.push(b);
    });
    var act2 = el('div', 'th-actions');
    act2.appendChild(button('摇一下风铃', function () {
      ringChime();
      btns.forEach(function (_, i) { timers4.push(setTimeout(function () { ring(i, true); }, i * 90)); });
    }));
    wrap.appendChild(act2);
    pick(0);
  }

  /* --- Mailbox: each message an envelope --- */
  function renderMailbox(P, box) {
    var items = (P.items || []).slice();
    var wrap = el('div', 'mb');
    box.appendChild(wrap);
    var head = el('div', 'mb-head');
    var art = svgEl('svg', { class: 'mb-art', viewBox: '0 0 92 76', 'aria-hidden': 'true' });
    var ast = { stroke: '#2b1a0e', 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    function aadd(tag, a, parent) { var o = {}; for (var k in ast) o[k] = ast[k]; for (var k2 in a) o[k2] = a[k2]; return svgEl(tag, o, parent || art); }
    aadd('rect', { x: 36, y: 44, width: 9, height: 30, fill: '#8a5a35' });
    var flagG = svgEl('g', { class: 'mb-flagg' }, art);
    aadd('rect', { x: 68, y: 12, width: 3, height: 24, fill: '#6a4a2e' }, flagG);
    aadd('rect', { x: 71, y: 12, width: 14, height: 9, fill: '#d2552d', 'stroke-width': 2 }, flagG);
    aadd('path', { d: 'M8 46 V26 Q8 8 40 8 Q72 8 72 26 V46Z', fill: '#4f7f78' });
    aadd('path', { d: 'M52 46 V22 Q52 12 40 10', fill: 'none', 'stroke-width': 1.6 });
    aadd('rect', { x: 18, y: 30, width: 26, height: 5, rx: 2, fill: '#2b1a0e' });
    var left = el('div', 'mb-left');
    left.appendChild(art);
    // With giscus configured (src/data/site.json), the letter paper holds the real thread;
    // without it (npm run dev before setup, or the plain preview) it is a local-only draft.
    // giscus.js may load after this panel opens (deep link to #mailbox), so look for its config
    // now and for the loader itself only when the paper is opened
    var live = !!document.getElementById('th-giscus');
    var mounted = false;
    // On the guestbook page the full thread is already below: the button just goes there.
    var pageThread = live && document.querySelector('.page-view [data-giscus-term="guestbook"]');
    var write = button(live ? (pageThread ? '写一封信 ↓' : '拆开信箱 · 写信') : '写一封信', function () {
      if (pageThread) { pageThread.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' }); return; }
      paper.hidden = !paper.hidden;
      write.setAttribute('aria-expanded', paper.hidden ? 'false' : 'true');
      if (paper.hidden) return;
      if (live) {
        if (!mounted && window.THGiscus) { window.THGiscus.mount(slot, 'guestbook', { light: true }); mounted = true; }
      } else {
        nameIn.focus({ preventScroll: true });
      }
    }, 'mb-write');
    write.setAttribute('aria-expanded', 'false');
    left.appendChild(write);
    head.appendChild(left);
    if (!live) head.appendChild(el('span', 'mb-count', items.length + ' 封信'));
    wrap.appendChild(head);

    var paper = el(live ? 'div' : 'form', 'mb-paper' + (live ? ' is-live' : ''));
    paper.hidden = true;
    var slot = null;
    if (live) {
      paper.appendChild(el('p', 'pn-note', '用 GitHub 账号登录就能寄出。所有来信和我的回信都在这张信纸里。'));
      slot = el('div', 'mb-giscus');
      paper.appendChild(slot);
    }
    var nameIn = el('input');
    nameIn.type = 'text';
    nameIn.placeholder = '署名（可以不写）';
    nameIn.maxLength = 24;
    nameIn.setAttribute('aria-label', '署名');
    var textIn = el('textarea');
    textIn.placeholder = '亲爱的树屋主人：';
    textIn.rows = 4;
    textIn.maxLength = 300;
    textIn.setAttribute('aria-label', '信的内容');
    var send = el('button', 'mb-send', '寄出');
    send.type = 'submit';
    if (!live) {
      paper.appendChild(nameIn);
      paper.appendChild(textIn);
      paper.appendChild(send);
      paper.appendChild(el('p', 'pn-note', '现在只是预览：这封信只会出现在你这一页里。接入 giscus 之后，用 GitHub 账号登录才能真的寄出。'));
    }
    wrap.appendChild(paper);

    var stack = el('div', 'mb-stack');
    wrap.appendChild(stack);

    function envelope(m, mine) {
      var item = el('div', 'mb-item' + (mine ? ' is-mine' : ''));
      var env = el('button', 'mb-env');
      env.type = 'button';
      env.setAttribute('aria-expanded', 'false');
      env.appendChild(el('span', 'mb-flap'));
      env.appendChild(el('span', 'mb-stamp', mine ? '草' : '★'));
      var from = el('span', 'mb-from');
      from.appendChild(el('b', null, (m.name || '匿名') + (mine ? '（你的草稿）' : '')));
      from.appendChild(el('span', null, m.dateLabel || '刚刚'));
      env.appendChild(from);
      var letter = el('div', 'mb-letter');
      var inner = el('div');
      inner.appendChild(el('p', null, m.text));
      letter.appendChild(inner);
      item.appendChild(env);
      item.appendChild(letter);
      env.addEventListener('click', function () {
        var on = item.classList.toggle('is-open');
        env.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      return item;
    }

    if (live && items.length) wrap.insertBefore(el('p', 'mb-pinned', '钉在信箱上的几封'), stack);
    items.forEach(function (m) { stack.appendChild(envelope(m, false)); });
    if (!items.length && !live) stack.appendChild(empty('信箱是空的。'));
    if (live) return;
    paper.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = textIn.value.trim();
      if (!text) { textIn.focus(); return; }
      var it = envelope({ name: nameIn.value.trim(), text: text }, true);
      stack.insertBefore(it, stack.firstChild);
      it.classList.add('is-new');
      textIn.value = '';
      paper.hidden = true;
      write.setAttribute('aria-expanded', 'false');
      head.querySelector('.mb-count').textContent = stack.querySelectorAll('.mb-item').length + ' 封信';
    });
  }

  /* --- Sign: an engraved board, small planks for the links --- */
  function renderSign(P, box) {
    var wrap = el('div', 'sg');
    box.appendChild(wrap);
    var board = el('div', 'sg-board');
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { board.appendChild(el('span', 'sg-nail ' + c)); });
    if (P.name) {
      board.appendChild(el('h4', 'sg-name', P.name));
      var lines = P.lines || [];
      if (lines.length) {
        var ul = el('p', 'sg-lines');
        lines.forEach(function (t) { ul.appendChild(el('span', 'sg-line', t)); });
        board.appendChild(ul);
      }
      if ((P.tags || []).length) {
        var tg = el('p', 'sg-tags');
        tg.appendChild(el('span', 'sg-tags-lead', '擅长'));
        P.tags.forEach(function (t) { tg.appendChild(el('span', 'sg-tag', t)); });
        board.appendChild(tg);
      }
    } else {
      board.appendChild(el('p', 'sg-bio', P.bio || '这块木牌还空着。'));
    }
    wrap.appendChild(board);
    var planks = el('div', 'sg-planks');
    (P.links || []).forEach(function (l, i) {
      var a = link(l.url, 'sg-plank');
      a.style.setProperty('--d', (-(i * 0.7)).toFixed(1) + 's');
      a.appendChild(el('span', 'sg-rope'));
      a.appendChild(el('span', 'sg-plank-text', l.label));
      planks.appendChild(a);
    });
    wrap.appendChild(planks);
  }

  /* --- Hammock: essays as notebook pages --- */
  function renderDiary(P, box) {
    var items = P.items || [];
    var wrap = el('div', 'dy');
    box.appendChild(wrap);
    var ropes = el('div', 'dy-ropes');
    ropes.setAttribute('aria-hidden', 'true');
    wrap.appendChild(ropes);
    var cradle = el('div', 'dy-cradle');
    wrap.appendChild(cradle);
    var book = el('div', 'dy-book');
    cradle.appendChild(book);
    var page = el('article', 'dy-page');
    page.setAttribute('aria-live', 'polite');
    book.appendChild(page);
    var nav = el('div', 'dy-nav');
    wrap.appendChild(nav);
    var at = 0;
    var timer = null;
    onLeave(function () { clearTimeout(timer); });

    function fill(p) {
      page.textContent = '';
      page.appendChild(el('p', 'dy-date', p.dateLabel || ''));
      var h = el('h4', 'dy-title');
      h.textContent = p.title;
      page.appendChild(h);
      page.appendChild(el('p', 'dy-sum', p.summary || ''));
      var foot = el('p', 'dy-foot');
      var a = link(p.href, 'dy-go');
      a.textContent = '接着往下读 →';
      foot.appendChild(a);
      if ((p.tags || []).length) foot.appendChild(el('span', 'dy-tags', p.tags.join(' · ')));
      page.appendChild(foot);
    }
    function go(i) {
      if (i === at || i < 0 || i >= items.length) return;
      var dir = i > at ? 1 : -1;
      at = i;
      clearTimeout(timer);
      page.style.setProperty('--dir', String(dir));
      page.classList.remove('is-in');
      page.classList.add('is-out');
      timer = setTimeout(function () {
        fill(items[at]);
        page.classList.remove('is-out');
        void page.offsetWidth;
        page.classList.add('is-in');
        mark();
      }, reduce.matches ? 0 : 170);
    }
    var prev = button('‹ 上一页', function () { go(at - 1); }, 'dy-btn');
    var next = button('下一页 ›', function () { go(at + 1); }, 'dy-btn');
    var dots = el('span', 'dy-dots');
    nav.appendChild(prev);
    nav.appendChild(dots);
    nav.appendChild(next);
    function mark() {
      prev.disabled = at <= 0;
      next.disabled = at >= items.length - 1;
      each(dots.children, function (d, k) { d.classList.toggle('is-on', k === at); });
    }
    items.forEach(function (p, i) {
      var d = el('button', 'dy-dot');
      d.type = 'button';
      d.setAttribute('aria-label', '第 ' + (i + 1) + ' 页：' + p.title);
      d.addEventListener('click', function () { go(i); });
      dots.appendChild(d);
    });
    if (items.length) { fill(items[0]); page.classList.add('is-in'); mark(); }
    else { page.appendChild(empty('这本本子还是空白的。')); nav.hidden = true; }
  }

  /* --- Windowsill: each daily note a plant that grows with age --- */
  function plantSvg(leaves, tall, color) {
    var H = 40 + tall;
    var s = svgEl('svg', { class: 'pt-svg', viewBox: '0 0 80 ' + H, 'aria-hidden': 'true' });
    var st = { stroke: '#2b1a0e', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    function add(tag, a, parent) { var o = {}; for (var k in st) o[k] = st[k]; for (var k2 in a) o[k2] = a[k2]; return svgEl(tag, o, parent || s); }
    var g = svgEl('g', { class: 'pt-plant' }, s);
    add('path', { d: 'M40 ' + H + ' V' + (H - tall + 6), fill: 'none' }, g);
    for (var i = 0; i < leaves; i++) {
      var y = H - 8 - (i + 0.6) * (tall - 10) / leaves;
      var side = i % 2 ? 1 : -1;
      var len = 22 + (i % 3) * 4;
      add('path', { d: 'M40 ' + y.toFixed(1) + ' q' + (side * len) + ' ' + (-14) + ' ' + (side * len * 1.2) + ' ' + (-2) + ' q' + (-side * len * 0.4) + ' 12 ' + (-side * len * 1.2) + ' 2z', fill: color }, g);
    }
    add('ellipse', { cx: 40, cy: H - tall + 4, rx: 8, ry: 6, fill: color }, g);
    return s;
  }

  function renderPots(P, box) {
    var items = P.items || [];
    var wrap = el('div', 'pt');
    box.appendChild(wrap);
    var GREENS = ['#6b8e4e', '#4f8a4a', '#7aa05a', '#5b9a73'];
    var now = Date.now();
    var PER = 3;
    for (var r = 0; r < Math.max(1, Math.ceil(items.length / PER)); r++) {
      var shelf = el('div', 'pt-shelf');
      var row = el('div', 'pt-row');
      var tags = el('div', 'pt-tags');
      shelf.appendChild(row);
      shelf.appendChild(el('div', 'pt-board'));
      shelf.appendChild(tags);
      items.slice(r * PER, (r + 1) * PER).forEach(function (p, j) {
        var i = r * PER + j;
        var age = p.date ? Math.max(0, (now - Date.parse(p.date)) / 86400000) : 30;
        var tall = Math.round(clampN(48 + age * 1.1, 48, 120));
        var leaves = clampN(2 + Math.floor(age / 18), 2, 7);
        var a = link(p.href, 'pt-item');
        a.tabIndex = -1;
        a.setAttribute('aria-hidden', 'true');
        a.style.setProperty('--d', (-(i * 0.9)).toFixed(1) + 's');
        a.appendChild(plantSvg(leaves, tall, GREENS[i % GREENS.length]));
        var pot = el('span', 'pt-pot');
        pot.appendChild(el('span', 'pt-pot-rim'));
        a.appendChild(pot);
        row.appendChild(a);
        var tag = link(p.href, 'pt-tag');
        tag.appendChild(el('span', 'pt-tag-title', p.title));
        tag.appendChild(el('span', 'pt-tag-meta', p.dateLabel || ''));
        function hot(on) { return function () { a.classList.toggle('is-hot', on); }; }
        tag.addEventListener('pointerenter', hot(true));
        tag.addEventListener('pointerleave', hot(false));
        tag.addEventListener('focus', hot(true));
        tag.addEventListener('blur', hot(false));
        tags.appendChild(tag);
      });
      wrap.appendChild(shelf);
    }
    if (!items.length) wrap.appendChild(empty('窗台上还没有花盆。'));
    wrap.appendChild(el('p', 'pn-note', '每篇日常是一盆植物，越早写的越高。'));
  }

  /* --- Blueprint: what I am working on, as notes on a plan --- */
  function renderBlueprint(P, box) {
    var wrap = el('div', 'bp');
    box.appendChild(wrap);
    wrap.appendChild(el('span', 'bp-roll'));
    var sheet = el('div', 'bp-sheet');
    wrap.appendChild(sheet);
    sheet.appendChild(el('p', 'bp-head', 'NOW · 最近在忙'));
    var list = el('ol', 'bp-list');
    (P.items || []).forEach(function (t, i) {
      var li = el('li', 'bp-item');
      li.style.setProperty('--i', String(i));
      li.appendChild(el('span', 'bp-num', String(i + 1)));
      li.appendChild(el('span', 'bp-lead'));
      li.appendChild(el('span', 'bp-text', t));
      list.appendChild(li);
    });
    sheet.appendChild(list);
    if (!(P.items || []).length) sheet.appendChild(el('p', 'bp-empty', '图纸还是空白的。'));
    var block = el('div', 'bp-block');
    block.appendChild(el('span', null, '图号 NO.01'));
    block.appendChild(el('span', null, '更新 ' + (P.updatedLabel || P.updated || '—')));
    sheet.appendChild(block);
  }

  var BESPOKE = { piano: 1, books: 1, music: 1, photos: 1, chalk: 1, stack: 1, drawers: 1, pegs: 1, screen: 1, places: 1, lab: 1, goals: 1, friends: 1, search: 1, subscribe: 1, guestbook: 1, about: 1, now: 1, diary: 1, pots: 1 }; // panels drawn as the object itself

  var RENDER = {
    posts: function (P, box) {
      if (!P.items || !P.items.length) { box.appendChild(empty('这里还没有文章。')); return; }
      box.appendChild(listOf(P.items, function (p) { return entry(p.title, postMeta(p), p.href); }));
    },
    lab: renderTelescope,
    friends: renderBirdhouses,
    music: renderRecord,
    chalk: renderChalk,
    stack: renderStack,
    drawers: renderDrawers,
    pegs: renderPegs,
    books: renderShelf,
    screen: renderProjector,
    photos: renderClothesline,
    piano: renderPiano,
    places: renderMap,
    goals: renderFlags,
    search: renderOwl,
    subscribe: renderChime,
    diary: renderDiary,
    pots: renderPots,
    guestbook: renderMailbox,
    about: renderSign,
    now: renderBlueprint
  };

  /* ---------- An object's own page ---------- */
  function initPage() {
    document.documentElement.classList.add('th-page-mode');
    each(document.querySelectorAll('[data-th-render]'), function (box) {
      var id = box.getAttribute('data-th-render');
      var P = PANELS[id];
      if (!P) return;
      var fn = RENDER[P.skin || P.kind] || RENDER[P.kind];
      if (!fn) return;
      box.textContent = '';
      box.classList.add('is-live');
      box.classList.add('kind-' + (P.skin || P.kind));
      fn(P, box);
    });
    document.addEventListener('keydown', function (e) {
      if (!overlay) return;
      if (e.key === 'Escape') { overlay.close(); return; }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && overlay.key(e)) e.preventDefault();
    });
  }
  if (!scene) { initPage(); return; }

  /* ---------- Panel ---------- */
  // Objects in reading order: floor by floor from the top, left to right.
  var ORDER = Object.keys(PANELS).filter(function (id) { return ITEMS[id] && firstLayer(id); });
  function floorOf(id) {
    var b = boxOf(firstLayer(id));
    var cy = (b[1] + b[3]) / 2;
    return cy < 330 ? 0 : cy < 705 ? 1 : cy < 1110 ? 2 : 3;
  }
  ORDER.sort(function (a, b) {
    var fa = floorOf(a);
    var fb = floorOf(b);
    if (fa !== fb) return fa - fb;
    return boxOf(firstLayer(a))[0] - boxOf(firstLayer(b))[0];
  });

  function neighbour(id, step) {
    var i = ORDER.indexOf(id);
    if (i < 0) return null;
    return ORDER[(i + step + ORDER.length) % ORDER.length];
  }

  // Animate the treehouse from where it was to where a layout change puts it (the panel sliding in
  // pushes it aside on wide screens). Nothing moves on one-column pages.
  function flip(change) {
    if (!sceneCol || reduce.matches) { change(); return; }
    var a = sceneCol.getBoundingClientRect();
    change();
    var b = sceneCol.getBoundingClientRect();
    if (!a.width || !b.width) return;
    var dx = a.left - b.left;
    var dy = a.top - b.top;
    var sc = a.width / b.width;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.abs(sc - 1) < 0.01) return;
    sceneCol.style.transition = 'none';
    sceneCol.style.transformOrigin = '0 0';
    sceneCol.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
    void sceneCol.offsetWidth;
    sceneCol.style.transition = 'transform 0.6s cubic-bezier(0.3, 0.7, 0.2, 1)';
    sceneCol.style.transform = '';
    setTimeout(function () { sceneCol.style.transition = ''; sceneCol.style.transformOrigin = ''; }, 650);
  }

  function stacked() {
    if (!side) return true;
    var s = side.getBoundingClientRect();
    var c = sceneCol.getBoundingClientRect();
    return s.top >= c.bottom - 2;
  }

  function renderPanel(id) {
    var it = ITEMS[id];
    var P = PANELS[id];
    panelKicker.textContent = it.kicker;
    if (P.sample) panelKicker.appendChild(el('span', 'pn-sample', '示例内容'));
    panelTitle.textContent = it.name;
    panelDesc.textContent = it.desc;
    leave();
    panelBody.textContent = '';
    var key = P.skin || P.kind;
    panelBody.className = 'th-panel-body is-' + P.template + ' kind-' + P.kind + (P.skin ? ' skin-' + P.skin : '');
    var bespoke = !!BESPOKE[key];
    panel.classList.toggle('is-bespoke', bespoke);
    if (home) home.classList.toggle('is-wide-panel', bespoke && window.innerWidth >= 1200);
    (RENDER[key] || RENDER[P.kind] || function () {})(P, panelBody);
    if (P.more && P.more.href) {
      panelMore.hidden = false;
      panelMore.href = P.more.href;
      panelMore.textContent = P.more.label + ' →';
    } else {
      panelMore.hidden = true;
    }
    each(panelSteps, function (b) {
      var step = Number(b.getAttribute('data-step'));
      var n = neighbour(id, step);
      var name = n ? ITEMS[n].name : '';
      b.textContent = step < 0 ? '‹ ' + name : name + ' ›';
      b.setAttribute('aria-label', (step < 0 ? '上一个：' : '下一个：') + name);
      b.hidden = !n || n === id;
    });
  }

  function layoutPanel() {
    if (!scene.clientWidth) return false; // the page is showing something else right now
    var sheetMode = stacked();
    panel.classList.toggle('is-sheet', sheetMode);
    side.classList.toggle('panel-sheet', sheetMode);
    var viewH = scene.clientHeight;
    if (sheetMode) {
      var top = scene.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: reduce.matches ? 'auto' : 'smooth' });
      viewH = window.innerHeight - panel.offsetHeight - 16;
    }
    return focusOn(panelLayer, viewH);
  }

  function setHash(id, push) {
    try {
      var url = id ? '#' + id : location.pathname + location.search;
      if (push) history.pushState({ th: id }, '', url);
      else history.replaceState({ th: id || null }, '', url);
    } catch (e) { /* history may be unavailable in some embeds */ }
  }

  function openPanel(id, o) {
    o = o || {};
    if (!panel || !PANELS[id] || !ITEMS[id]) return;
    closeCard(false);
    var wasOpen = !!panelId;
    if (panelLayer) panelLayer.classList.remove('is-on');
    if (panelTrigger) panelTrigger.setAttribute('aria-expanded', 'false');
    panelId = id;
    panelLayer = o.hit ? o.hit.closest('.th-layer') : firstLayer(id);
    panelTrigger = o.hit || (panelLayer && panelLayer.querySelector('.th-hit'));
    if (panelLayer) panelLayer.classList.add('is-on');
    if (panelTrigger) panelTrigger.setAttribute('aria-expanded', 'true');
    flip(function () {
      renderPanel(id);
      side.classList.add('has-panel');
      if (home) home.classList.add('is-panel');
      panel.hidden = false;
    });
    if (!wasOpen) {
      panel.classList.remove('is-in');
      void panel.offsetWidth;
      panel.classList.add('is-in');
    }
    if (!layoutPanel()) requestAnimationFrame(layoutPanel);
    if (o.focus === 'step') {
      var keep = panel.querySelector('.th-panel-step[data-step="' + o.step + '"]');
      if (keep && !keep.hidden) keep.focus({ preventScroll: true });
    } else if (o.focus !== false) {
      panelTitle.focus({ preventScroll: true });
    }
    if (!o.fromHash) {
      if (!wasOpen) { setHash(id, true); pushed = true; }
      else setHash(id, false);
    }
  }

  function closePanel(restoreFocus) {
    if (!panelId) return;
    var back = panelTrigger;
    if (panelLayer) panelLayer.classList.remove('is-on');
    if (panelTrigger) panelTrigger.setAttribute('aria-expanded', 'false');
    panelId = null;
    panelLayer = null;
    panelTrigger = null;
    leave();
    flip(function () {
      panel.hidden = true;
      panel.classList.remove('is-sheet', 'is-in', 'is-bespoke');
      side.classList.remove('has-panel', 'panel-sheet');
      if (home) home.classList.remove('is-wide-panel', 'is-panel');
    });
    resetCamera();
    if (restoreFocus && back && document.contains(back)) back.focus({ preventScroll: true });
  }

  // Closing from the page itself: undo our history entry if we made one, otherwise just clear the address.
  function closeFromUI(restoreFocus) {
    if (!panelId) return;
    var useBack = pushed;
    pushed = false;
    closePanel(restoreFocus);
    if (useBack) {
      try { history.back(); return; } catch (e) { /* fall through */ }
    }
    setHash(null, false);
  }

  function syncFromHash() {
    // Wait a tick so anything that shows or hides the page (the preview router) runs first.
    setTimeout(function () {
      pushed = false;
      var h = decodeURIComponent(location.hash.slice(1));
      if (!h) { closePanel(false); return; }
      if (PANELS[h] && panelId !== h) openPanel(h, { fromHash: true, focus: false });
    }, 0);
  }

  window.addEventListener('popstate', syncFromHash);
  window.addEventListener('hashchange', syncFromHash);

  // Objects with a panel control the panel, not the small card.
  each(stage.querySelectorAll('.th-hit'), function (b) {
    if (PANELS[b.getAttribute('data-item')] && panel) b.setAttribute('aria-controls', 'th-panel');
  });

  /* ---------- Events ---------- */
  var DIRECT = { lamp: 1, lights: 1, basket: 1 };
  var REPEATABLE = { lamp: 1, lights: 1 };

  stage.addEventListener('click', function (e) {
    var hit = e.target.closest('.th-hit');
    if (!hit) {
      if (panelId) closeFromUI(false);
      return;
    }
    var id = hit.getAttribute('data-item');
    var byKeyboard = e.detail === 0;
    if (DIRECT[id] || !PANELS[id]) {
      if (id === 'basket' && panelId) closeFromUI(false);
      var sameLayer = currentLayer && currentLayer === hit.closest('.th-layer');
      if (sameLayer && !REPEATABLE[id]) { closeCard(false); return; }
      openCard(id, hit, byKeyboard);
      act(id);
      if (id === 'lamp') fillExtra(ITEMS.lamp);
      return;
    }
    if (panelId === id && panelLayer === hit.closest('.th-layer')) { act(id); return; }
    openPanel(id, { hit: hit, focus: byKeyboard || !narrow.matches ? undefined : false });
    act(id);
  });

  card.querySelector('.th-card-close').addEventListener('click', function () { closeCard(true); });

  if (panel) {
    panel.querySelector('.th-panel-close').addEventListener('click', function () { closeFromUI(true); });
    each(panelSteps, function (b) {
      b.addEventListener('click', function () {
        var step = Number(b.getAttribute('data-step'));
        var n = neighbour(panelId, step);
        if (n) openPanel(n, { focus: 'step', step: step });
      });
    });
  }

  zoomOutBtn.addEventListener('click', function () {
    if (panelId) closeFromUI(true);
    else resetCamera();
  });

  document.addEventListener('click', function (e) {
    if (!current) return;
    if (card.contains(e.target) || e.target.closest('.th-hit')) return;
    closeCard(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (overlay) overlay.close();
      else if (current) closeCard(true);
      else if (panelId) closeFromUI(true);
      else if (scene.classList.contains('is-zoomed')) resetCamera();
      return;
    }
    if (!panelId || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    if (overlay && overlay.key(e)) { e.preventDefault(); return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var step = e.key === 'ArrowLeft' ? -1 : 1;
    var n = neighbour(panelId, step);
    if (n) {
      e.preventDefault();
      openPanel(n, { focus: panel.contains(document.activeElement) ? 'step' : false, step: step });
    }
  });

  document.addEventListener('th:mode', function () {
    if (current === 'lamp') fillExtra(ITEMS.lamp);
    if (panelId === 'photos') renderPanel('photos');
  });

  /* ---------- Floor signs beside the tree: the camera rides up or down to that floor ---------- */
  each(document.querySelectorAll('[data-th-floor]'), function (b) {
    var f = DATA.floors.filter(function (x) { return x.id === b.getAttribute('data-th-floor'); })[0];
    if (!f) return;
    b.addEventListener('click', function () {
      closeCard(false);
      if (panelId) closeFromUI(false);
      var on = b.classList.contains('is-on');
      each(document.querySelectorAll('[data-th-floor]'), function (x) { x.classList.remove('is-on'); x.setAttribute('aria-pressed', 'false'); });
      if (on) { resetCamera(); return; }
      b.classList.add('is-on');
      b.setAttribute('aria-pressed', 'true');
      zoomTo(f.box);
      if (narrow.matches && scene.scrollIntoView) scene.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
    });
  });
  function clearFloors() {
    each(document.querySelectorAll('[data-th-floor].is-on'), function (x) { x.classList.remove('is-on'); x.setAttribute('aria-pressed', 'false'); });
  }

  /* ---------- Directory links open their object ---------- */
  each(document.querySelectorAll('[data-th-target]'), function (a) {
    var id = a.getAttribute('data-th-target');
    function on() { each(layersOf(id), function (l) { l.classList.add('is-hot'); }); }
    function off() { each(layersOf(id), function (l) { l.classList.remove('is-hot'); }); }
    a.addEventListener('mouseenter', on);
    a.addEventListener('mouseleave', off);
    a.addEventListener('focus', on);
    a.addEventListener('blur', off);
    a.addEventListener('click', function (e) {
      if (!PANELS[id] || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      off();
      openPanel(id);
    });
  });

  // Phones fire resize when the address bar slides in and out; only a width change needs a new layout.
  var resizeRaf = 0;
  var lastWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () {
      if (current) placeCard();
      if (window.innerWidth === lastWidth || !scene.clientWidth) return;
      lastWidth = window.innerWidth;
      if (panelId) layoutPanel();
      else if (scene.classList.contains('is-zoomed')) resetCamera();
    });
  });

  /* ---------- The resident: a little me who wanders between spots ----------
     ME_POSES: one image per pose in public/treehouse/me/ (cropped tight, transparent).
       h  = how tall the image stands in the scene, in % of the scene height
       ar = the image's width / height
       A pose missing here falls back to `stand`. `walk` alternates its frames while she walks.
     ME_SPOTS: where she does things. x, y = the bottom middle of the pose image, in % of the scene
       (for sitting poses that is just under her feet). `night` makes a spot likelier after dark. */
  var ME_POSES = {
    stand: { src: 'stand.webp', h: 11.5, ar: 0.5188 },
    piano: { src: 'piano.webp', h: 11.3, ar: 0.5375 },
    desk: { src: 'desk.webp', h: 11.1, ar: 0.5792 },
    peek: { src: 'peek.webp', h: 11.24, ar: 0.5333 },
    books: { src: 'books.webp', h: 11.98, ar: 0.5563 },
    hammock: { src: 'hammock.webp', h: 6.64, ar: 1.8065 },
    walk: { src: ['walk1.webp', 'walk2.webp'], h: 11.3, ar: 0.5333 }
  };
  var ME_SPOTS = [
    { id: 'piano', floor: 'living', x: 36.05, y: 44.7, pose: 'piano', say: ['在练琴，这一小节总弹错。', '叮叮咚咚……', '先把左手练熟。'] },
    { id: 'record', floor: 'living', x: 23, y: 46.2, pose: 'stand', say: ['换一张唱片听听。', '这首歌循环一下午了。'], night: 1 },
    { id: 'books', floor: 'living', x: 48, y: 46.2, pose: 'books', say: ['找一本书。', '就是这本！', '这本还没看完。'], night: 1 },
    { id: 'screen', floor: 'living', x: 61, y: 46.2, pose: 'stand', say: ['今晚放哪部电影呢？'], night: 1 },
    { id: 'hammock', floor: 'living', x: 82.3, y: 44.2, pose: 'hammock', say: ['躺着看会儿书。', '这一章好长……'], night: 3 },
    { id: 'desk', floor: 'workshop', x: 35.7, y: 73.6, pose: 'desk', say: ['在写代码。', '这个 bug 再看一眼就好。', '训练跑完了吗？'] },
    { id: 'board', floor: 'workshop', x: 47.5, y: 74.6, pose: 'stand', say: ['在黑板上推公式。', '梯度好像推反了。'] },
    { id: 'pegboard', floor: 'workshop', x: 58, y: 74.6, pose: 'peek', say: ['找一把螺丝刀……', '这个工具又放错位置了。'] },
    { id: 'blueprint', floor: 'workshop', x: 64.5, y: 74.6, pose: 'stand', say: ['翻翻图纸，看看最近在忙什么。'] },
    { id: 'telescope', floor: 'canopy', x: 50.3, y: 14, pose: 'peek', say: ['看星星。', '今天能看到猎户座吗？'], night: 4 },
    { id: 'mailbox', floor: 'ground', x: 64, y: 96.6, pose: 'stand', say: ['看看有没有新来信。'] },
    { id: 'sign', floor: 'ground', x: 14, y: 96.6, pose: 'stand', say: ['欢迎来到蔡煦嘉的树屋！'] }
  ];

  function startResident() {
    var base = stage.querySelector('.th-base-day');
    if (!base || !ME_SPOTS.length) return;
    var dir = (base.getAttribute('src') || '').replace(/day(-clear)?\.webp.*$/, '') + 'me/';
    var me = el('button', 'th-me');
    me.type = 'button';
    var img = el('img', 'th-me-img');
    img.alt = '';
    img.draggable = false;
    var bubble = el('span', 'th-me-say');
    bubble.setAttribute('aria-hidden', 'true');
    me.appendChild(bubble);
    me.appendChild(img);
    stage.appendChild(me);

    // fetch every pose up front so switching never flashes an empty frame
    Object.keys(ME_POSES).forEach(function (k) {
      [].concat(ME_POSES[k].src).forEach(function (f) { var i = new Image(); i.src = dir + f; });
    });

    var at = null;
    var host = null;
    var pose = ME_POSES.stand;
    var timer = 0;
    var sayTimer = 0;
    var stepTimer = 0;
    var running = true;

    function poseOf(s) { return ME_POSES[s.pose] || ME_POSES.stand; }
    function wear(p, frame) {
      pose = p;
      var files = [].concat(p.src);
      img.src = dir + files[(frame || 0) % files.length];
      me.style.aspectRatio = String(p.ar);
    }
    function sizeIn(boxH) { me.style.setProperty('--h', (pose.h / boxH * 100).toFixed(3) + '%'); }
    function place(s) {
      me.style.left = s.x + '%';
      me.style.top = s.y + '%';
      sizeIn(100);
    }

    // While she works at an object she lives inside its layer, so when that object is hovered or
    // chosen she lifts and zooms together with it; she steps back out onto the stage to walk.
    function hostOf(s) {
      var l = firstLayer(s.layer || s.id);
      return l && !l.classList.contains('no-lift') ? l : null;
    }
    function attach(s) {
      var l = hostOf(s);
      if (!l) { place(s); return; }
      var b = [parseFloat(l.style.left), parseFloat(l.style.top), parseFloat(l.style.width), parseFloat(l.style.height)];
      l.appendChild(me);
      l.classList.add('has-me');
      host = l;
      me.style.left = ((s.x - b[0]) / b[2] * 100).toFixed(3) + '%';
      me.style.top = ((s.y - b[1]) / b[3] * 100).toFixed(3) + '%';
      sizeIn(b[3]);
    }
    function detach() {
      if (host) { host.classList.remove('has-me'); host = null; }
      if (me.parentNode !== stage) stage.appendChild(me);
      if (at) place(at);
      void me.offsetWidth;
    }

    function pick() {
      var night = document.documentElement.getAttribute('data-mode') === 'night';
      var pool = [];
      ME_SPOTS.forEach(function (s) {
        if (at && s.id === at.id) return;
        var w = night ? 1 + (s.night || 0) : 1;
        for (var i = 0; i < w; i++) pool.push(s);
      });
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function speak(text, ms) {
      clearTimeout(sayTimer);
      bubble.textContent = text;
      me.classList.add('is-talking');
      sayTimer = setTimeout(function () { me.classList.remove('is-talking'); }, ms || 3800);
    }
    function settle(s) {
      at = s;
      clearInterval(stepTimer);
      var talking = me.classList.contains('is-talking');
      me.className = 'th-me pose-' + s.pose + (talking ? ' is-talking' : '');
      wear(poseOf(s));
      me.setAttribute('aria-label', '树屋的主人：' + s.say[0] + (PANELS[s.id] ? '（打开「' + ITEMS[s.id].name + '」）' : ''));
      attach(s);
      if (Math.random() < 0.6) speak(s.say[Math.floor(Math.random() * s.say.length)]);
      schedule();
    }
    function goTo(s) {
      clearTimeout(timer);
      if (!at || reduce.matches || s.floor !== at.floor) {
        // another floor: fade out, reappear there
        me.classList.add('is-gone');
        timer = setTimeout(function () {
          detach();
          wear(poseOf(s));
          place(s);
          me.classList.remove('is-gone');
          settle(s);
        }, at ? 450 : 0);
        return;
      }
      detach();
      var walk = ME_POSES.walk || ME_POSES.stand;
      var dist = Math.abs(s.x - at.x);
      var secs = Math.max(0.8, dist / 6);
      var frame = 0;
      me.className = 'th-me pose-walk' + (s.x < at.x ? ' is-left' : '');
      wear(walk);
      // start from the floor line where she stood, not from a sitting pose's anchor
      me.style.top = (s.floor === at.floor ? Math.max(at.y, s.y) : s.y) + '%';
      sizeIn(100);
      void me.offsetWidth;
      me.classList.add('is-walking');
      me.style.setProperty('--walk', secs.toFixed(2) + 's');
      clearInterval(stepTimer);
      stepTimer = setInterval(function () { wear(walk, ++frame); }, 240);
      me.style.left = s.x + '%';
      me.style.top = Math.max(at.y, s.y) + '%';
      timer = setTimeout(function () {
        clearInterval(stepTimer);
        me.classList.remove('is-walking');
        place(s);
        settle(s);
      }, secs * 1000);
    }
    function schedule() {
      clearTimeout(timer);
      if (!running) return;
      timer = setTimeout(function () {
        // stay put while someone is looking at what she is doing
        if (host && (host.classList.contains('is-on') || host.classList.contains('is-hot') || host.matches(':hover'))) { schedule(); return; }
        goTo(pick());
      }, 16000 + Math.random() * 16000);
    }

    me.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!at) return;
      me.classList.remove('is-hop');
      void me.offsetWidth;
      me.classList.add('is-hop');
      if (PANELS[at.id] && me.classList.contains('is-talking')) {
        openPanel(at.id, { focus: e.detail === 0 ? undefined : false });
        return;
      }
      speak(at.say[Math.floor(Math.random() * at.say.length)] + (PANELS[at.id] ? ' 再点我一下看看？' : ''));
    });
    me.addEventListener('mouseenter', function () { if (at && !me.classList.contains('is-talking')) speak(at.say[0], 2400); });

    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) schedule();
      else { clearTimeout(timer); }
    });

    var first = pick();
    wear(poseOf(first));
    place(first);
    settle(first);
  }

  startResident();

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

  // Open straight onto an object when the address names one, e.g. /#piano.
  syncFromHash();
})();
