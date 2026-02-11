function syncStatuslineSpace(){
  const sl = document.getElementById("statusline");
  if(!sl) return;
  const h = sl.getBoundingClientRect().height;
  document.documentElement.style.setProperty("--statusline-h", h + "px");
}

function hideXPSplash(){
  // ✅ 不再 fade out / remove overlay
  // ✅ 直接在同一个 overlay 内切到 login panel，完全不闪
  if (typeof window.__nekobotOpenLogin === "function") {
    window.__nekobotOpenLogin();
  }
}

function applyUserName(name){
  document.querySelectorAll("[data-username]").forEach(el => {
    el.textContent = name;
  });
}

/* ===== Login Config ===== */
const MIN_LOGIN_TIME = 2000;          // ✅ “登录中”至少展示 2 秒
const DEFAULT_USER   = "user";        // ✅ 默认用户名（没填就用这个）

function setupFakeLoginFlow(){
  const splashPanel = document.getElementById("panel-splash");
  const loginPanel  = document.getElementById("panel-login");
  const bootBody    = document.getElementById("boot-body");

  const inputUser = document.getElementById("login-username");
  const inputPass = document.getElementById("login-password");
  const btn       = document.getElementById("login-btn");

  // ✅ welcome 已删除：不要再检查 welcome
  if(!splashPanel || !loginPanel || !bootBody || !inputUser || !inputPass || !btn) return;

  // 密码锁死
  const lockPassword = () => { inputPass.value = "*******"; };
  lockPassword();
  inputPass.addEventListener("keydown", (e) => e.preventDefault());
  inputPass.addEventListener("paste", (e) => e.preventDefault());
  inputPass.addEventListener("input", lockPassword);

  function fadeSwap(toLogin){
    bootBody.style.transition = "opacity .18s ease";
    bootBody.style.opacity = "0";
    setTimeout(() => {
      if(toLogin){
        splashPanel.hidden = true;
        splashPanel.setAttribute("aria-hidden","true");
        loginPanel.hidden = false;
        loginPanel.setAttribute("aria-hidden","false");
      }else{
        loginPanel.hidden = true;
        loginPanel.setAttribute("aria-hidden","true");
        splashPanel.hidden = false;
        splashPanel.setAttribute("aria-hidden","false");
      }
      bootBody.style.opacity = "1";
    }, 180);
  }

  function resetLoginButton(){
    btn.dataset.busy = "0";
    btn.disabled = false;
  }

  function openLogin(){
    fadeSwap(true);

    // ✅ 每次打开登录都重置按钮，避免上次登录锁死
    resetLoginButton();

    const remembered = sessionStorage.getItem("nekobot_user") || "";
    inputUser.value = remembered;
    setTimeout(() => inputUser.focus(), 220);
  }

  function doLogin(){
    const overlay = document.getElementById("splash-screen");
    const name = (inputUser.value || "").trim() || DEFAULT_USER;

    // ✅ 防抖：避免连点 OK / 连回车触发多次
    if (btn.dataset.busy === "1") return;
    btn.dataset.busy = "1";
    btn.disabled = true;

    // ✅ 记录“进入登录中界面”的时间
    const t0 = performance.now();

    sessionStorage.setItem("nekobot_user", name);
    applyUserName(name);

    const loginWin = loginPanel.querySelector(".vb-login-window");
    if(loginWin){
      loginWin.innerHTML = `
        <div class="title-bar">${name} </div>
        <div class="tip" style="margin:10px 0 0; opacity:.9;">欢迎登录</div>
      `;
    }

    // ✅ 强制至少显示 MIN_LOGIN_TIME
    const wait = Math.max(0, MIN_LOGIN_TIME - (performance.now() - t0));

    setTimeout(() => {
      // overlay 可能已经不存在（比如被其它逻辑移除了）
      const ov = document.getElementById("splash-screen");
      if(!ov) return;

      ov.style.transition = "opacity 0.55s ease";
      ov.style.opacity = "0";
      setTimeout(() => ov.remove(), 580);
    }, wait);
  }

  // ✅ 鼠标点击 OK
  btn.addEventListener("click", doLogin);

  // ✅ Enter：只在 loginPanel 显示时触发
  loginPanel.addEventListener("keydown", (e) => {
    if (loginPanel.hidden) return;
    if(e.key === "Enter"){
      e.preventDefault();
      doLogin();
    }
  });

  // Cancel：回到 splash（可选）
  const cancel = document.getElementById("login-cancel");
  cancel?.addEventListener("click", () => {
    resetLoginButton();
    fadeSwap(false);
  });

  window.__nekobotOpenLogin = openLogin;
}

