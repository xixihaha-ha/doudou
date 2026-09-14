const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

// Independent, local-only UI experiment. No AI engine or remote pages.
app.whenReady().then(async () => {
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(800, area.width - 40);
  const height = Math.min(600, area.height - 40);
  const page = new BrowserWindow({
    x: area.x + 20, y: area.y + 20, width, height,
    title: '本地焦点实验',
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  const overlay = new BrowserWindow({
    x: area.x + Math.max(20, width - 290), y: area.y + 90,
    width: 280, height: 230, show: false, frame: false,
    focusable: false, alwaysOnTop: true, resizable: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  for (const win of [page, overlay]) {
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', event => event.preventDefault());
    win.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, callback) => callback({ cancel: true }));
  }
  page.on('closed', () => app.quit());
  await page.loadFile(path.join(__dirname, 'page.html'));
  await overlay.loadFile(path.join(__dirname, 'overlay.html'));
  page.focus();
  overlay.showInactive();
});
app.on('window-all-closed', () => app.quit());
