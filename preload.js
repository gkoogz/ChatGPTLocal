const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatgptLocal', {
  onState(callback) {
    ipcRenderer.on('tabs:state', (_event, state) => callback(state));
  },
  newTab(url) {
    ipcRenderer.send('tabs:new', url);
  },
  selectTab(tabId) {
    ipcRenderer.send('tabs:select', tabId);
  },
  closeTab(tabId) {
    ipcRenderer.send('tabs:close', tabId);
  },
  goHome() {
    ipcRenderer.send('tabs:home');
  },
  reload() {
    ipcRenderer.send('tabs:reload');
  },
  minimize() {
    ipcRenderer.send('window:minimize');
  },
  toggleMaximize() {
    ipcRenderer.send('window:toggle-maximize');
  },
  closeWindow() {
    ipcRenderer.send('window:close');
  },
});
