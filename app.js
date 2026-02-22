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
  const loginSfx = document.getElementById("login-sfx");
  const inputUser = document.getElementById("login-username");
  const inputPass = document.getElementById("login-password");
  const btn       = document.getElementById("login-btn");
  if (loginSfx) {
  loginSfx.checked = isSfxEnabled();
  loginSfx.addEventListener("change", () => setSfxEnabled(loginSfx.checked));
}
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
    if (loginSfx) loginSfx.checked = isSfxEnabled();
    const remembered = sessionStorage.getItem("nekobot_user") || "";
    inputUser.value = remembered;
    setTimeout(() => inputUser.focus(), 220);
  }
function doLogin(){
  // 如果上一次卡住了，先允许重新点
  if (btn.dataset.busy === "1") return;

  const raw = (inputUser.value || "").trim();

// 统一拦截规则
if (/[<>]|\b(alert|script|onerror|onload|javascript:)\b/i.test(raw)) {
  alert("...你想干嘛？ 这网站github上开源（https://github.com/NirvanafeLis/stuff-for-my-other-website） 自己去看啦");

  btn.dataset.busy = "0";
  btn.disabled = false;

  inputUser.focus();
  inputUser.select?.();
  return;
}

  // ✅ 名字通过后再进入登录
  const name = raw || DEFAULT_USER;

  btn.dataset.busy = "1";
  btn.disabled = true;

  const t0 = performance.now();

  sessionStorage.setItem("nekobot_user", name);
  applyUserName(name);

  playNekobotSfx("boot");

  // 这里你可以继续用 innerHTML（因为已经拦了 <>），
  // 但更稳的是只把 name 用 textContent 放进去：
  const loginWin = loginPanel.querySelector(".vb-login-window");
  if (loginWin){
    loginWin.innerHTML = `
      <div class="title-bar"></div>
      <div class="tip" style="margin:10px 0 0; opacity:.9;">欢迎登录</div>
    `;
    const t = loginWin.querySelector(".title-bar");
    if (t) t.textContent = name; // ✅ 防注入：纯文本
  }

  const wait = Math.max(0, MIN_LOGIN_TIME - (performance.now() - t0));

  setTimeout(() => {
    const ov = document.getElementById("splash-screen");
    if(!ov) return;

    ov.style.transition = "opacity 0.55s ease";
    ov.style.opacity = "0";
    setTimeout(() => ov.remove(), 580);
  }, wait);
}

  btn.addEventListener("click", doLogin);

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
  setupXPMenuAndShutdown();   
  setOnekoEnabled(isOnekoEnabled());
  setupFakeLoginFlow();


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
    "再干一杯...",
    "启动系统程序...",
    "正在补充水分...",
    "正在寻找旗鼓相当的对手...",
    "初始化网络组件...",
    "加载个人资料...",
    "检查硬盘可用性...",
    "卡这了？快去开代理啊",
    "更新系统注册项...",
    "检查煤气关了没有...",
    "正在往cpu上涂牙膏...",
    "正在加热油锅...",
    "正在清理垃圾...",
    "思考更多占位文案...",
    "正在和被窝打架..."
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
      msg.textContent = "别着急 就快好了....";
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
/* ===== 多窗口：拖拽 + 缩放 + 打开多个 app ===== */
(function setupMultiWindows(){
  // ===== 配置 =====
  const MIN_W = 420;
  const MIN_H = 280;
  const APP_IFRAMES = {
  pet: `https://gifypet.neocities.org/pet/pet.html?name=nekobot&dob=1771738094&gender=undefined&element=Air&pet=robot.gif&map=night.gif&background=1995.png&tablecolor=%2380fff6&textcolor=%23cc69e8`
};
document.addEventListener("nekobot-open-app", (e) => {
  const name = e.detail;
  if (name) createWindow(name);
});
  // ✅ 这里就是 “about 打开后更长”
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
      w: vw => Math.round(vw * 0.40),
      h: vh => Math.round(vh * 0.92),     // ✅ 更长（原来 0.78）
      x: vw => Math.round(vw * 0.06),
      y: vh => Math.round(vh * 0.04),
    },
    pet: {
      w: () => 340,   // 比 314 稍大一点，给边框/内边距留余量
      h: () => 380,   // 同理，避免标题栏挤内容
      x: (vw, w) => Math.round(vw - w - 18),
      y: (vh, h) => Math.round(vh * 0.10),
  },
    log: {
      w: vw => Math.round(vw * 0.36),
      h: vh => Math.round(vh * 0.78),
      x: vw => Math.round(vw * 0.10),
      y: vh => Math.round(vh * 0.12),
    }
  };

  // ===== 工具函数 =====
  function getStatusH(){
    const v = getComputedStyle(document.documentElement).getPropertyValue("--statusline-h");
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  // z-index：谁点谁在上面
  let __winZ = 1000;
  function bringToFront(win){
    __winZ += 1;
    win.style.zIndex = String(__winZ);
  }

  // ===== preset 应用到某个窗口实例 =====
  function applyWindowPresetTo(win, appName){
    const preset = APP_PRESETS[appName];
    const statusH = getStatusH();

    const vw = window.innerWidth;
    const vh = window.innerHeight - statusH;

    let w, h, left, top;

    if(!preset){
      w = Math.min(900, vw - 40);
      h = Math.min(580, vh - 80);
      left = Math.round((vw - w)/2);
      top  = Math.round((vh - h)/2);
    } else {
      w = clamp(preset.w(vw), MIN_W, vw - 12);
      h = clamp(preset.h(vh), MIN_H, vh - 12);
      left = clamp(preset.x(vw, w), 6, vw - w - 6);
      top  = clamp(preset.y(vh, h, statusH), 6, vh - h - 6);
    }

    win.style.transform = "none";
    win.style.width = w + "px";
    win.style.height = h + "px";
    win.style.left = left + "px";
    win.style.top = top + "px";
  }

  // ===== 把窗口 clamp 回屏幕内（resize 时用）=====
  function keepInsideViewport(win){
    const rect = win.getBoundingClientRect();
    const statusH = getStatusH();

    const vw = window.innerWidth;
    const vh = window.innerHeight - statusH;

    const w = clamp(rect.width, MIN_W, vw - 12);
    const h = clamp(rect.height, MIN_H, vh - 12);

    const left = clamp(rect.left, 6, vw - w - 6);
    const top  = clamp(rect.top,  6, vh - h - 6);

    win.style.width = w + "px";
    win.style.height = h + "px";
    win.style.left = left + "px";
    win.style.top = top + "px";
  }

  // ===== 给某个窗口绑定拖拽/缩放/关闭 =====
  function bindWindow(win){
    const drag = win.querySelector(".app-drag-handle");

    // 点哪都置顶
    win.addEventListener("pointerdown", () => bringToFront(win));

    // 关闭
    win.addEventListener("click", (e) => {
      if(e.target.closest('[data-win="close"]')){
        win.remove();
      }
    });

    // 拖动
    let dragState = null;

    drag?.addEventListener("pointerdown", (e) => {
      if(e.target.closest(".xp-app-controls")) return;

      const rect = win.getBoundingClientRect();
      dragState = { startX: e.clientX, startY: e.clientY, left: rect.left, top: rect.top };
      drag.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    drag?.addEventListener("pointermove", (e) => {
      if(!dragState) return;

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      const rect = win.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const statusH = getStatusH();

      const newLeft = clamp(dragState.left + dx, 6, window.innerWidth - w - 6);
      const newTop  = clamp(dragState.top + dy,  6, window.innerHeight - statusH - h - 6);

      win.style.left = newLeft + "px";
      win.style.top  = newTop + "px";
    });

    drag?.addEventListener("pointerup", () => { dragState = null; });
    drag?.addEventListener("pointercancel", () => { dragState = null; });

    // 缩放
    let rsState = null;

    win.querySelectorAll(".rs").forEach(handle => {
      handle.addEventListener("pointerdown", (e) => {
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
        if(d.includes("w")) { w = rsState.width - dx; left = rsState.left + dx; }
        if(d.includes("s")) h = rsState.height + dy;
        if(d.includes("n")) { h = rsState.height - dy; top = rsState.top + dy; }

        w = Math.max(MIN_W, w);
        h = Math.max(MIN_H, h);

        const statusH = getStatusH();
        w = Math.min(w, window.innerWidth - 12);
        h = Math.min(h, window.innerHeight - statusH - 12);

        left = clamp(left, 6, window.innerWidth - w - 6);
        top  = clamp(top,  6, window.innerHeight - statusH - h - 6);

        win.style.left = left + "px";
        win.style.top  = top + "px";
        win.style.width  = w + "px";
        win.style.height = h + "px";
      });

      handle.addEventListener("pointerup", () => { rsState = null; });
      handle.addEventListener("pointercancel", () => { rsState = null; });
    });
  }

  // ===== 创建一个新窗口（每点一次就开一个）=====
  function createWindow(appName){
    const tpl = document.getElementById("tpl-app-window");
    if(!tpl) return;

    const win = tpl.content.firstElementChild.cloneNode(true);

    const title = win.querySelector(".app-title");
    const frame = win.querySelector(".app-frame");
    const inline = win.querySelector(".app-inline");

    title.textContent = appName;

    if (appName === "option") {
      frame.hidden = true;
      inline.hidden = false;
      frame.src = "about:blank";
      renderOptionInline(inline); // ✅ 传入本窗口的 inline
    } else {  inline.hidden = true;
  frame.hidden = false;

  // ===== 创建加载层（放在 body 里，只遮内容区）=====
  const body = win.querySelector(".xp-app-body");

  const loading = document.createElement("div");
  loading.className = "app-loading";
  loading.innerHTML = `<div class="app-loading-text">加载中...</div>`;

  body.appendChild(loading);

  // 最少显示 300ms，避免闪一下
  const minTime = 300;
  const start = performance.now();

  frame.addEventListener("load", () => {
    const wait = Math.max(0, minTime - (performance.now() - start));
    setTimeout(() => {
      loading.style.transition = "opacity .25s ease";
      loading.style.opacity = "0";
      setTimeout(() => loading.remove(), 260);
    }, wait);
  }, { once: true });

  const src = APP_IFRAMES[appName];
  frame.src = src ? src : `${appName}.html`;
    }
    document.body.appendChild(win);
    bringToFront(win);
    applyWindowPresetTo(win, appName);
    bindWindow(win);
  }

  // 桌面图标：点一次开一个
document.addEventListener("click", (e) => {
  const el = e.target.closest(".desk-icon, .avatar[data-app]");
  if(!el) return;

  const name = el.getAttribute("data-app");
  if(!name) return;

  createWindow(name);
});

  // resize：把所有窗口 clamp 回屏幕内
  window.addEventListener("resize", () => {
    document.querySelectorAll(".app-window").forEach(keepInsideViewport);
  });
})();

// ===== oneko 开关（仅此一个设置） =====
const ONEKO_KEY = "nekobot_oneko_enabled";

function isOnekoEnabled(){
  const v = localStorage.getItem(ONEKO_KEY);

  // 没存过 → 默认开启，并写入一次
  if (v === null) {
    localStorage.setItem(ONEKO_KEY, "1");
    return true;
  }
  return v === "1";
}

function setOnekoEnabled(enabled){
  localStorage.setItem(ONEKO_KEY, enabled ? "1" : "0");

  const scriptId = "oneko-loader";
  const existed = document.getElementById(scriptId);

  if (enabled) {
    if (!existed) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "/oneko/oneko.js";
      document.body.appendChild(s);
    }
  } else {
    document.getElementById("oneko")?.remove();
    existed?.remove();

    if (window.oneko && typeof window.oneko.destroy === "function") {
      window.oneko.destroy();
    }
  }
}

