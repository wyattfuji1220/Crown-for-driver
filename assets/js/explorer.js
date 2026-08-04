/* =====================================================================
   CROWN OWNER'S GUIDE — 共通インタラクション
   ・図中のホットスポットにホバー → ルーペでその部分をベクター拡大
   ・クリック → 詳細パネルに説明文を表示
   ・図と一覧リストは双方向に連動
   ・キーボード操作対応（Tab / Enter / Space / Esc）
   依存なし。ビルド不要。
   ===================================================================== */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  function Explorer(config) {
    this.cfg = config;
    this.items = config.items;
    this.byId = {};
    this.items.forEach(function (it) { this.byId[it.id] = it; }, this);

    this.root      = document.querySelector(config.root || '.explorer');
    this.diagram   = this.root.querySelector('.diagram');
    this.loupe     = this.root.querySelector('.loupe');
    this.loupeSvg  = this.loupe ? this.loupe.querySelector('svg') : null;
    this.loupeLbl  = this.loupe ? this.loupe.querySelector('.loupe__label') : null;
    this.detail    = this.root.querySelector('.detail__body');
    this.listRoot  = this.root.querySelector('.index-list');

    this.hotspots  = Array.prototype.slice.call(this.diagram.querySelectorAll('.hotspot'));
    this.buttons   = {};
    this.selected  = null;

    this.placeholder = this.detail ? this.detail.innerHTML : '';

    this.buildList();
    this.bindHotspots();
    this.bindGlobal();
    this.verify();
  }

  /* -------------------------------------------------- 一覧リストの組み立て */

  Explorer.prototype.buildList = function () {
    if (!this.listRoot) return;
    var self = this;
    var groups = this.cfg.groups || [{ ids: this.items.map(function (i) { return i.id; }) }];

    groups.forEach(function (group) {
      if (group.title) {
        var head = el('li', { class: 'index-list__group' }, group.title);
        self.listRoot.appendChild(head);
      }
      group.ids.forEach(function (id) {
        var item = self.byId[id];
        if (!item) return;

        var li  = el('li');
        var btn = el('button', { type: 'button', 'data-id': id });

        var key = el('span', { class: 'index-list__key' + (item.iconRef ? ' index-list__key--icon' : '') });
        if (item.iconRef) {
          var svg = document.createElementNS(SVG_NS, 'svg');
          svg.setAttribute('viewBox', item.iconViewBox || '0 0 32 32');
          svg.setAttribute('aria-hidden', 'true');
          var use = document.createElementNS(SVG_NS, 'use');
          use.setAttribute('href', '#' + item.iconRef);
          svg.appendChild(use);
          key.appendChild(svg);
        } else {
          key.textContent = item.badge || id;
        }

        btn.appendChild(key);
        btn.appendChild(el('span', null, item.label));
        li.appendChild(btn);
        self.listRoot.appendChild(li);
        self.buttons[id] = btn;

        btn.addEventListener('mouseenter', function () { self.preview(id); });
        btn.addEventListener('mouseleave', function () { self.endPreview(); });
        btn.addEventListener('focus',      function () { self.preview(id); });
        btn.addEventListener('blur',       function () { self.endPreview(); });
        btn.addEventListener('click',      function () { self.select(id); });
      });
    });
  };

  /* -------------------------------------------------- 図のホットスポット */

  Explorer.prototype.bindHotspots = function () {
    var self = this;
    this.hotspots.forEach(function (spot) {
      var id   = spot.getAttribute('data-id');
      var item = self.byId[id];
      if (!item) return;

      spot.setAttribute('role', 'button');
      spot.setAttribute('tabindex', '0');
      spot.setAttribute('aria-label', item.label);

      spot.addEventListener('mouseenter', function () { self.preview(id); });
      spot.addEventListener('mouseleave', function () { self.endPreview(); });
      spot.addEventListener('focus',      function () { self.preview(id); });
      spot.addEventListener('blur',       function () { self.endPreview(); });
      spot.addEventListener('click',      function () { self.select(id); });
      spot.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          self.select(id);
        }
      });
    });
  };

  Explorer.prototype.bindGlobal = function () {
    var self = this;
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') self.clear();
    });
  };

  /* -------------------------------------------------- ルーペ（ホバー拡大） */

  Explorer.prototype.preview = function (id) {
    var item = this.byId[id];
    if (!item || !this.loupe || !item.focus) return;

    var f = item.focus;
    this.loupeSvg.setAttribute('viewBox', f[0] + ' ' + f[1] + ' ' + f[2] + ' ' + f[3]);
    if (this.loupeLbl) this.loupeLbl.textContent = item.label;
    this.loupe.classList.add('is-visible');

    this.hover = id;
    this.syncHover();
  };

  Explorer.prototype.endPreview = function () {
    if (this.loupe && !this.selected) this.loupe.classList.remove('is-visible');
    if (this.selected) this.preview(this.selected);
    this.hover = null;
    this.syncHover();
  };

  Explorer.prototype.syncHover = function () {
    var target = this.hover || this.selected;
    this.hotspots.forEach(function (spot) {
      spot.classList.toggle('is-active', spot.getAttribute('data-id') === target);
    });
    var self = this;
    Object.keys(this.buttons).forEach(function (id) {
      self.buttons[id].classList.toggle('is-active', id === self.selected);
    });
    this.diagram.classList.toggle('is-dimmed', !!target);
  };

  /* -------------------------------------------------- 詳細表示 */

  Explorer.prototype.select = function (id) {
    var item = this.byId[id];
    if (!item) return;

    this.selected = id;
    this.preview(id);
    this.render(item);

    if (this.buttons[id] && this.listRoot) {
      var btn  = this.buttons[id];
      var top  = btn.offsetTop - this.listRoot.offsetTop;
      var view = this.listRoot.clientHeight;
      if (top < this.listRoot.scrollTop || top > this.listRoot.scrollTop + view - btn.offsetHeight) {
        this.listRoot.scrollTop = top - view / 2 + btn.offsetHeight / 2;
      }
    }
  };

  Explorer.prototype.clear = function () {
    this.selected = null;
    this.hover = null;
    if (this.loupe) this.loupe.classList.remove('is-visible');
    if (this.detail) this.detail.innerHTML = this.placeholder;
    this.syncHover();
  };

  Explorer.prototype.render = function (item) {
    if (!this.detail) return;
    var frag = document.createDocumentFragment();

    /* 見出し（記号バッジ or 警告灯アイコン） */
    if (item.iconRef) {
      var box = el('div', { class: 'detail__badge', style: 'background:#10151d;border-color:#2a3140;padding:5px;min-width:40px;height:40px' });
      var svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', item.iconViewBox || '0 0 32 32');
      svg.setAttribute('width', '30');
      svg.setAttribute('height', '30');
      svg.setAttribute('aria-hidden', 'true');
      var use = document.createElementNS(SVG_NS, 'use');
      use.setAttribute('href', '#' + item.iconRef);
      svg.appendChild(use);
      box.appendChild(svg);
      frag.appendChild(box);
    } else {
      frag.appendChild(el('div', { class: 'detail__badge' }, item.badge || item.id));
    }

    frag.appendChild(el('h3', { class: 'detail__title' }, item.label));

    /* タグ */
    var tags = [];
    if (item.color === 'red')   tags.push({ t: '赤色',   c: 'tag--red' });
    if (item.color === 'amber') tags.push({ t: '黄色',   c: 'tag--amber' });
    if (item.color === 'green') tags.push({ t: '緑色',   c: 'tag--green' });
    if (item.blink)             tags.push({ t: '点滅',   c: 'tag--amber' });
    if (item.buzzer)            tags.push({ t: '警告ブザー', c: '' });
    if (item.optional)          tags.push({ t: '★ 装備の有無あり', c: 'tag--gold' });
    if (item.digitalOnly)       tags.push({ t: '＊ デジタル取扱説明書に詳細', c: '' });
    (item.tags || []).forEach(function (t) { tags.push({ t: t, c: '' }); });

    if (tags.length) {
      var tagBox = el('div', { class: 'detail__tags' });
      tags.forEach(function (t) {
        tagBox.appendChild(el('span', { class: 'tag ' + t.c }, t.t));
      });
      frag.appendChild(tagBox);
    }

    frag.appendChild(el('p', { class: 'detail__desc' }, item.desc));

    if (item.note) frag.appendChild(el('p', { class: 'detail__note' }, item.note));

    var src = el('p', { class: 'detail__source' });
    src.textContent = item.source || this.cfg.source || '';
    if (src.textContent) frag.appendChild(src);

    this.detail.innerHTML = '';
    this.detail.appendChild(frag);
  };

  /* -------------------------------------------------- 整合性チェック（開発用） */

  Explorer.prototype.verify = function () {
    var self = this;
    var inSvg = this.hotspots.map(function (s) { return s.getAttribute('data-id'); });
    var missing = this.items
      .filter(function (i) { return inSvg.indexOf(i.id) === -1; })
      .map(function (i) { return i.id; });
    var orphan = inSvg.filter(function (id) { return !self.byId[id]; });

    if (missing.length) console.warn('[explorer] SVG にホットスポットが無い id:', missing.join(', '));
    if (orphan.length)  console.warn('[explorer] データに定義が無い data-id:', orphan.join(', '));
  };

  /* -------------------------------------------------- */

  global.CrownExplorer = {
    init: function (config) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { new Explorer(config); });
      } else {
        new Explorer(config);
      }
    }
  };
})(window);
