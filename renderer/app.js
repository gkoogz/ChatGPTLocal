const tabsElement = document.getElementById('tabs');
const homeButton = document.getElementById('home');
const reloadButton = document.getElementById('reload');
const newTabButton = document.getElementById('new-tab');
const minimizeButton = document.getElementById('minimize');
const maximizeButton = document.getElementById('maximize');
const closeButton = document.getElementById('close');

let currentState = { tabs: [], activeTabId: 1, isMaximized: false };

function render(state) {
  currentState = state;
  const showTabs = state.tabs.length > 1;
  tabsElement.classList.toggle('hidden', !showTabs);
  tabsElement.replaceChildren();

  if (showTabs) {
    for (const tab of state.tabs) {
      const tabButton = document.createElement('button');
      tabButton.className = `tab${tab.active ? ' active' : ''}`;
      tabButton.type = 'button';
      tabButton.title = tab.url;
      tabButton.addEventListener('click', () => window.chatgptLocal.selectTab(tab.id));

      const title = document.createElement('span');
      title.className = 'tab-title';
      title.textContent = tab.title;
      tabButton.append(title);

      if (!tab.pinned) {
        const close = document.createElement('span');
        close.className = 'tab-close';
        close.setAttribute('role', 'button');
        close.setAttribute('aria-label', `Close ${tab.title}`);
        close.textContent = '×';
        close.addEventListener('click', (event) => {
          event.stopPropagation();
          window.chatgptLocal.closeTab(tab.id);
        });
        tabButton.append(close);
      }
      tabsElement.append(tabButton);
    }
  }

  maximizeButton.textContent = state.isMaximized ? '❐' : '□';
  maximizeButton.title = state.isMaximized ? 'Restore' : 'Maximize';
  maximizeButton.setAttribute('aria-label', state.isMaximized ? 'Restore' : 'Maximize');
  homeButton.disabled = state.activeTabId === 1;
  homeButton.style.opacity = homeButton.disabled ? '0.35' : '1';
}

homeButton.addEventListener('click', () => window.chatgptLocal.goHome());
reloadButton.addEventListener('click', () => window.chatgptLocal.reload());
newTabButton.addEventListener('click', () => window.chatgptLocal.newTab());
minimizeButton.addEventListener('click', () => window.chatgptLocal.minimize());
maximizeButton.addEventListener('click', () => window.chatgptLocal.toggleMaximize());
closeButton.addEventListener('click', () => window.chatgptLocal.closeWindow());

window.chatgptLocal.onState(render);

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    window.chatgptLocal.goHome();
  }
  if (event.ctrlKey && event.key.toLowerCase() === 't') {
    event.preventDefault();
    window.chatgptLocal.newTab();
  }
  if (event.ctrlKey && event.key.toLowerCase() === 'w' && currentState.activeTabId !== 1) {
    event.preventDefault();
    window.chatgptLocal.closeTab(currentState.activeTabId);
  }
});