window.addEventListener("load", () => {
  syncStatuslineSpace();
  setupXPMenuAndShutdown();   // ✅ 加这一行
  setupFakeLoginFlow();

  // ✅ 刷新：如果已登录 -> 直接进桌面（移除 overlay）
  const rememberedUser = (sessionStorage.getItem("nekobot_user") || "").trim();
  if (rememberedUser) {
    applyUserName(rememberedUser);
    document.getElementById("splash-screen")?.remove();
    return;
  }
  // 没登录：继续往下走进度条逻辑，100% 后会 hideXPSplash()->openLogin()

  const bar  = document.getElementById("splash-progress-bar");
  const pct  = document.getElementById("splash-progress-text");
  const msg  = document.getElementById("xp-status-text");
  const pb   = document.querySelector(".xp-progress");
  if(!bar || !pct || !msg || !pb) return;

  const messages = [
    "读取个性化设置...",
    "应用系统选项...",
    "启动系统程序...",
    "正在补充水分...",
    "初始化网络组件...",
    "加载个人资料...",
    "检查硬盘可用性...",
    "更新系统注册项...",
    "检查煤气关了没有..."
  ];

  let p = 0;
  let lastMsgIndex = -1;
  let stalledAt99 = false;

  function randomMessage(){
    let i;
    do { i = Math.floor(Math.random() * messages.length); }
    while (i === lastMsgIndex);
    lastMsgIndex = i;
    msg.textContent = messages[i];
  }

  function setProgress(val){
    p = Math.max(0, Math.min(100, val));
    bar.style.width = p + "%";
    pct.textContent = Math.floor(p) + "%";
    pb.setAttribute("aria-valuenow", String(Math.floor(p)));
  }

  randomMessage();

  const tick = () => {
    let delta;
    if (p < 55) delta = Math.random() * 10 + 6;
    else if (p < 85) delta = Math.random() * 4 + 1;
    else delta = Math.random() * 6 + 3;

    let next = p + delta;

    if (!stalledAt99 && next >= 99) {
      stalledAt99 = true;
      setProgress(99);
      msg.textContent = "就快好了....";
      setTimeout(() => {
        setProgress(100);
        msg.textContent = "加载完成.";
        setTimeout(hideXPSplash, 250);
      }, 1000);
      return;
    }

    if (next > 98) next = 98;
    setProgress(next);

    if (Math.random() > 0.65 && p < 95) randomMessage();
    setTimeout(tick, 90 + Math.random() * 140);
  };

  setTimeout(tick, 280);
});

window.addEventListener("resize", syncStatuslineSpace);

