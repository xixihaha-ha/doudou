// 最小化测试 Electron 应用
const { app, BrowserWindow } = require('electron');

console.log('app object:', app);
console.log('app type:', typeof app);

if (!app) {
    console.error('ERROR: app is undefined!');
    process.exit(1);
}

console.log('Electron app loaded successfully!');
console.log('App version:', app.getVersion());

app.whenReady().then(() => {
    console.log('App is ready!');
    const win = new BrowserWindow({
        width: 800,
        height: 600
    });
    win.loadURL('data:text/html,<h1>Test Window</h1>');
});

app.on('window-all-closed', () => {
    app.quit();
});
