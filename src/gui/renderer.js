const { ipcRenderer } = require('electron');

// prompt for credentials on first run
(async () => {
  const needs = await ipcRenderer.invoke('check-setup');
  if (needs) {
    const token = prompt('Paste your Bot token:');
    const guild = prompt('Paste an initial Guild ID:');
    if (token && guild) {
      ipcRenderer.send('save-credentials', { token: token.trim(), guild: guild.trim() });
    }
  }
})();

document.getElementById('addGuild').addEventListener('click', () => {
  const id = prompt('Enter new Guild ID:');
  if (id) ipcRenderer.send('add-guild', id.trim());
});

document.getElementById('openFolder').addEventListener('click', () => {
  ipcRenderer.send('open-folder');
});

document.getElementById('launchBot').addEventListener('click', () => {
  ipcRenderer.send('launch-bot');
});

ipcRenderer.on('log', (_, msg) => {
  const pre = document.getElementById('log');
  pre.textContent += msg;
  pre.scrollTop = pre.scrollHeight;
});