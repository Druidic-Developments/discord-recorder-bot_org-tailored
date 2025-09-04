const { ipcRenderer } = require('electron');

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