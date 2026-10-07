const path = require('node:path');
const {
  app,
  BaseWindow,
  globalShortcut,
  WebContentsView,
  ipcMain,
  session,
  shell,
} = require('electron');

const APP_NAME = 'ChatGPT Local';
const HOME_URL = 'https://chatgpt.com/';
const IDLE_RETURN_MS = 60 * 60 * 1000;
const CHROME_HEIGHT = 58;
const APP_PARTITION = 'persist:chatgpt-local';
const WEBSITE_NO_DRAG_CSS = `
  *, *::before, *::after {
    -webkit-app-region: no-drag !important;
    app-region: no-drag !important;
  }
`;

let mainWindow;
let chromeView;
let nextTabId = 1;
let activeTabId = 1;
let tabs = [];
let idleTimer;

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isChatGptUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'chatgpt.com' || hostname.endsWith('.chatgpt.com');
  } catch {
    return false;
  }
}

function isOpenAiAuthUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'auth.openai.com'
      || hostname === 'accounts.openai.com'
      || hostname === 'chat.openai.com';
  } catch {
    return false;
  }
}

function getTab(tabId) {
  return tabs.find((tab) => tab.id === tabId);
}

function publicTab(tab) {
  return {
    id: tab.id,
    title: tab.title || (tab.pinned ? 'ChatGPT' : 'New tab'),
    url: tab.url,
    pinned: tab.pinned,
    active: tab.id === activeTabId,
  };
}

function sendState() {
  if (!mainWindow || mainWindow.isDestroyed()
      || !chromeView || chromeView.webContents.isDestroyed()) return;
  chromeView.webContents.send('tabs:state', {
    tabs: tabs.map(publicTab),
    activeTabId,
    isMaximized: mainWindow.isMaximized(),
  });
}

function layoutActiveView() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const [width, height] = mainWindow.getContentSize();
  if (chromeView && !chromeView.webContents.isDestroyed()) {
    chromeView.setBounds({
      x: 0,
      y: 0,
      width,
      height: CHROME_HEIGHT,
    });
  }
  const tab = getTab(activeTabId);
  if (!tab) return;
  tab.view.setBounds({
    x: 0,
    y: CHROME_HEIGHT,
    width,
    height: Math.max(0, height - CHROME_HEIGHT),
  });
}

function showActiveView() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (chromeView && !mainWindow.contentView.children.includes(chromeView)) {
    mainWindow.contentView.addChildView(chromeView);
  }
  for (const tab of tabs) {
    if (tab.id === activeTabId) {
      if (!mainWindow.contentView.children.includes(tab.view)) {
        mainWindow.contentView.addChildView(tab.view);
      }
    } else if (mainWindow.contentView.children.includes(tab.view)) {
      mainWindow.contentView.removeChildView(tab.view);
    }
  }
  layoutActiveView();
  sendState();
}

function disposeTabView(tab) {
  if (mainWindow && !mainWindow.isDestroyed()
      && mainWindow.contentView.children.includes(tab.view)) {
    mainWindow.contentView.removeChildView(tab.view);
  }
  tab.view.webContents.close();
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = null;
    const homeTab = tabs.find((tab) => tab.pinned);
    if (!homeTab) return;

    for (const tab of tabs.filter((candidate) => !candidate.pinned)) {
      tabs.splice(tabs.indexOf(tab), 1);
      disposeTabView(tab);
    }

    activeTabId = homeTab.id;
    showActiveView();
  }, IDLE_RETURN_MS);
}

function routePinnedNavigation(tab, url, event) {
  if (!tab.pinned || isChatGptUrl(url) || isOpenAiAuthUrl(url)) return false;
  if (event) event.preventDefault();
  createTab(url);
  return true;
}

function attachTabEvents(tab) {
  const contents = tab.view.webContents;

  // Websites can supply their own native drag regions, even on invisible headers.
  // Only the separate app chrome may drag the window. User-origin CSS also wins
  // over author !important rules and covers elements added by SPA navigation.
  contents.on('dom-ready', () => {
    contents.insertCSS(WEBSITE_NO_DRAG_CSS, { cssOrigin: 'user' }).catch((error) => {
      console.error('Could not disable website drag regions:', error);
    });
  });

  contents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    tab.title = title || (tab.pinned ? 'ChatGPT' : 'New tab');
    sendState();
  });

  contents.on('did-start-loading', () => {
    resetIdleTimer();
    sendState();
  });

  contents.on('did-navigate', (_event, url) => {
    tab.url = url;
    resetIdleTimer();
    sendState();
  });

  contents.on('did-navigate-in-page', (_event, url) => {
    tab.url = url;
    resetIdleTimer();
    sendState();
  });

  contents.on('will-navigate', (event, url) => {
    if (routePinnedNavigation(tab, url, event)) return;
    tab.url = url;
    resetIdleTimer();
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) createTab(url);
    else if (url) shell.openExternal(url);
    return { action: 'deny' };
  });

  contents.on('input-event', resetIdleTimer);
  contents.on('render-process-gone', () => {
    tab.title = `${tab.pinned ? 'ChatGPT' : 'Tab'} (reloading)`;
    sendState();
  });
}

