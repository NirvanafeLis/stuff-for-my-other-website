(function () {
  // ✅ iframe 内即窗口模式
  let isWindowMode = false;
  try {
    isWindowMode = window.top !== window;
  } catch (e) {
    isWindowMode = true;
  }
  if (!isWindowMode) return;

  function isHomeUrl(href) {
    if (!href) return false;
    href = String(href);

    // 兼容相对路径/绝对路径/带 hash/query
    return (
      href === "/" ||
      href === "./" ||
      href === "index.html" ||
      href === "./index.html" ||
      href.includes("maonie.neocities.org") ||
      href.includes("index2") ||
      href.includes("index.html")
    );
  }

  function hideHomeLinks(root = document) {
    root.querySelectorAll("[data-home-link]").forEach((el) => {
      // 强制覆盖可能的 CSS !important
      el.style.setProperty("display", "none", "important");
      el.setAttribute("aria-hidden", "true");
    });
  }

  // 1) DOM ready 后再做一次（防止脚本太早/内容后插入）
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => hideHomeLinks());
  } else {
    hideHomeLinks();
  }

  // 2) 监听后续动态插入（about.html 如果是后渲染，就靠它）
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;

        if (node.matches?.("[data-home-link]")) {
          hideHomeLinks(node.parentNode || document);
        } else if (node.querySelector) {
          // 新节点里可能包含 data-home-link
          hideHomeLinks(node);
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // 3) 拦截任何跳回主页的链接点击
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest && e.target.closest("a");
      if (!a) return;

      const href = a.getAttribute("href") || "";
      if (isHomeUrl(href)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // 4) 拦截脚本主动跳主页（location.assign/replace）
  const _assign = window.location.assign.bind(window.location);
  const _replace = window.location.replace.bind(window.location);

  window.location.assign = (url) => {
    if (!isHomeUrl(String(url))) return _assign(url);
  };
  window.location.replace = (url) => {
    if (!isHomeUrl(String(url))) return _replace(url);
  };
})();

