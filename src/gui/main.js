import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureSetup, appendGuildId, openRecordingFolder, launchBot } from './setup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let botProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(async () => {
  await ensureSetup();
  createWindow();
});

ipcMain.on('add-guild', (e, id) => {
  appendGuildId(id);
  e.sender.send('log', `[Setup] Added guild ID ${id}\n`);
});

ipcMain.on('open-folder', (e) => {
  const dir = openRecordingFolder();
  shell.openPath(dir);
});

ipcMain.on('launch-bot', (e) => {
  if (botProcess) {
    e.sender.send('log', '[Info] Bot already running.\n');
    return;
  }
  botProcess = launchBot((msg) => e.sender.send('log', msg));
  botProcess.on('close', () => { botProcess = null; });
});