function createTab(url = HOME_URL, options = {}) {
  const tab = {
    id: nextTabId++,
    title: options.pinned ? 'ChatGPT' : 'New tab',
    url,
    pinned: Boolean(options.pinned),
    view: new WebContentsView({
      webPreferences: {
        session: session.fromPartition(APP_PARTITION),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    }),
  };

  tab.view.setBackgroundColor('#000000');
  attachTabEvents(tab);
  if (options.focusComposer) {
    tab.view.webContents.once('did-finish-load', () => focusComposer(tab));
  }
  if (tab.pinned) tabs.unshift(tab);
  else tabs.push(tab);
  if (options.select !== false) activeTabId = tab.id;
  tab.view.webContents.loadURL(url);
  showActiveView();
  resetIdleTimer();
  return tab;
}

function focusComposer(tab) {
  tab.view.webContents.focus();
  tab.view.webContents.executeJavaScript(`(async () => {
    const selectors = [
      '#prompt-textarea',
      '[contenteditable="true"][role="textbox"]',
      'textarea[placeholder]'
    ];
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const composer = selectors
        .flatMap((selector) => [...document.querySelectorAll(selector)])
        .find((element) => element.getClientRects().length > 0 && !element.disabled);
      if (composer) {
        composer.focus({ preventScroll: true });
        if (composer.isContentEditable) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(composer);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  })()`).catch(() => {});
}

function openNewChat() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  createTab(HOME_URL, { focusComposer: true });
}

function closeTab(tabId) {
  const tab = getTab(tabId);
  if (!tab || tab.pinned) return;
  const index = tabs.indexOf(tab);
  tabs.splice(index, 1);
  disposeTabView(tab);
  if (activeTabId === tabId) {
    activeTabId = tabs[Math.max(0, index - 1)]?.id || 1;
  }
  showActiveView();
  resetIdleTimer();
}

function createMainWindow() {
  mainWindow = new BaseWindow({
    width: 1280,
    height: 820,
    minWidth: 680,
    minHeight: 460,
    frame: false,
    resizable: true,
    backgroundColor: '#000000',
    show: false,
    title: APP_NAME,
    icon: path.join(__dirname, 'assets', 'icons', 'chatgpt-local.ico'),
  });

  chromeView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  chromeView.setBackgroundColor('#000000');
  mainWindow.contentView.addChildView(chromeView);
  chromeView.webContents.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('resize', layoutActiveView);
  mainWindow.on('maximize', sendState);
  mainWindow.on('unmaximize', sendState);
  mainWindow.on('focus', resetIdleTimer);
  chromeView.webContents.once('did-finish-load', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    layoutActiveView();
    mainWindow.show();
    sendState();
  });
  mainWindow.on('closed', () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (chromeView && !chromeView.webContents.isDestroyed()) {
      chromeView.webContents.close();
    }
    for (const tab of tabs) {
      if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close();
    }
    chromeView = null;
    tabs = [];
    nextTabId = 1;
    activeTabId = 1;
    mainWindow = null;
  });
}

function registerIpc() {
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.on('tabs:new', (_event, url) => {
    createTab(isHttpUrl(url) ? url : HOME_URL);
  });
  ipcMain.on('tabs:select', (_event, tabId) => {
    if (!getTab(tabId)) return;
    activeTabId = tabId;
    showActiveView();
    resetIdleTimer();
  });
  ipcMain.on('tabs:close', (_event, tabId) => closeTab(tabId));
  ipcMain.on('tabs:home', () => {
    activeTabId = 1;
    showActiveView();
    resetIdleTimer();
  });
  ipcMain.on('tabs:reload', () => getTab(activeTabId)?.view.webContents.reload());
  ipcMain.on('tabs:return-home', () => {
    activeTabId = 1;
    showActiveView();
  });
}

app.whenReady().then(() => {
  app.setName(APP_NAME);
  registerIpc();
  if (!globalShortcut.register('Alt+Space', openNewChat)) {
    console.warn('Could not register the Alt+Space global shortcut.');
  }
  createMainWindow();
  createTab(HOME_URL, { pinned: true });
  resetIdleTimer();
  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) {
      createMainWindow();
      createTab(HOME_URL, { pinned: true });
      resetIdleTimer();
    }
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
