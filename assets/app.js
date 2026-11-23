/* 心象牌卡 Card Oracle — 純前端、無需後端。牌組資料放在 data/*.js */
(function () {
  // 牌組登記表：有載入 data 檔就可用，否則顯示「即將推出」
  var DECK_META = [
    { id: "plants",    name: "植物", emoji: "🌿" },
    { id: "animals",   name: "動物", emoji: "🦊" },
    { id: "food",      name: "食物", emoji: "🍜" },
    { id: "landscape", name: "山水", emoji: "🏔️" }
  ];
  var DECKS = window.DECKS || {};
  // 綜合牌組：把所有已載入的牌組合併，跨類別抽牌
  var all = [];
  DECK_META.forEach(function (m) { if (DECKS[m.id]) all = all.concat(DECKS[m.id].cards); });
  DECKS.mix = { id: "mix", name: "綜合牌組", emoji: "🎲", cards: all,
    intro: "動物、植物、食物、山水全部洗在一起。憑直覺選一張，看看哪個意象選中了你。" };
  DECK_META.push({ id: "mix", name: "綜合", emoji: "🎲" });
  var $ = function (id) { return document.getElementById(id); };
  var state = { deck: null, mode: "draw", order: [], current: null };
  var KEY = "card-oracle-history-v1";

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function face(c) {
    return '<div class="cf" style="background:linear-gradient(160deg,hsl(' + c.hue + ',55%,58%),hsl(' + ((c.hue + 30) % 360) + ',50%,38%))">' +
      '<div class="em">' + c.emoji + '</div><div class="nm">' + c.name + '</div><div class="en">' + c.en + '</div></div>';
  }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 1800);
  }

  function renderTabs() {
    var box = $("decks"); box.innerHTML = "";
    DECK_META.forEach(function (m) {
      var ok = !!DECKS[m.id];
      var b = document.createElement("button");
      b.innerHTML = m.emoji + " " + m.name + (ok ? "" : "<small>即將推出</small>");
      b.disabled = !ok;
      if (state.deck === m.id) b.className = "on";
      b.onclick = function () { state.deck = m.id; reset(); renderTabs(); };
      box.appendChild(b);
    });
  }

  function reset() {
    var d = DECKS[state.deck];
    state.order = shuffle(d.cards);
    $("intro").textContent = state.mode === "draw" ? d.intro : "共 " + d.cards.length + " 張，點選任一張查看背後意涵。";
    renderGrid();
  }

  function renderGrid() {
    var d = DECKS[state.deck], g = $("grid"); g.innerHTML = "";
    var list = state.mode === "draw" ? state.order : d.cards;
    list.forEach(function (c) {
      var el = document.createElement("button");
      el.setAttribute("aria-label", state.mode === "draw" ? "未翻開的牌" : c.name);
      if (state.mode === "draw") { el.className = "c back"; }
      else { el.className = "c"; el.innerHTML = face(c); }
      el.onclick = function () { openCard(c, state.mode === "draw", el); };
      g.appendChild(el);
    });
  }

  function openCard(c, withFlip, el) {
    state.current = c;
    if (el && withFlip) el.classList.add("picked");
    $("front").innerHTML = face(c);
    var fl = $("flip"); fl.className = "flip";
    var dt = $("detail"); dt.className = "detail";
    dt.innerHTML = '<h2>' + c.emoji + ' ' + c.name + ' <small style="color:#999;font-weight:400">' + c.en + '</small></h2>' +
      '<div class="ttl">' + c.title + '</div>' +
      '<p>' + c.meaning + '</p>' +
      '<p><span class="tag t-l">光明面</span>' + c.light + '</p>' +
      '<p><span class="tag t-s">陰影面</span>' + c.shadow + '</p>' +
      '<p><span class="tag t-a">自我提問</span>' + c.ask + '</p>';
    $("modal").hidden = false;
    setTimeout(function () { fl.classList.add("open"); dt.classList.add("show"); }, withFlip ? 120 : 0);
    if (!withFlip) { fl.style.transition = "none"; fl.classList.add("open"); dt.style.transition = "none"; dt.classList.add("show");
      setTimeout(function () { fl.style.transition = ""; dt.style.transition = ""; }, 50); }
    else { fl.style.transition = ""; dt.style.transition = ""; }
    if (withFlip) saveHistory(c);
  }

  function saveHistory(c) {
    try {
      var h = JSON.parse(localStorage.getItem(KEY) || "[]");
      h.unshift({ d: state.deck, id: c.id, name: c.name, emoji: c.emoji, t: Date.now() });
      localStorage.setItem(KEY, JSON.stringify(h.slice(0, 50)));
    } catch (e) {}
  }
  function showHistory() {
    var h = []; try { h = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) {}
    var box = $("histList");
    box.innerHTML = h.length ? h.map(function (x) {
      var dt = new Date(x.t);
      return '<div class="h"><b>' + x.emoji + ' ' + x.name + '</b><span>' + dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString().slice(0, 5) + '</span></div>';
    }).join("") : '<p style="color:#999">還沒有紀錄，去抽一張吧！</p>';
    $("hist").hidden = false;
  }

  function closeModal() { $("modal").hidden = true; }

  function copyResult() {
    var c = state.current; if (!c) return;
    var txt = "【心象牌卡】我抽到：" + c.emoji + c.name + "（" + c.title + "）\n" + c.meaning +
      "\n光明面：" + c.light + "\n陰影面：" + c.shadow + "\n自我提問：" + c.ask + "\n" + location.href;
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

  $("modeDraw").onclick = function () { setMode("draw"); };
  $("modeBrowse").onclick = function () { setMode("browse"); };
  $("btnShuffle").onclick = function () { reset(); toast("已重新洗牌 🔀"); };
  $("btnRandom").onclick = function () {
    var c = state.order[Math.floor(Math.random() * state.order.length)];
    openCard(c, true, null);
  };
  $("btnHistory").onclick = showHistory;
  $("close").onclick = closeModal;
  $("closeHist").onclick = function () { $("hist").hidden = true; };
  $("btnClear").onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} showHistory(); };
  $("btnCopy").onclick = copyResult;
  function pageUrl() { return location.href.split("#")[0].split("?")[0]; }
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
  $("btnAgain").onclick = function () { closeModal(); if (state.mode === "draw") reset(); };
  [$("modal"), $("hist"), $("qrm")].forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target === m) m.hidden = true; });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { $("modal").hidden = true; $("hist").hidden = true; $("qrm").hidden = true; } });

  state.deck = DECK_META.filter(function (m) { return DECKS[m.id]; })[0].id;
  renderTabs(); setMode("draw");
})();