function renderOptionInline(host){
  const tpl = document.getElementById("tpl-option");
  if (!host || !tpl) return;

  host.innerHTML = "";
  host.appendChild(tpl.content.cloneNode(true));

  const chk = host.querySelector("#opt-oneko");
  if (chk) {
    chk.checked = isOnekoEnabled();
    chk.addEventListener("change", () => setOnekoEnabled(chk.checked));
  }
  const sfx = host.querySelector("#opt-sfx");
if (sfx) {
  sfx.checked = isSfxEnabled();
  sfx.addEventListener("change", () => setSfxEnabled(sfx.checked));
}
}

// ===== 开机/关机音效开关 =====
const SFX_KEY = "nekobot_sfx_enabled";

function isSfxEnabled(){
  const v = localStorage.getItem(SFX_KEY);
  if (v === null) {
    localStorage.setItem(SFX_KEY, "1"); // 默认开启
    return true;
  }
  return v === "1";
}

function setSfxEnabled(enabled){
  localStorage.setItem(SFX_KEY, enabled ? "1" : "0");
}

// ===== 音效（走 https，符合 CSP）=====
const SFX_URL = {
  boot: "https://cdn.jsdelivr.net/gh/NirvanafeLis/nekobot-assets@main/boot.mp3",
  shutdown: "https://cdn.jsdelivr.net/gh/NirvanafeLis/nekobot-assets@main/shutdown.mp3"
};

