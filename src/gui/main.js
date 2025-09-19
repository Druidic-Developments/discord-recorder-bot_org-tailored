import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  checkDependencies,
  loadSettings,
  saveSettings,
  openRecordingFolder,
  launchBot,
  fetchGuildSummaries
} from './setup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let botProcess;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 840,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  setTimeout(checkDependencies, 0);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('load-settings', () => loadSettings());
ipcMain.handle('save-settings', (_, settings) => saveSettings(settings));
ipcMain.handle('choose-recording-folder', async (_, currentDir) => {
  const settings = loadSettings();
  const base = currentDir && currentDir.trim() ? currentDir : settings.audioDir;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Recording Folder',
    defaultPath: base,
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  const audioDir = result.filePaths[0];
  saveSettings({ ...settings, audioDir });
  return path.resolve(audioDir);
});
ipcMain.handle('open-folder', () => {
  const dir = openRecordingFolder();
  shell.openPath(dir);
  return dir;
});
ipcMain.handle('fetch-guilds', (_, token) => fetchGuildSummaries(token));

ipcMain.on('launch-bot', (e) => {
  if (botProcess) {
    e.sender.send('log', '[Info] Bot already running.\n');
    return;
  }
  botProcess = launchBot((msg) => e.sender.send('log', msg));
   botProcess.on('close', () => {
    botProcess = null;
  });
});

ipcMain.on('stop-bot', () => {
  if (botProcess) {
    botProcess.kill();
  }
});