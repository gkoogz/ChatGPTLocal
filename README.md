# ChatGPT Local

ChatGPT Local is a small Windows desktop container for the browser version of
[ChatGPT](https://chatgpt.com/). It is borderless, resizable and OLED-black,
with compact minimize, maximize/restore and close controls.

## Beta 0.1 behavior

- The first tab is permanently pinned to `chatgpt.com`.
- Links that would take the pinned tab off the ChatGPT site open in a new app tab.
- Tabs are hidden from the chrome when the pinned home tab is the only tab.
- A persistent embedded-browser profile keeps the app's ChatGPT login between launches.
- The pinned ChatGPT tab stays at the far left. After 30 minutes without input,
  the app changes focus to that tab without reloading it or changing any other tab.
- `Ctrl+T`, `Ctrl+W`, and `Ctrl+L` provide familiar tab, close, and home shortcuts.

## Browser profile note

Windows browsers protect their cookie databases with profile locks and account-
bound encryption. An embedded Chromium app cannot safely open Chrome's or Edge's
live profile database, so ChatGPT Local does not claim to share cookies directly
with another desktop browser. Sign in once inside ChatGPT Local; its own profile
is persistent under the normal Electron application-data location. Links opened
by the app stay in app tabs, and the site remains the real ChatGPT web app.

## Icon choices

The release icon uses the mint monitor badge from `assets/icons/option-a.svg`.
Blue and amber alternatives are in the same folder, with previews and build
instructions in `assets/icons/README.md`.

## Development

Requires Node.js 20+ and pnpm.

```powershell
pnpm install
pnpm test
pnpm start
```

Build both the Windows installer and portable executable:

```powershell
pnpm dist
```

The build is unsigned in beta 0.1, so Windows SmartScreen may show the normal
unsigned-publisher warning. The app does not install into or modify any game or
other browser profile.