/* ===== 下面这段你原样保留：窗口拖拽缩放 ===== */
(function setupDraggableResizableWindow(){
  const win   = document.getElementById("app-window");
  const frame = document.getElementById("app-frame");
  const title = document.getElementById("app-title");
  const drag  = document.getElementById("app-drag-handle");
  const back  = document.getElementById("app-backdrop");

  if(!win || !frame || !title || !drag || !back) return;

  const MIN_W = 420;
  const MIN_H = 280;

  const APP_PRESETS = {
    option: {
      w: vw => Math.round(vw * 0.42),
      h: vh => Math.round(vh * 0.42),
      x: (vw, w) => Math.round((vw - w) / 2),
      y: (vh, h, statusH) => Math.round((vh - h) / 2),
    },
    cv: {
      w: vw => Math.round(vw * 0.86),
      h: vh => Math.round(vh * 0.78),
      x: vw => Math.round(vw * 0.07),
      y: vh => Math.round(vh * 0.08),
    },
    about: {
      w: vw => Math.round(vw * 0.32),
      h: vh => Math.round(vh * 0.78),
      x: vw => Math.round(vw * 0.08),
      y: vh => Math.round(vh * 0.10),
    },
    log: {
      w: vw => Math.round(vw * 0.32),
      h: vh => Math.round(vh * 0.78),
      x: vw => Math.round(vw * 0.10),
      y: vh => Math.round(vh * 0.12),
    }
  };

  function getStatusH(){
    const v = getComputedStyle(document.documentElement).getPropertyValue("--statusline-h");
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function ensureAbsolutePosition(){
    const rect = win.getBoundingClientRect();
    win.style.transform = "none";
    win.style.left = rect.left + "px";
    win.style.top  = rect.top + "px";
  }

  function centerWindow(){
    const statusH = getStatusH();
    const w = Math.min(900, window.innerWidth - 40);
    const h = Math.min(580, window.innerHeight - statusH - 80);
    win.style.width = w + "px";
    win.style.height = h + "px";
    win.style.transform = "none";
    win.style.left = Math.round((window.innerWidth - w)/2) + "px";
    win.style.top  = Math.round((window.innerHeight - statusH - h)/2) + "px";
  }

  function applyWindowPreset(appName){
    const preset = APP_PRESETS[appName];
    const statusH = getStatusH();

    const vw = window.innerWidth;
    const vh = window.innerHeight - statusH;

    if(!preset){
      centerWindow();
      return;
    }

    let w = preset.w(vw);
    let h = preset.h(vh);

    w = clamp(w, MIN_W, vw - 12);
    h = clamp(h, MIN_H, vh - 12);

    let left = preset.x(vw, w);
    let top  = preset.y(vh, h, statusH);

    left = clamp(left, 6, vw - w - 6);
    top  = clamp(top, 6, vh - h - 6);

    win.style.transform = "none";
    win.style.width  = w + "px";
    win.style.height = h + "px";
    win.style.left   = left + "px";
    win.style.top    = top + "px";
  }

  function openApp(name){
    title.textContent = name;
    frame.src = `${name}.html`;

    back.hidden = false;
    win.hidden = false;
    win.setAttribute("aria-hidden","false");

    applyWindowPreset(name);
  }

  function closeApp(){
    win.hidden = true;
    win.setAttribute("aria-hidden","true");
    back.hidden = true;
    frame.src = "about:blank";
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".desk-icon");
    if(!btn) return;
    const name = btn.getAttribute("data-app");
    if(!name) return;
    openApp(name);
  });

  win.addEventListener("click", (e) => {
    if(e.target.closest('[data-win="close"]')) closeApp();
  });

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && !win.hidden) closeApp();
  });

  /* 拖动 */
  let dragState = null;

  drag.addEventListener("pointerdown", (e) => {
    if(win.hidden) return;
    if(e.target.closest(".xp-app-controls")) return;
    ensureAbsolutePosition();

    const rect = win.getBoundingClientRect();
    dragState = { startX: e.clientX, startY: e.clientY, left: rect.left, top: rect.top };
    drag.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  drag.addEventListener("pointermove", (e) => {
    if(!dragState) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    const rect = win.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const statusH = getStatusH();

    const newLeft = clamp(dragState.left + dx, 6, window.innerWidth - w - 6);
    const newTop  = clamp(dragState.top  + dy, 6, window.innerHeight - statusH - h - 6);

    win.style.left = newLeft + "px";
    win.style.top  = newTop + "px";
  });

  drag.addEventListener("pointerup", () => { dragState = null; });
  drag.addEventListener("pointercancel", () => { dragState = null; });

  /* 缩放 */
  let rsState = null;

  win.querySelectorAll(".rs").forEach(handle => {
    handle.addEventListener("pointerdown", (e) => {
      if(win.hidden) return;
      ensureAbsolutePosition();

      const rect = win.getBoundingClientRect();
      rsState = {
        dir: handle.dataset.rs,
        startX: e.clientX,
        startY: e.clientY,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    });

    handle.addEventListener("pointermove", (e) => {
      if(!rsState) return;

      const dx = e.clientX - rsState.startX;
      const dy = e.clientY - rsState.startY;

      let left = rsState.left;
      let top  = rsState.top;
      let w    = rsState.width;
      let h    = rsState.height;

      const d = rsState.dir;

      if(d.includes("e")) w = rsState.width + dx;
      if(d.includes("w")){
        w = rsState.width - dx;
        left = rsState.left + dx;
      }
      if(d.includes("s")) h = rsState.height + dy;
      if(d.includes("n")){
        h = rsState.height - dy;
        top = rsState.top + dy;
      }

      w = Math.max(MIN_W, w);
      h = Math.max(MIN_H, h);

      const statusH = getStatusH();

      w = Math.min(w, window.innerWidth - 12);
      h = Math.min(h, window.innerHeight - statusH - 12);

      left = clamp(left, 6, window.innerWidth - w - 6);
      top  = clamp(top, 6, window.innerHeight - statusH - h - 6);

      win.style.left = left + "px";
      win.style.top  = top + "px";
      win.style.width  = w + "px";
      win.style.height = h + "px";
    });

    handle.addEventListener("pointerup", () => { rsState = null; });
    handle.addEventListener("pointercancel", () => { rsState = null; });
  });

  window.addEventListener("resize", () => {
    if(win.hidden) return;
    ensureAbsolutePosition();

    const rect = win.getBoundingClientRect();
    const statusH = getStatusH();

    const w = clamp(rect.width, MIN_W, window.innerWidth - 12);
    const h = clamp(rect.height, MIN_H, window.innerHeight - statusH - 12);

    const left = clamp(rect.left, 6, window.innerWidth - w - 6);
    const top  = clamp(rect.top, 6, window.innerHeight - statusH - h - 6);

    win.style.width = w + "px";
    win.style.height = h + "px";
    win.style.left = left + "px";
    win.style.top  = top + "px";
  });
})();

/* ===== 下面你原样保留：Start 菜单 + 关机 ===== */
function setupXPMenuAndShutdown(){
  const btn  = document.getElementById("xp-menu-btn");
  const menu = document.getElementById("xp-start-menu");
  const shutdownItem = document.getElementById("xp-shutdown-btn");

  const homeItem = document.getElementById("xp-item-home");
  const cvItem = document.getElementById("xp-item-cv");
  const logItem = document.getElementById("xp-item-log");
  const linksItem = document.getElementById("xp-item-links");

  const blue = document.getElementById("shutdown-blue");
  const blueBar = document.getElementById("shutdown-blue-bar-inner");
  const bluePct = document.getElementById("shutdown-blue-pct");
  const blueText = document.getElementById("shutdown-blue-text");
  const bluePB = blue ? blue.querySelector(".shutdown-blue-bar") : null;

  const black = document.getElementById("shutdown-screen");

  if(!btn || !menu || !shutdownItem || !blue || !blueBar || !bluePct || !blueText || !bluePB || !black) return;

  // 初始化强制隐藏
  menu.hidden = true;
  blue.hidden = true;
  black.hidden = true;

  function positionMenuToButton(){
    const r = btn.getBoundingClientRect();
    menu.style.left = Math.max(8, r.left) + "px";
    menu.style.bottom = (window.innerHeight - r.top + 6) + "px";
  }

  function openMenu(){
    positionMenuToButton();
    menu.hidden = false;
    btn.setAttribute("aria-expanded","true");
    const first = menu.querySelector('button[role="menuitem"]');
    if(first) first.focus();
  }
  function closeMenu(){
    menu.hidden = true;
    btn.setAttribute("aria-expanded","false");
  }
  function toggleMenu(){
    if(menu.hidden) openMenu();
    else closeMenu();
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    syncStatuslineSpace();
    toggleMenu();
  });

  document.addEventListener("click", () => closeMenu());
  menu.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("keydown", (e) => {
    if(menu.hidden) return;

    if(e.key === "Escape"){
      e.preventDefault();
      closeMenu();
      btn.focus();
      return;
    }

    if(e.key === "ArrowDown" || e.key === "ArrowUp"){
      e.preventDefault();
      const items = Array.from(menu.querySelectorAll('button[role="menuitem"]'));
      if(items.length === 0) return;
      const idx = items.indexOf(document.activeElement);
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = idx === -1 ? 0 : (idx + dir + items.length) % items.length;
      items[next].focus();
    }
  });

  const notify = document.getElementById("fake-notification");
  const notifyText = document.getElementById("fake-notification-text");
  const notifyClose = document.getElementById("fake-notification-close");
  let notifyTimer = null;

  function showFakeNotify(text){
    if(!notify || !notifyText) return;

    notifyText.innerHTML = text;
    notify.hidden = false;
    notify.setAttribute("aria-hidden","false");
    notify.classList.add("show");

    clearTimeout(notifyTimer);
    notifyTimer = setTimeout(() => {
      notify.classList.remove("show");
      notify.hidden = true;
      notify.setAttribute("aria-hidden","true");
    }, 7000);
  }

  notifyClose?.addEventListener("click", () => {
    if(!notify) return;
    notify.classList.remove("show");
    notify.hidden = true;
    notify.setAttribute("aria-hidden","true");
    clearTimeout(notifyTimer);
  });

  homeItem?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMenu();
    showFakeNotify("该功能已停用<br>想回主页请点击：<b>关机</b>。<br>");
  });

  cvItem?.addEventListener("click", () => { window.location.href = "cv.html"; });
  logItem?.addEventListener("click", () => { window.location.hash = "1"; closeMenu(); });
  linksItem?.addEventListener("click", () => { window.location.hash = "2"; closeMenu(); });

  function startShutdown(){
    sessionStorage.removeItem("nekobot_user");
    sessionStorage.removeItem("nekobot_splash_shown");

    blue.hidden = false;
    black.hidden = true;
    blueBar.style.width = "0%";
    bluePct.textContent = "0%";
    blueText.textContent = "正在保存您的设置…";
    bluePB.setAttribute("aria-valuenow","0");

    const msgs = [
      "正在保存您的设置…",
      "正在关闭程序…",
      "正在注销用户…",
      "正在停止服务…",
      "正在写入磁盘缓存…",
      "正在关闭网络连接…"
    ];

    let p = 0;
    let last = -1;
    let stalledAt99 = false;

    function randMsg(){
      let i;
      do { i = Math.floor(Math.random() * msgs.length); } while (i === last);
      last = i;
      blueText.textContent = msgs[i];
    }

    function setP(val){
      p = Math.max(0, Math.min(100, val));
      blueBar.style.width = p + "%";
      bluePct.textContent = Math.floor(p) + "%";
      bluePB.setAttribute("aria-valuenow", String(Math.floor(p)));
    }

    randMsg();
    setP(0);

    const tick = () => {
      let delta;
      if (p < 60) delta = Math.random() * 12 + 6;
      else if (p < 88) delta = Math.random() * 5 + 2;
      else delta = Math.random() * 4 + 1;

      let next = p + delta;

      if (!stalledAt99 && next >= 99) {
        stalledAt99 = true;
        setP(99);
        blueText.textContent = "正在关闭 Nekobot…";
        setTimeout(() => {
          setP(100);
          blueText.textContent = "正在关机…";
          setTimeout(() => {
            blue.hidden = true;
            black.hidden = false;
          }, 520);
        }, 900);
        return;
      }

      if (next > 98) next = 98;
      setP(next);

      if (Math.random() > 0.65 && p < 95) randMsg();
      setTimeout(tick, 120 + Math.random() * 180);
    };

    setTimeout(tick, 260);
  }

  shutdownItem.addEventListener("click", () => {
    closeMenu();
    startShutdown();
  });

  window.addEventListener("resize", () => {
    syncStatuslineSpace();
    if(!menu.hidden) positionMenuToButton();
  });
}