// 复用 audio，避免每次 new（也更好缓存）
const __sfx = {
  boot: new Audio(SFX_URL.boot),
  shutdown: new Audio(SFX_URL.shutdown),
};

// 可选：预加载（不一定每个浏览器都真预加载，但无害）
__sfx.boot.preload = "auto";
__sfx.shutdown.preload = "auto";

// 可选：音量
__sfx.boot.volume = 0.8;
__sfx.shutdown.volume = 0.8;

function playNekobotSfx(type){
  if(!isSfxEnabled()) return;

  const a = __sfx[type];
  if(!a) return;

  try{
    a.pause();
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(console.warn);
  }catch(e){
    console.warn(e);
  }
}


/* ===== 下面你原样保留：Start 菜单 + 关机 ===== */
function setupXPMenuAndShutdown(){
  const btn  = document.getElementById("xp-menu-btn");
  const menu = document.getElementById("xp-start-menu");
  const shutdownItem = document.getElementById("xp-shutdown-btn");

  const homeItem = document.getElementById("xp-item-home");
  const cvItem = document.getElementById("xp-item-cv");
  const logItem = document.getElementById("xp-item-log");
  const linksItem = document.getElementById("xp-item-links");
  const petItem = document.getElementById("xp-item-pet");
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
  petItem?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeMenu();
  // 调用多窗口系统创建 pet 窗口
  if (typeof window.createWindow === "function") window.createWindow("pet");
  else document.dispatchEvent(new CustomEvent("nekobot-open-app", { detail: "pet" }));
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

  // ===== 统一停用：点击任何菜单项都弹“暂时不可用” =====
  function getMenuText(el){
    if(!el) return "该功能";
    const t = (el.textContent || "").replace(/\s+/g," ").trim();
    return t || "该功能";
  }

  function bindDisabledNotice(btnEl, featureName){
    if(!btnEl) return;
    btnEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
      const name = featureName || getMenuText(btnEl);
      showFakeNotify(`【${name}】暂时不可用。`);
    });
  }

  // 左栏
  bindDisabledNotice(homeItem, "返回主页");
  bindDisabledNotice(logItem, "更新日志");
  bindDisabledNotice(linksItem, "友情链接");

  // 右栏（你如果之后还会用 settings/about，就先也停用）
  const settingsItem = document.getElementById("xp-item-settings");
  const aboutItem    = document.getElementById("xp-item-about");
  bindDisabledNotice(settingsItem, "设置");
  bindDisabledNotice(aboutItem, "关于");
  
  cvItem?.addEventListener("click", () => { window.location.href = "cv.html"; });

  function startShutdown(){
    sessionStorage.removeItem("nekobot_user");
    sessionStorage.removeItem("nekobot_splash_shown");
    playNekobotSfx("shutdown");
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
