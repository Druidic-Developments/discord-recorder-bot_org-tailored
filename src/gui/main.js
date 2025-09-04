import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkDependencies, needsSetup, saveCredentials, appendGuildId, openRecordingFolder, launchBot } from './setup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let botProcess;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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

ipcMain.handle('check-setup', () => needsSetup());

ipcMain.on('save-credentials', (e, creds) => {
  saveCredentials(creds.token, creds.guild);
  e.sender.send('log', '[Setup] .env created\n');
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