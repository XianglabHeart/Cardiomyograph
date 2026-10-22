/* ConTrack 自绘下拉：把原生 <select> 包成可主题化 listbox（对齐采购系统 customselect）。
   原生 select 仍保留在 DOM，负责取值 / change 事件；无 JS 时也能用。
   动态改 options 后调用 ConTrackSelect.refresh(select)。 */
(function () {
  "use strict";

  function rebuildOptions(select, list) {
    list.innerHTML = "";
    Array.prototype.forEach.call(select.options, function (o, i) {
      var it = document.createElement("div");
      it.className = "cs-option";
      it.setAttribute("role", "option");
      it.dataset.index = String(i);
      it.textContent = o.textContent;
      it.setAttribute("aria-selected", o.selected ? "true" : "false");
      if (o.disabled) it.setAttribute("aria-disabled", "true");
      list.appendChild(it);
    });
  }

  function enhance(select) {
    if (select.dataset.csDone || select.multiple || select.classList.contains("no-cs")) return;
    select.dataset.csDone = "1";

    var wrap = document.createElement("div");
    wrap.className = "cs" + (select.closest(".select-wrap.sm") ? " cs-sm" : "");
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add("cs-native");
    select.setAttribute("tabindex", "-1");
    select.setAttribute("aria-hidden", "true");

    var labelText = select.getAttribute("aria-label") || "";
    if (!labelText && select.id) {
      var lab = document.querySelector('label[for="' + select.id + '"]');
      if (lab) labelText = lab.textContent.trim();
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cs-button";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    if (labelText) btn.setAttribute("aria-label", labelText);
    var txt = document.createElement("span");
    txt.className = "cs-text";
    var chev = document.createElement("span");
    chev.className = "cs-chev";
    chev.setAttribute("aria-hidden", "true");
    btn.appendChild(txt);
    btn.appendChild(chev);
    wrap.appendChild(btn);

    var list = document.createElement("div");
    list.className = "cs-list";
    list.setAttribute("role", "listbox");
    if (labelText) list.setAttribute("aria-label", labelText);
    list.hidden = true;
    document.body.appendChild(list);

    rebuildOptions(select, list);

    var activeIndex = Math.max(0, select.selectedIndex);
    select._cs = { wrap: wrap, btn: btn, list: list, txt: txt };

    function syncText() {
      var o = select.options[select.selectedIndex];
      txt.textContent = o ? o.textContent : "";
    }
    function syncDisabled() {
      btn.disabled = !!select.disabled;
      wrap.classList.toggle("cs-disabled", !!select.disabled);
    }
    function syncSelectedAttrs() {
      for (var k = 0; k < list.children.length; k++) {
        list.children[k].setAttribute("aria-selected", k === select.selectedIndex ? "true" : "false");
      }
    }
    syncText();
    syncDisabled();

    function highlight() {
      for (var i = 0; i < list.children.length; i++) {
        list.children[i].classList.toggle("cs-active", i === activeIndex);
      }
      var el = list.children[activeIndex];
      if (el) el.scrollIntoView({ block: "nearest" });
    }
    function onDoc(e) {
      if (!wrap.contains(e.target) && !list.contains(e.target)) close();
    }
    function place() {
      var r = btn.getBoundingClientRect();
      list.style.minWidth = r.width + "px";
      list.style.left = r.left + "px";
      list.style.top = r.bottom + 4 + "px";
      var lh = list.offsetHeight;
      if (r.bottom + 4 + lh > window.innerHeight && r.top - 4 - lh > 0) {
        list.style.top = r.top - 4 - lh + "px";
      }
      var lw = list.offsetWidth;
      var left = r.left;
      if (left + lw > window.innerWidth - 8) left = window.innerWidth - lw - 8;
      list.style.left = Math.max(8, left) + "px";
    }
    function open() {
      if (select.disabled || !list.hidden) return;
      list.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      wrap.classList.add("cs-open");
      place();
      activeIndex = Math.max(0, select.selectedIndex);
      highlight();
      document.addEventListener("click", onDoc, true);
      window.addEventListener("scroll", place, true);
      window.addEventListener("resize", place);
    }
    function close() {
      if (list.hidden) return;
      list.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      wrap.classList.remove("cs-open");
      document.removeEventListener("click", onDoc, true);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    }
    function choose(i) {
      if (i < 0 || i >= select.options.length || select.options[i].disabled) return;
      select.selectedIndex = i;
      syncSelectedAttrs();
      syncText();
      select.dispatchEvent(new Event("change", { bubbles: true }));
      close();
      btn.focus();
    }

    btn.addEventListener("click", function () {
      if (select.disabled) return;
      list.hidden ? open() : close();
    });
    btn.addEventListener("keydown", function (e) {
      var k = e.key;
      if (list.hidden) {
        if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
          e.preventDefault();
          open();
        }
        return;
      }
      if (k === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(select.options.length - 1, activeIndex + 1);
        highlight();
      } else if (k === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        highlight();
      } else if (k === "Home") {
        e.preventDefault();
        activeIndex = 0;
        highlight();
      } else if (k === "End") {
        e.preventDefault();
        activeIndex = select.options.length - 1;
        highlight();
      } else if (k === "Enter" || k === " ") {
        e.preventDefault();
        choose(activeIndex);
      } else if (k === "Escape") {
        e.preventDefault();
        close();
      }
    });
    list.addEventListener("click", function (e) {
      var it = e.target.closest(".cs-option");
      if (it) choose(parseInt(it.dataset.index, 10));
    });
    list.addEventListener("mousemove", function (e) {
      var it = e.target.closest(".cs-option");
      if (!it) return;
      activeIndex = parseInt(it.dataset.index, 10);
      highlight();
    });
    select.addEventListener("change", function () {
      syncSelectedAttrs();
      syncText();
      syncDisabled();
    });

    select._cs.refresh = function () {
      rebuildOptions(select, list);
      syncText();
      syncDisabled();
      syncSelectedAttrs();
    };
  }

  function init() {
    var sels = document.querySelectorAll("select");
    for (var i = 0; i < sels.length; i++) enhance(sels[i]);
  }

  window.ConTrackSelect = {
    refresh: function (select) {
      if (!select) return;
      if (!select._cs) enhance(select);
      else select._cs.refresh();
    },
    refreshAll: function () {
      document.querySelectorAll("select").forEach(function (s) {
        window.ConTrackSelect.refresh(s);
      });
    },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
