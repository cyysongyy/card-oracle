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
  function face(c) {
    var bg = c.bg || ("linear-gradient(160deg,hsl(" + c.hue + ",55%,58%),hsl(" + ((c.hue + 30) % 360) + ",50%,38%))");
    var fg = c.fg || "#fff";
    var sh = c.fg ? "none" : "0 1px 3px #0005";
    return '<div class="cf" style="background:' + bg + ';color:' + fg + ';text-shadow:' + sh + '">' +
      '<div class="em">' + c.emoji + '</div><div class="nm">' + esc(c.name) + '</div><div class="en">' + esc(c.en) + '</div></div>';
  }
  function backHtml(c) {
    return '<div class="bk">' +
      '<div class="bk-h">' + c.emoji + ' ' + esc(c.name) + ' <small>' + esc(c.en) + '</small></div>' +
      '<div class="bk-t">' + esc(c.title) + '</div>' +
      '<p>' + esc(c.meaning) + '</p>' +
      '<p><span class="tag t-l">光明面</span>' + esc(c.light) + '</p>' +
      '<p><span class="tag t-s">陰影面</span>' + esc(c.shadow) + '</p>' +
      '<p class="ask"><span class="tag t-a">自我提問</span>' + esc(c.ask) + '</p></div>';
  }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 1800);
  }

  function renderTabs() {
    var box = $("decks"); box.innerHTML = "";
    ids.forEach(function (id) {
      var d = DECKS[id];
      var b = document.createElement("button");
      b.textContent = d.emoji + " " + d.name;
      if (state.deck === id) b.className = "on";
      b.onclick = function () { state.deck = id; reset(); renderTabs(); };
      box.appendChild(b);
    });
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
  $("btnQR").onclick = function () {
    var box = $("qrbox"); box.innerHTML = ""; $("qrurl").textContent = pageUrl();
    if (window.QRCode) new QRCode(box, { text: pageUrl(), width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
    else box.textContent = "QR 元件載入失敗，請確認網路連線";
    $("qrm").hidden = false;
  };
  $("closeQR").onclick = function () { $("qrm").hidden = true; };
  $("btnQRdl").onclick = function () {
    var cv = $("qrbox").querySelector("canvas"); if (!cv) return;
    var a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "card-oracle-qr.png"; a.click();
  };
  $("btnQRprint").onclick = function () { document.body.classList.add("printqr"); window.print(); document.body.classList.remove("printqr"); };
  [$("modal"), $("hist"), $("qrm")].forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target === m) { clearTimeout(state.timer); m.hidden = true; } });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeModal(); $("hist").hidden = true; $("qrm").hidden = true; }
  });

  $("count").textContent = "共 " + (ids.length - 1) + " 大牌組、" + (all.length) + " 張牌。";
  state.deck = ids[0];
  renderTabs(); setMode("draw");
})();
