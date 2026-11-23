/* 心象牌卡 Card Oracle — 純前端。牌組資料在 data/*.js（自動偵測所有 window.DECKS）。
   流程：牌面（圖卡）朝上 → 點選 → 翻到背面 → 顯示心理意涵 */
(function () {
  var DECKS = window.DECKS || {};
  var ids = Object.keys(DECKS);
  // 綜合牌組：合併所有牌組
  var all = [];
  ids.forEach(function (k) { all = all.concat(DECKS[k].cards); });
  DECKS.mix = { id: "mix", name: "綜合", emoji: "🎲", cards: all,
    intro: "所有牌組洗在一起。先看圖卡，憑直覺選一張，再翻到背面。" };
  ids.push("mix");

  var $ = function (id) { return document.getElementById(id); };
  var state = { deck: null, mode: "draw", order: [], current: null, timer: null };
  var KEY = "card-oracle-history-v2";

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  // 圖像：內嵌 Twemoji 向量插圖（CC-BY 4.0）；缺圖時退回系統 emoji
  var imgCache = {};
  function twKey(e) {
    var cps = Array.from(e).map(function (ch) { return ch.codePointAt(0).toString(16); });
    if (e.indexOf("\u200d") < 0) cps = cps.filter(function (x) { return x !== "fe0f"; });
    return cps.join("-");
  }
  function art(c, cls) {
    var k = twKey(c.emoji), svg = window.TWSVG && window.TWSVG[k];
    if (!svg) return '<span class="fb">' + c.emoji + '</span>';
    if (!imgCache[k]) imgCache[k] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    return '<img class="tw ' + (cls || "") + '" src="' + imgCache[k] + '" alt="' + c.emoji + '" draggable="false">';
  }
  // 把文字開頭的 emoji 換成內嵌向量插圖，確保各裝置顯示一致（不再出現缺字方框）
  var LEAD = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*)\s*/u;
  function emojify(el) {
    if (!el) return;
    var node = el.firstChild;
    while (node && node.nodeType !== 3) node = node.nextSibling;
    if (!node) return;
    var m = LEAD.exec(node.nodeValue); if (!m) return;
    var k = twKey(m[1]), svg = window.TWSVG && window.TWSVG[k]; if (!svg) return;
    if (!imgCache[k]) imgCache[k] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    var img = document.createElement("img"); img.className = "ic"; img.src = imgCache[k]; img.alt = m[1]; img.draggable = false;
    node.nodeValue = node.nodeValue.slice(m[0].length);
    el.insertBefore(img, node);
  }
  function emojifyAll(sel) { Array.prototype.forEach.call(document.querySelectorAll(sel), emojify); }
  function face(c) {
    var bg = c.bg || ("radial-gradient(circle at 50% 36%,hsl(" + c.hue + ",78%,74%) 0,hsl(" + c.hue + ",68%,54%) 52%,hsl(" + ((c.hue + 25) % 360) + ",62%,30%) 100%)");
    var light = c.fg && c.fg !== "#fff";
    var num = String(c.id).replace(/\D/g, "");
    num = ("00" + num).slice(-2);
    return '<div class="cf' + (light ? " lt" : "") + '" style="background:' + bg + ';' + (c.fg ? 'color:' + c.fg : '') + '">' +
      '<i class="fr"></i><span class="no">No.' + num + '</span><span class="st">✦</span>' +
      '<div class="art"><div class="halo"></div>' + art(c) + '</div>' +
      '<div class="rib"><div class="nm">' + esc(c.name) + '</div><div class="en">' + esc(c.en) + '</div></div></div>';
  }
  function backHtml(c) {
    return '<div class="bk"><div class="wm">' + art(c) + '</div>' +
      '<div class="bk-h">' + art(c, "sm") + ' ' + esc(c.name) + ' <small>' + esc(c.en) + '</small></div>' +
      '<div class="bk-t">' + esc(c.title) + '</div><div class="orn">❖ ✦ ❖</div>' +
      '<p>' + esc(c.meaning) + '</p>' +
      '<p><span class="tag t-l">光明面</span>' + esc(c.light) + '</p>' +
      '<p><span class="tag t-s">陰影面</span>' + esc(c.shadow) + '</p>' +
      '<p class="ask"><span class="tag t-a">自我提問</span>' + esc(c.ask) + '</p></div>';
  }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 1800);
  }

  var GROUPS = [
    ["🌿 自然萬象", ["plants", "animals", "food", "fruit", "drinks", "landscape"]],
    ["🔮 投射意象", ["colors", "shapes", "house", "dreams", "weather", "vehicles", "objects", "archetypes", "scenes", "music"]],
    ["🧠 心理探索", ["emotions", "values", "strengths", "careers", "body", "gestures", "childhood", "fairytales", "sports", "selfcare", "relations", "campus", "growth", "leadership"]],
    ["🎲 綜合", ["mix"]]
  ];
  var openGroups = {};
  function renderTabs() {
    var box = $("decks"); box.innerHTML = "";
    GROUPS.forEach(function (g, gi) {
      var row = document.createElement("div"); row.className = "grp" + (openGroups[gi] ? " open" : "");
      var lab = document.createElement("div"); lab.className = "glab"; lab.textContent = g[0];
      lab.setAttribute("role", "button"); lab.tabIndex = 0; lab.setAttribute("aria-expanded", openGroups[gi] ? "true" : "false");
      if (g[1].indexOf(state.deck) >= 0) { lab.className += " has"; lab.setAttribute("data-cur", DECKS[state.deck].name.replace("牌組", "")); }
      var tog = function () { openGroups[gi] = !openGroups[gi]; renderTabs(); };
      lab.onclick = tog; lab.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tog(); } };
      row.appendChild(lab);
      g[1].forEach(function (id) {
        var d = DECKS[id]; if (!d) return;
        var b = document.createElement("button");
        b.textContent = d.emoji + " " + d.name.replace("牌組", "");
        if (state.deck === id) b.className = "on";
        b.onclick = function () { state.deck = id; reset(); renderTabs(); };
        row.appendChild(b);
      });
      box.appendChild(row);
    });
    emojifyAll('#decks .glab, #decks button');
  }

  function reset() {
    var d = DECKS[state.deck];
    state.order = shuffle(d.cards);
    $("intro").textContent = (state.mode === "draw" ? d.intro : "共 " + d.cards.length + " 張，點選任一張，翻到背面看心理意涵。") + "　（共 " + d.cards.length + " 張）";
    renderGrid();
  }

  function renderGrid() {
    var d = DECKS[state.deck], g = $("grid"); g.innerHTML = "";
    var list = state.mode === "draw" ? state.order : d.cards;
    list.forEach(function (c) {
      var el = document.createElement("button");
      el.className = "c"; el.setAttribute("aria-label", c.name);
      el.innerHTML = face(c);
      el.onclick = function () { el.classList.add("picked"); openCard(c); };
      g.appendChild(el);
    });
  }

  function openCard(c) {
    state.current = c;
    $("front").innerHTML = face(c);
    $("backface").innerHTML = backHtml(c);
    var fl = $("flip"); fl.classList.remove("open");
    $("modal").hidden = false;
    clearTimeout(state.timer);
    state.timer = setTimeout(function () { fl.classList.add("open"); }, 900);
    saveHistory(c);
  }

  function saveHistory(c) {
    try {
      var h = JSON.parse(localStorage.getItem(KEY) || "[]");
      h.unshift({ id: c.id, name: c.name, emoji: c.emoji, t: Date.now() });
      localStorage.setItem(KEY, JSON.stringify(h.slice(0, 60)));
    } catch (e) {}
  }
  function showHistory() {
    var h = []; try { h = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) {}
    $("histList").innerHTML = h.length ? h.map(function (x) {
      var dt = new Date(x.t);
      return '<div class="h"><b>' + x.emoji + ' ' + esc(x.name) + '</b><span>' + dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString().slice(0, 5) + '</span></div>';
    }).join("") : '<p style="color:#999">還沒有紀錄，去抽一張吧！</p>';
    $("hist").hidden = false;
  }
  function closeModal() { clearTimeout(state.timer); $("modal").hidden = true; }

  function copyResult() {
    var c = state.current; if (!c) return;
    var txt = "【心象牌卡】我抽到：" + c.emoji + c.name + "（" + c.title + "）\n" + c.meaning +
      "\n光明面：" + c.light + "\n陰影面：" + c.shadow + "\n自我提問：" + c.ask + "\n" + location.href.split("#")[0];
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast("已複製，可貼給朋友 📋"); });
    else toast("此瀏覽器不支援複製");
  }

  function setMode(m) {
    state.mode = m;
    $("modeDraw").className = m === "draw" ? "on" : "";
    $("modeBrowse").className = m === "browse" ? "on" : "";
    $("btnRandom").style.display = $("btnShuffle").style.display = m === "draw" ? "" : "none";
    reset();
  }
  function pageUrl() { return location.href.split("#")[0].split("?")[0]; }

  $("modeDraw").onclick = function () { setMode("draw"); };
  $("modeBrowse").onclick = function () { setMode("browse"); };
  $("btnShuffle").onclick = function () { reset(); toast("已重新洗牌 🔀"); };
  $("btnRandom").onclick = function () {
    var c = state.order[Math.floor(Math.random() * state.order.length)]; openCard(c);
  };
  $("flip").onclick = function () { clearTimeout(state.timer); $("flip").classList.toggle("open"); };
  $("btnHistory").onclick = showHistory;
  $("close").onclick = closeModal;
  $("closeHist").onclick = function () { $("hist").hidden = true; };
  $("btnClear").onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} showHistory(); };
  $("btnCopy").onclick = copyResult;
  $("btnAgain").onclick = function () { closeModal(); if (state.mode === "draw") reset(); };
  // QR：內嵌 SVG，固定指向正式網址
  var SITE = window.SITE_URL || pageUrl();
  function qrPng(cb) {
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement("canvas"); cv.width = cv.height = 800;
      var x = cv.getContext("2d"); x.imageSmoothingEnabled = false;
      x.fillStyle = "#fff"; x.fillRect(0, 0, 800, 800); x.drawImage(img, 0, 0, 800, 800);
      cb(cv.toDataURL("image/png"));
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(window.QR_SVG);
  }
  function downloadQR() {
    qrPng(function (url) { var a = document.createElement("a"); a.href = url; a.download = "card-oracle-qr.png"; a.click(); });
  }
  function printQR() {
    var w = window.open("", "_blank");
    if (!w) { toast("請允許彈出視窗再列印"); return; }
    w.document.write('<title>心象牌卡 QR</title><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>🎴 心象牌卡</h1><p>手機掃描 QR Code，憑直覺抽一張牌</p><div style="width:340px;margin:20px auto">' + window.QR_SVG + '</div><p>' + SITE + '</p><script>setTimeout(function(){print()},300)<\/script>');
    w.document.close();
  }
  $("qrhome").innerHTML = window.QR_SVG || "";
  $("qrbox").innerHTML = window.QR_SVG || "";
  $("siteurl").textContent = SITE;
  $("btnQR").onclick = function () { $("qrurl").textContent = SITE; $("qrm").hidden = false; };
  $("closeQR").onclick = function () { $("qrm").hidden = true; };
  $("btnQRdl").onclick = downloadQR; $("btnQRdl2").onclick = downloadQR;
  $("btnQRprint").onclick = printQR; $("btnQRprint2").onclick = printQR;
  [$("modal"), $("hist"), $("qrm")].forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target === m) { clearTimeout(state.timer); m.hidden = true; } });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeModal(); $("hist").hidden = true; $("qrm").hidden = true; }
  });

  // 立體卡面：游標傾斜與光澤（桌機）
  var gridEl = $("grid");
  gridEl.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    var c = e.target.closest && e.target.closest(".c"); if (!c) return;
    var r = c.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    c.style.setProperty("--ry", ((px - .5) * 16).toFixed(2) + "deg");
    c.style.setProperty("--rx", ((.5 - py) * 16).toFixed(2) + "deg");
    c.style.setProperty("--ax", ((.5 - px) * 8).toFixed(1) + "px");
    c.style.setProperty("--ay", ((.5 - py) * 8).toFixed(1) + "px");
    c.style.setProperty("--gx", (px * 100).toFixed(0) + "%");
    c.style.setProperty("--gy", (py * 100).toFixed(0) + "%");
  });
  gridEl.addEventListener("pointerout", function (e) {
    var c = e.target.closest && e.target.closest(".c"); if (!c) return;
    ["--rx", "--ry", "--ax", "--ay"].forEach(function (k) { c.style.removeProperty(k); });
  });
  emojifyAll("h1, .acts button, .seg button, .qrtxt b, .sheet-acts button, #hist h2, #qrm h2");

  $("count").textContent = "共 " + (ids.length - 1) + " 大牌組、" + (all.length) + " 張牌。";
  state.deck = ids[0];
  renderTabs(); setMode("draw");
})();
