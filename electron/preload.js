/**
 * Preload script — exposes safe APIs to the renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File save dialog
  saveFile: (defaultPath) => ipcRenderer.invoke('save-file', defaultPath),

  // Notifications
  notify: (title, body) => ipcRenderer.send('show-notification', title, body),

  // Listen for events from main process
  onExportReport: (callback) => ipcRenderer.on('export-report', (_, filePath) => callback(filePath)),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', () => callback()),

  // Platform info
  platform: process.platform,
  isElectron: true,
});
