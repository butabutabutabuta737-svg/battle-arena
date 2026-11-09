/* 解放コードの受け取り（各ゲーム共通、原本は nandemo-shop/client/shop-client.js。2026-11-03）
   使い方:
     NkShop.has('mj_iro')                → この端末でその商品が解放ずみか
     NkShop.redeem('NK-...', 'mj_iro')   → Promise<{ ok, name, used, max } | { ok:false, reason, message }>
     NkShop.list()                        → 解放ずみの商品id の配列
   保存先は localStorage の nk.shop（{ products: { id: { code, at } } }）と nk.device（端末の札）。
   引っ越しキットは localStorage を丸ごと運ぶので、住所が変わっても消えない。
   サーバーに届かないときは ok:false, reason:'offline' を返す（解放ずみの品は保存から読むので遊ぶのに通信は要らない）。 */
(function () {
  var API = 'https://shop.nandemo-kobo.com';
  var KEY = 'nk.shop', DEV = 'nk.device';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function device() {
    var id = null;
    try { id = localStorage.getItem(DEV); } catch (e) {}
    if (!id) {
      var a = new Uint8Array(12);
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (var i = 0; i < 12; i++) a[i] = Math.random() * 256 | 0;
      id = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      try { localStorage.setItem(DEV, id); } catch (e) {}
    }
    return id;
  }
  var MSG = {
    invalid: 'コードが違います。ハイフンも含めて、もう一度たしかめてください',
    other_product: 'このコードは別の商品のものです',
    max: 'このコードは、もう使える台数のうわ限に達しています',
    revoked: 'このコードは止められています（返金ずみなど）',
    too_many: 'まちがいが続いたので、しばらくしてからお試しください',
    no_device: 'この端末では保存ができないため、解放できません',
    offline: 'サーバーにつながりませんでした。通信のある場所でもう一度お試しください',
  };
  // 遊んだ回数の合図。ゲーム名とできごと（open / start など）だけを送り、個人は送らない。
  // 手元の検査（localhost）では送らない。失敗しても何も起きない
  function hit(game, ev) {
    try {
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
      var body = JSON.stringify({ g: game, ev: ev || 'start' });
      // text/plain なら CORS の事前確認(OPTIONS)が要らず、1 通で済む。サーバー側は中身を JSON として読む
      if (navigator.sendBeacon && navigator.sendBeacon(API + '/hit', new Blob([body], { type: 'text/plain' }))) return;
      fetch(API + '/hit', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: body, keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  window.NkShop = {
    hit: hit,
    has: function (product) { var d = load(); return !!(d.products && d.products[product]); },
    list: function () { var d = load(); return Object.keys(d.products || {}); },
    redeem: function (code, product) {
      var body = { code: String(code || '').trim(), product: product, device: device() };
      if (!body.code) return Promise.resolve({ ok: false, reason: 'invalid', message: MSG.invalid });
      return fetch(API + '/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .catch(function () { return { ok: false, reason: 'offline' }; })
        .then(function (r) {
          if (r && r.ok) {
            var d = load(); d.products = d.products || {};
            d.products[r.product] = { code: body.code.toUpperCase(), at: new Date().toISOString() };
            save(d);
            return r;
          }
          r = r || { ok: false, reason: 'offline' };
          r.message = r.reason === 'other_product' && r.name ? 'このコードは「' + r.name + '」のものです' : (MSG[r.reason] || MSG.offline);
          return r;
        });
    },
  };
})();
