/* 共用建牌工具：mkDeck(id,名稱,emoji,導語,前綴,rows)
   rows 每列：[名稱,英文,emoji,色相,意象,意涵,光明面,陰影面,自我提問,(選填)背景CSS,(選填)文字色] */
window.DECKS = window.DECKS || {};
window.mkDeck = function (id, name, emoji, intro, prefix, rows) {
  window.DECKS[id] = { id: id, name: name, emoji: emoji, intro: intro,
    cards: rows.map(function (a, i) {
      return { id: prefix + (i + 1), name: a[0], en: a[1], emoji: a[2], hue: a[3], title: a[4],
        meaning: a[5], light: a[6], shadow: a[7], ask: a[8], bg: a[9] || "", fg: a[10] || "" };
    }) };
};
