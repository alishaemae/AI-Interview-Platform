const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1024, minHeight: 700,
    title: 'AI Interview Platform',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });
  const idx = path.join(__dirname, 'web', 'index.html');
  if (fs.existsSync(idx)) mainWindow.loadFile(idx);
  else mainWindow.loadURL('http://localhost:3000');
  mainWindow.on('closed', () => { mainWindow = null; });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Файл', submenu: [{ role: 'quit', label: 'Выход' }] },
    { label: 'Вид', submenu: [
      { role: 'reload' }, { role: 'forceReload' },
      { role: 'toggleDevTools', accelerator: 'F12' },
      { type: 'separator' },
      { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' },
      { type: 'separator' }, { role: 'togglefullscreen' },
    ]},
    { label: 'Справка', submenu: [{
      label: 'О программе',
      click: () => dialog.showMessageBox(mainWindow, {
        type: 'info', title: 'AI Interview Platform',
        message: 'v1.0.0', detail: 'Платформа собеседований\nДипломная работа'
      })
    }]}
  ]));
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
